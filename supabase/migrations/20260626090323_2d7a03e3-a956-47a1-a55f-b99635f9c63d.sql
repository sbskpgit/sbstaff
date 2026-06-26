CREATE TABLE public.sanctioned_strength (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid REFERENCES public.districts(id) ON DELETE CASCADE,
  designation_id uuid NOT NULL REFERENCES public.designations(id) ON DELETE CASCADE,
  sanctioned_count integer NOT NULL DEFAULT 0 CHECK (sanctioned_count >= 0),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sanctioned_strength_scope_desig_uniq
  ON public.sanctioned_strength (COALESCE(district_id, '00000000-0000-0000-0000-000000000000'::uuid), designation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctioned_strength TO authenticated;
GRANT ALL ON public.sanctioned_strength TO service_role;

ALTER TABLE public.sanctioned_strength ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sanctioned strength"
  ON public.sanctioned_strength FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin manages sanctioned strength"
  ON public.sanctioned_strength FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER set_sanctioned_strength_updated_at
  BEFORE UPDATE ON public.sanctioned_strength
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();