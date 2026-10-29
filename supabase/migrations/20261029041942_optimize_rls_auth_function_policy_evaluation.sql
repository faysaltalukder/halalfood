-- Preserve the predicates and role scopes of existing RLS policies while
-- allowing PostgreSQL to evaluate JWT helpers as initplans rather than per row.
DO $policy_optimization$
DECLARE
  p record;
  new_using text;
  new_check text;
  role_list text;
  create_sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') ~* 'auth\.(jwt|uid|role)\(\)'
        OR coalesce(with_check, '') ~* 'auth\.(jwt|uid|role)\(\)'
      )
  LOOP
    new_using := p.qual;
    new_check := p.with_check;

    IF new_using IS NOT NULL THEN
      new_using := regexp_replace(
        new_using,
        'auth\.(jwt|uid|role)\(\)',
        '(select auth.\1())',
        'gi'
      );
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(
        new_check,
        'auth\.(jwt|uid|role)\(\)',
        '(select auth.\1())',
        'gi'
      );
    END IF;

    IF new_using IS NOT DISTINCT FROM p.qual
       AND new_check IS NOT DISTINCT FROM p.with_check THEN
      CONTINUE;
    END IF;

    role_list := array_to_string(p.roles, ', ');

    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      p.policyname, p.schemaname, p.tablename
    );

    create_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname, p.schemaname, p.tablename,
      p.permissive, p.cmd, role_list
    );

    IF new_using IS NOT NULL THEN
      create_sql := create_sql || format(' USING (%s)', new_using);
    END IF;

    IF new_check IS NOT NULL THEN
      create_sql := create_sql || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE create_sql;
  END LOOP;
END
$policy_optimization$;
