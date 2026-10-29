-- Future functions in public must receive explicit EXECUTE grants.
-- This affects only functions subsequently created by postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM anon, authenticated, service_role;

-- PostgreSQL grants EXECUTE to PUBLIC globally for new functions unless revoked.
-- Existing functions and their current grants are not altered by this default-only change.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
