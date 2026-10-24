# Facebook Page Publishing

This is the owner-only Facebook Page publishing integration for the Halal Food admin dashboard. It is intentionally separate from the existing Messenger, WhatsApp, order, analytics and courier functions.

## Runtime

- Edge Function: `facebook-publishing`
- Graph API: `v26.0`
- Admin page: `/halalfood/admin/facebook-publishing.html`
- Private upload bucket: `hf-facebook-media` (50 MiB per file)
- Private tables: `facebook_oauth_states`, `facebook_page_accounts`, `facebook_publish_history`

The function is deployed with JWT gateway validation disabled so the Meta OAuth callback can be received. Every dashboard POST validates the admin JWT with Supabase Auth, checks the allowed admin email and requires MFA assurance level `aal2`. Do not remove that in-function verification.

## Supabase Edge Function secrets

Add these names in Supabase Dashboard → Edge Functions → Secrets. Never commit their values to GitHub or paste them into the frontend:

- `FACEBOOK_APP_ID` — App ID from Meta for Developers.
- `FACEBOOK_APP_SECRET` — App Secret from Meta for Developers.
- `FACEBOOK_TOKEN_ENCRYPTION_KEY` — a separately generated random secret of at least 32 characters. It encrypts Page access tokens with AES-GCM before those tokens are stored in Postgres. Keep a secure backup of this key: if it is lost, previously stored tokens cannot be decrypted.
- Optional: `FACEBOOK_APP_REDIRECT_URI` — set only if deliberately using a different redirect URI. It must exactly match the URI allowlisted in Meta. By default the function uses:
  `https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/facebook-publishing`

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY\) to Edge Functions. The publishable key in the code is public and is used only to validate the authenticated session with Supabase Auth; it is not a service-role credential.

## Meta App configuration

1. Open the existing Meta Developer App and configure the Facebook Login/OAuth flow supported by that app's use case.
2. Add the exact redirect URI shown above to the Valid OAuth Redirect URIs / redirect allowlist.
3. Request only the Page publishing scopes used by this integration: `pages_show_list`, `pages_read_engagement`, and `pages_manage_posts`.
4. In Development mode, authorize using a Facebook account that has an eligible App Role. That account must also have a Page task that allows creating content (normally `CREATE_CONTENT`, or `MANAGE`).
5. The dashboard displays which requested scopes were granted and which Page can publish. Meta still controls the actual permission grant, app mode, API availability and review requirements.

The current first release is intended for the Halal Food owner/admin account and Pages that account can administer. It is not a public multi-customer SaaS connection. Broader use by people who do not have a role on the App may require Advanced Access, App Review, Business Verification and any other Meta requirements applicable to the App.

## Supported actions

- Connect via Meta OAuth; exchange the authorization code server-side; list manageable Pages; select and verify one Page.
- Publish text and link posts, photos, and MP4/MOV videos to the selected Facebook Page.
- Use Facebook's native scheduled publishing for requests accepted by Meta; schedule time is checked to be 10 minutes to 75 days ahead.
- Store a private 50 MiB maximum media upload and create a short-lived signed URL only when the server needs Meta to fetch that file.
- Record success/failure, scheduled time, Facebook object ID, permalink when available and safe error details in the publishing history.
- Access is restricted to the authorized Halal Food admin with MFA. The function never returns Page access tokens to the browser.

## Activation checklist

1. Add the three required secrets above.
2. Add the exact redirect URI to Meta.
3. Ensure the Meta App can request the three scopes in its current mode.
4. Sign into the Halal Food admin dashboard with MFA and open Facebook Publishing.
5. Connect Facebook, select the Page, and run Verify Connection.
6. Test a short text post first. Confirm the Facebook object ID and visibility directly on the Page. Then test one image, a short video, and scheduling separately.
7. Check the publishing history and Supabase function logs for any error before retrying a failed post, to avoid accidental duplicates.

Secrets are deliberately not entered in this page or stored in this repository. The first post must be tested manually; deployment alone is not proof that Meta has granted the requested permissions or that a post is publicly visible.
