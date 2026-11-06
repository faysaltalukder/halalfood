/* Halal Food Website Builder — Neon Data API client.
 * Browser code contains only the public Data API URL. Supabase Auth supplies the
 * signed-in admin JWT; Neon verifies it through the configured external JWKS.
 * No database password, service key, or privileged credential is shipped here.
 */
(() => {
  "use strict";
  const API_BASE = "https://ep-wild-lab-a1jqqu0p.apirest.ap-southeast-1.aws.neon.tech/halal_food_db/rest/v1";
  const ALLOWED_TEMPLATES = new Set(["general-supermarket","fresh-produce","express-grocery","wholesale-bulk"]);

  async function authContext() {
    const admin = await window.HFAdminReady;
    if (!admin) throw new Error("Secure Halal Food admin session is unavailable.");
    const { data, error } = await admin.client.auth.getSession();
    const session = data?.session;
    if (error || !session?.access_token || !session?.user?.id) {
      throw new Error("Please sign in again before connecting to Neon.");
    }
    return { admin, session, user: session.user, token: session.access_token };
  }

  async function request(table, query="", options={}) {
    const { token } = await authContext();
    const method = options.method || "GET";
    const headers = {
      Authorization: "Bearer " + token,
      "Accept-Profile": "builder",
      "Content-Type": "application/json"
    };
    if (method !== "GET") headers["Content-Profile"] = "builder";
    if (options.prefer) headers.Prefer = options.prefer;
    const response = await fetch(API_BASE + "/" + table + query, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "omit",
      cache: "no-store"
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch (_) { payload = text; }
    if (!response.ok) {
      const message = payload?.message || payload?.hint || payload?.details || text || ("HTTP " + response.status);
      throw new Error("Neon " + table + " request failed (" + response.status + "): " + String(message).slice(0, 260));
    }
    return payload;
  }

  async function loadTemplateCatalog() {
    const [catalog, designs] = await Promise.all([
      request("template_catalog", "?select=template_key,category_slug,name,tagline,description,business_types,feature_flags,sort_order,is_builtin&is_builtin=eq.true&order=sort_order.asc"),
      request("template_designs", "?select=template_key,design_version,design_spec,preview_settings,source_commit,is_active&is_active=eq.true&order=design_version.desc")
    ]);
    const latest = new Map();
    (designs || []).forEach(row => {
      if (!latest.has(row.template_key)) latest.set(row.template_key, row);
    });
    const rows = (catalog || []).filter(row => ALLOWED_TEMPLATES.has(row.template_key))
      .map(row => ({ ...row, design: latest.get(row.template_key) || null }));
    if (rows.length !== ALLOWED_TEMPLATES.size || rows.some(row => !row.design)) {
      throw new Error("Neon catalog is missing one or more active grocery template design records.");
    }
    return rows;
  }

  async function ensureWebsite(templateKey, name) {
    if (!ALLOWED_TEMPLATES.has(templateKey)) throw new Error("Unsupported grocery template.");
    const { user } = await authContext();
    const slug = "hf-" + templateKey;
    const query = "?select=id,owner_id,name,slug,category_slug,template_key,status,brand,settings&owner_id=eq." +
      encodeURIComponent(user.id) + "&slug=eq." + encodeURIComponent(slug) + "&limit=1";
    const found = await request("websites", query);
    if (found?.[0]) return found[0];
    const created = await request("websites", "?select=id,owner_id,name,slug,category_slug,template_key,status,brand,settings", {
      method: "POST",
      prefer: "return=representation",
      body: {
        owner_id: user.id,
        name: String(name || templateKey).slice(0, 120),
        slug,
        category_slug: "ecommerce-grocery",
        template_key: templateKey,
        status: "draft",
        brand: {},
        settings: { builder_version: 1, isolated_sandbox: true }
      }
    });
    if (!created?.[0]) throw new Error("Neon did not return the newly created website record.");
    return created[0];
  }

  async function loadDocument(templateKey, name) {
    const website = await ensureWebsite(templateKey, name);
    const rows = await request("website_documents",
      "?select=id,website_id,owner_id,page_key,schema_version,document,updated_at&website_id=eq." +
      encodeURIComponent(website.id) + "&page_key=eq.home&limit=1");
    return { website, record: rows?.[0] || null, document: rows?.[0]?.document || null };
  }

  async function saveDocument(website, document) {
    if (!website?.id || !website?.owner_id) throw new Error("Neon website context is missing.");
    const { user } = await authContext();
    if (website.owner_id !== user.id) throw new Error("Website ownership check failed.");
    if (!document || document.schemaVersion !== 1 || !Array.isArray(document.tree) || document.tree.length > 100) {
      throw new Error("The editor document did not pass the safe schema check.");
    }
    const rows = await request("website_documents", "?on_conflict=website_id,page_key&select=id,updated_at", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        website_id: website.id,
        owner_id: user.id,
        page_key: "home",
        schema_version: 1,
        document
      }
    });
    if (!rows?.[0]?.id) throw new Error("Neon did not confirm that the document was saved.");
    return rows[0];
  }

  window.HFNeonBuilderApi = Object.freeze({
    apiBase: API_BASE,
    loadTemplateCatalog,
    ensureWebsite,
    loadDocument,
    saveDocument
  });
})();
