CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (district_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View branches in viewable districts" ON public.branches
  FOR SELECT TO authenticated
  USING (public.can_view_district(auth.uid(), district_id));

CREATE POLICY "Edit branches in editable districts" ON public.branches
  FOR ALL TO authenticated
  USING (public.can_edit_district(auth.uid(), district_id))
  WITH CHECK (public.can_edit_district(auth.uid(), district_id));

CREATE TRIGGER set_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();