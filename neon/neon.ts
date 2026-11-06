import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Private object storage for each builder site's uploaded media.
  buckets: {
    "grocery-builder-assets": {},
  },
  // Node.js 24 backend API. Storage credentials are injected by Neon
  // because the bucket is declared above; never commit S3 secrets.
  functions: {
    groceryapi: {
      name: "Grocery Template Builder API",
      source: "functions/groceryapi/index.mjs",
      env: {
        ADMIN_EMAIL: "halalfoodbd.official@gmail.com",
        SUPABASE_ISSUER: "https://qfwvrcfkrsydycbfjsxf.supabase.co/auth/v1",
        SUPABASE_JWKS_URL: "https://qfwvrcfkrsydycbfjsxf.supabase.co/auth/v1/.well-known/jwks.json",
        ASSETS_BUCKET: "grocery-builder-assets",
      },
    },
  },
});
