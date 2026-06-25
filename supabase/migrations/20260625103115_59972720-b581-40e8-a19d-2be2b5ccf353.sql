
-- 1. Profiles: restrict SELECT to self or super_admin
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self or admin read" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_super_admin(auth.uid()));

-- 2. Audit logs: only privileged users (super_admin or any district_admin) may insert; still tied to actor_id
DROP POLICY IF EXISTS "audit: any insert own" ON public.audit_logs;
CREATE POLICY "audit: privileged insert own" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'district_admin')
  )
);

-- 3. can_view_district: scope read_only role to its assigned district
CREATE OR REPLACE FUNCTION public.can_view_district(_user_id uuid, _district_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role IN ('district_admin','read_only')
        AND district_id = _district_id
    );
$$;

-- 4. Storage staff-photos: path layout is "<district_id>/<file>"; gate by can_view/can_edit
DROP POLICY IF EXISTS "staff-photos read auth" ON storage.objects;
DROP POLICY IF EXISTS "staff-photos insert auth" ON storage.objects;
DROP POLICY IF EXISTS "staff-photos update auth" ON storage.objects;
DROP POLICY IF EXISTS "staff-photos delete auth" ON storage.objects;

CREATE POLICY "staff-photos read by district" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'staff-photos'
  AND public.can_view_district(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
);

CREATE POLICY "staff-photos insert by district" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'staff-photos'
  AND public.can_edit_district(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
);

CREATE POLICY "staff-photos update by district" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'staff-photos'
  AND public.can_edit_district(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
)
WITH CHECK (
  bucket_id = 'staff-photos'
  AND public.can_edit_district(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
);

CREATE POLICY "staff-photos delete by district" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'staff-photos'
  AND public.can_edit_district(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
);

-- 5. set_updated_at: fix mutable search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 6. Lock down SECURITY DEFINER function EXECUTE privileges
-- Revoke from PUBLIC + anon for every definer function; keep authenticated only where RLS policies reference them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_district(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_district(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_district(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_transfer() FROM PUBLIC, anon, authenticated;
