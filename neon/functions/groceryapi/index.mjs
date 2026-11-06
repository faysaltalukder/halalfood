import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 8000 });
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'halalfoodbd.official@gmail.com').toLowerCase();
const ISSUER = process.env.SUPABASE_ISSUER || 'https://qfwvrcfkrsydycbfjsxf.supabase.co/auth/v1';
const JWKS = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL || 'https://qfwvrcfkrsydycbfjsxf.supabase.co/auth/v1/.well-known/jwks.json'));
const BUCKET = process.env.ASSETS_BUCKET || 'grocery-builder-assets';
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});
const allowedOrigins = new Set(['https://faysaltalukder.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173']);
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const slugify = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'my-grocery-store';
const cleanName = (value) => String(value || 'image').normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-90) || 'image';

async function authenticate(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw Object.assign(new Error('Admin sign-in required.'), { status: 401 });
  const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: 'authenticated' });
  if (String(payload.email || '').toLowerCase() !== ADMIN_EMAIL) throw Object.assign(new Error('This account is not authorized for the Website Builder.'), { status: 403 });
  if (payload.aal !== 'aal2') throw Object.assign(new Error('Two-step verification is required.'), { status: 403 });
  if (!payload.sub) throw Object.assign(new Error('The sign-in token has no user identity.'), { status: 401 });
  return { id: String(payload.sub), email: String(payload.email || '') };
}

async function readBody(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 1024 * 1024) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  return await request.json();
}

async function requireWebsite(client, websiteId, userId) {
  const result = await client.query('SELECT id, owner_id, name, slug, category_slug, template_key, status, brand, settings, created_at, updated_at FROM builder.websites WHERE id=$1 AND owner_id=$2 LIMIT 1', [websiteId, userId]);
  if (!result.rows[0]) throw Object.assign(new Error('Website not found.'), { status: 404 });
  return result.rows[0];
}

async function handle(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (path === '/health' && request.method === 'GET') {
    try {
      const db = await pool.query('SELECT 1 AS ok, current_database() AS database_name');
      return json({ ok: true, service: 'grocery-template-builder', version: '1.0.0', database: db.rows[0].database_name, storage: Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) });
    } catch (error) { return json({ ok: false, error: 'Database health check failed.' }, 503); }
  }
  const user = await authenticate(request);
  const client = await pool.connect();
  try {
    if (path === '/templates' && request.method === 'GET') {
      const result = await client.query('SELECT template_key,name,tagline,description,business_types,feature_flags,sort_order FROM builder.template_catalog WHERE is_builtin=true ORDER BY sort_order');
      return json({ templates: result.rows });
    }
    if (path === '/websites' && request.method === 'GET') {
      const result = await client.query('SELECT id,name,slug,category_slug,template_key,status,brand,settings,created_at,updated_at FROM builder.websites WHERE owner_id=$1 ORDER BY updated_at DESC', [user.id]);
      return json({ websites: result.rows });
    }
    if (path === '/websites' && request.method === 'POST') {
      const body = await readBody(request);
      const name = String(body.name || '').trim().slice(0, 100);
      const templateKey = String(body.template_key || '');
      if (!name) return json({ error: 'Enter a website name.' }, 400);
      const valid = await client.query('SELECT template_key FROM builder.template_catalog WHERE template_key=$1 AND is_builtin=true', [templateKey]);
      if (!valid.rowCount) return json({ error: 'Choose one of the four built-in templates.' }, 400);
      const base = slugify(body.slug || name);
      const slug = `${base}-${randomUUID().slice(0, 6)}`;
      const result = await client.query(`INSERT INTO builder.websites(owner_id,name,slug,category_slug,template_key,status,brand,settings) VALUES($1,$2,$3,'ecommerce-grocery',$4,'installed',$5::jsonb,$6::jsonb) RETURNING id,name,slug,category_slug,template_key,status,brand,settings,created_at,updated_at`, [user.id,name,slug,templateKey,JSON.stringify(body.brand || {}),JSON.stringify(body.settings || {})]);
      await client.query('INSERT INTO builder.audit_log(owner_id,website_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [user.id,result.rows[0].id,'template_installed','website',result.rows[0].id,JSON.stringify({ template_key: templateKey })]);
      return json({ website: result.rows[0] }, 201);
    }
    const websiteMatch = path.match(/^\/websites\/([0-9a-f-]{36})(?:\/(.*))?$/i);
    if (websiteMatch) {
      const websiteId = websiteMatch[1];
      const subpath = websiteMatch[2] || '';
      const website = await requireWebsite(client, websiteId, user.id);
      if (!subpath && request.method === 'GET') {
        const [products,categories,assets,plugins] = await Promise.all([
          client.query('SELECT * FROM builder.products WHERE website_id=$1 AND owner_id=$2 ORDER BY sort_order,created_at DESC', [websiteId,user.id]),
          client.query('SELECT * FROM builder.categories WHERE website_id=$1 AND owner_id=$2 ORDER BY sort_order', [websiteId,user.id]),
          client.query('SELECT id,object_key,file_name,mime_type,byte_size,alt_text,created_at FROM builder.assets WHERE website_id=$1 AND owner_id=$2 ORDER BY created_at DESC', [websiteId,user.id]),
          client.query('SELECT plugin_key,enabled,settings FROM builder.website_plugins WHERE website_id=$1 AND owner_id=$2', [websiteId,user.id]),
        ]);
        const assetRows = await Promise.all(assets.rows.map(async asset => {
          try { asset.view_url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: asset.object_key }), { expiresIn: 600 }); }
          catch (_) { asset.view_url = null; }
          return asset;
        }));
        return json({ website, products: products.rows, categories: categories.rows, assets: assetRows, plugins: plugins.rows });
      }
      if (!subpath && request.method === 'PATCH') {
        const body = await readBody(request);
        const name = body.name === undefined ? website.name : String(body.name).trim().slice(0,100);
        const brand = body.brand === undefined ? website.brand : body.brand;
        const settings = body.settings === undefined ? website.settings : body.settings;
        const result = await client.query('UPDATE builder.websites SET name=$1,brand=$2::jsonb,settings=$3::jsonb,updated_at=now() WHERE id=$4 AND owner_id=$5 RETURNING *', [name,JSON.stringify(brand || {}),JSON.stringify(settings || {}),websiteId,user.id]);
        return json({ website: result.rows[0] });
      }
      if (subpath === 'products' && request.method === 'POST') {
        const body = await readBody(request);
        const name = String(body.name || '').trim().slice(0,160);
        if (!name) return json({ error: 'Product name is required.' }, 400);
        const price = Math.max(0, Number(body.price || 0));
        const stock = Math.max(0, Number(body.stock || 0));
        let categoryId = null;
        const categoryName = String(body.category || '').trim().slice(0,100);
        if (categoryName) {
          const categorySlug = slugify(categoryName);
          const categoryResult = await client.query('INSERT INTO builder.categories(website_id,owner_id,name,slug) VALUES($1,$2,$3,$4) ON CONFLICT (website_id,slug) DO UPDATE SET name=EXCLUDED.name RETURNING id', [websiteId,user.id,categoryName,categorySlug]);
          categoryId = categoryResult.rows[0]?.id || null;
        }
        const result = await client.query(`INSERT INTO builder.products(website_id,owner_id,category_id,name,description,sku,price,compare_at_price,unit,stock,image_key,image_url,attributes,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,true,$14) RETURNING *`, [websiteId,user.id,categoryId,name,String(body.description||''),body.sku||null,price,body.compare_at_price===undefined?null:Math.max(0,Number(body.compare_at_price)),String(body.unit||'piece'),stock,body.image_key||null,body.image_url||null,JSON.stringify(body.attributes||{}),Number(body.sort_order||0)]);
        await client.query('UPDATE builder.websites SET updated_at=now() WHERE id=$1', [websiteId]);
        return json({ product: result.rows[0] }, 201);
      }
      if (subpath === 'products/reorder' && request.method === 'PATCH') {
        const body = await readBody(request);
        const ids = Array.isArray(body.product_ids) ? body.product_ids.filter(id => /^[0-9a-f-]{36}$/i.test(String(id))).slice(0,500) : [];
        await client.query('BEGIN');
        try {
          for (let index = 0; index < ids.length; index++) {
            await client.query('UPDATE builder.products SET sort_order=$1,updated_at=now() WHERE id=$2 AND website_id=$3 AND owner_id=$4', [index,ids[index],websiteId,user.id]);
          }
          await client.query('UPDATE builder.websites SET updated_at=now() WHERE id=$1', [websiteId]);
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        return json({ ok: true, reordered: ids.length });
      }
      const productPatch = subpath.match(/^products\/([0-9a-f-]{36})$/i);
      if (productPatch && request.method === 'PATCH') {
        const body = await readBody(request);
        const result = await client.query(`UPDATE builder.products SET name=COALESCE($1,name),description=COALESCE($2,description),price=COALESCE($3,price),unit=COALESCE($4,unit),stock=COALESCE($5,stock),image_key=COALESCE($6,image_key),sort_order=COALESCE($7,sort_order),updated_at=now() WHERE id=$8 AND website_id=$9 AND owner_id=$10 RETURNING *`, [body.name===undefined?null:String(body.name).trim().slice(0,160),body.description===undefined?null:String(body.description),body.price===undefined?null:Math.max(0,Number(body.price)),body.unit===undefined?null:String(body.unit),body.stock===undefined?null:Math.max(0,Number(body.stock)),body.image_key===undefined?null:body.image_key,body.sort_order===undefined?null:Number(body.sort_order),productPatch[1],websiteId,user.id]);
        return result.rowCount ? json({ product: result.rows[0] }) : json({ error: 'Product not found.' }, 404);
      }
      const productDelete = subpath.match(/^products\/([0-9a-f-]{36})$/i);
      if (productDelete && request.method === 'DELETE') {
        const result = await client.query('DELETE FROM builder.products WHERE id=$1 AND website_id=$2 AND owner_id=$3 RETURNING id', [productDelete[1],websiteId,user.id]);
        return result.rowCount ? json({ ok: true }) : json({ error: 'Product not found.' }, 404);
      }
      if (subpath === 'categories' && request.method === 'POST') {
        const body = await readBody(request);
        const name = String(body.name || '').trim().slice(0,100);
        if (!name) return json({ error: 'Category name is required.' }, 400);
        const slug = slugify(body.slug || name);
        const result = await client.query('INSERT INTO builder.categories(website_id,owner_id,name,slug,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING *', [websiteId,user.id,name,slug,Number(body.sort_order||0)]);
        return json({ category: result.rows[0] }, 201);
      }
      if (subpath === 'assets/upload' && request.method === 'POST') {
        const form = await request.formData();
        const file = form.get('file');
        if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'Choose an image file to upload.' }, 400);
        const mimeType = String(file.type || '');
        const byteSize = Number(file.size || 0);
        if (!/^image\/(jpeg|png|webp|gif)$/.test(mimeType)) return json({ error: 'Only JPEG, PNG, WebP and GIF images are allowed.' }, 400);
        if (!Number.isFinite(byteSize) || byteSize < 1 || byteSize > 5 * 1024 * 1024) return json({ error: 'Image must be 5 MB or smaller.' }, 400);
        if (!process.env.AWS_ENDPOINT_URL_S3 || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return json({ error: 'Neon Object Storage credentials are not available on this function branch.' }, 503);
        const fileName = cleanName(file.name);
        const key = `websites/${websiteId}/${user.id}/${randomUUID()}-${fileName}`;
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: mimeType }));
        const result = await client.query('INSERT INTO builder.assets(website_id,owner_id,object_key,file_name,mime_type,byte_size,alt_text) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,object_key,file_name,mime_type,byte_size,alt_text,created_at', [websiteId,user.id,key,fileName,mimeType,byteSize,String(form.get('alt_text') || '').slice(0,180)]);
        const asset = result.rows[0];
        asset.view_url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 600 });
        return json({ asset }, 201);
      }
      if (subpath === 'assets/presign' && request.method === 'POST') {
        const body = await readBody(request);
        const fileName = cleanName(body.file_name);
        const mimeType = String(body.mime_type || '');
        const byteSize = Number(body.byte_size || 0);
        if (!/^image\/(jpeg|png|webp|gif)$/.test(mimeType)) return json({ error: 'Only JPEG, PNG, WebP and GIF images are allowed.' }, 400);
        if (!Number.isFinite(byteSize) || byteSize < 1 || byteSize > 5 * 1024 * 1024) return json({ error: 'Image must be 5 MB or smaller.' }, 400);
        if (!process.env.AWS_ENDPOINT_URL_S3 || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return json({ error: 'Neon Object Storage credentials are not available on this function branch.' }, 503);
        const key = `websites/${websiteId}/${user.id}/${randomUUID()}-${fileName}`;
        const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mimeType });
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
        return json({ upload_url: uploadUrl, object_key: key, expires_in: 300 });
      }
      if (subpath === 'assets/complete' && request.method === 'POST') {
        const body = await readBody(request);
        const key = String(body.object_key || '');
        if (!key.startsWith(`websites/${websiteId}/${user.id}/`)) return json({ error: 'Invalid asset key.' }, 400);
        const fileName = cleanName(body.file_name);
        const mimeType = String(body.mime_type || 'application/octet-stream');
        const byteSize = Number(body.byte_size || 0);
        const result = await client.query('INSERT INTO builder.assets(website_id,owner_id,object_key,file_name,mime_type,byte_size,alt_text) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,object_key,file_name,mime_type,byte_size,alt_text,created_at', [websiteId,user.id,key,fileName,mimeType,byteSize,String(body.alt_text||'').slice(0,180)]);
        return json({ asset: result.rows[0] }, 201);
      }
      const assetView = subpath.match(/^assets\/([0-9a-f-]{36})\/view-url$/i);
      if (assetView && request.method === 'GET') {
        const result = await client.query('SELECT object_key FROM builder.assets WHERE id=$1 AND website_id=$2 AND owner_id=$3', [assetView[1],websiteId,user.id]);
        if (!result.rows[0]) return json({ error: 'Asset not found.' }, 404);
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: result.rows[0].object_key });
        const viewUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
        return json({ view_url: viewUrl, expires_in: 600 });
      }
    }
    return json({ error: 'Route not found.' }, 404);
  } finally {
    client.release();
  }
}

export default {
  async fetch(request) {
    const origin = request.headers.get('origin') || '';
    const cors = {};
    if (allowedOrigins.has(origin)) {
      cors['access-control-allow-origin'] = origin;
      cors['access-control-allow-credentials'] = 'true';
      cors['vary'] = 'Origin';
    }
    cors['access-control-allow-methods'] = 'GET,POST,PATCH,DELETE,OPTIONS';
    cors['access-control-allow-headers'] = 'authorization,content-type';
    try {
      const response = await handle(request);
      const headers = new Headers(response.headers);
      for (const [key,value] of Object.entries(cors)) headers.set(key,value);
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error('grocery-api error', error);
      const response = json({ error: status >= 500 ? 'The Website Builder service could not complete the request.' : error.message }, status);
      const headers = new Headers(response.headers);
      for (const [key,value] of Object.entries(cors)) headers.set(key,value);
      return new Response(response.body,{status:response.status,headers});
    }
  }
};
