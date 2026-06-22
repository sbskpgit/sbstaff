
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin', 'district_admin', 'read_only');
CREATE TYPE public.duty_status AS ENUM ('active','attached','osd','headquarters','leave','suspension','retired','vacant');
CREATE TYPE public.posting_type AS ENUM ('regional_office','district_office','circle_office','police_station','headquarters','attachment_in','attachment_out','osd');
CREATE TYPE public.district_kind AS ENUM ('region','district');
CREATE TYPE public.transfer_kind AS ENUM ('within_district','between_districts','to_region','to_hq','to_district_police','attachment','return_from_attachment','other');

-- TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUTO PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DISTRICTS (includes Regional Office as a row with kind='region')
CREATE TABLE public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  kind public.district_kind NOT NULL DEFAULT 'district',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.districts TO authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

-- USER ROLES (must come before policies that use has_role)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  district_id UUID REFERENCES public.districts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, district_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.user_district(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT district_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'district_admin'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_view_district(_user_id uuid, _district_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'super_admin')
    OR public.has_role(_user_id, 'read_only')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'district_admin' AND district_id = _district_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_district(_user_id uuid, _district_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'district_admin' AND district_id = _district_id
    );
$$;

-- user_roles policies
CREATE POLICY "roles: user can read own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "roles: super admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- districts policies
CREATE POLICY "districts: read all authenticated" ON public.districts FOR SELECT TO authenticated USING (true);
CREATE POLICY "districts: super admin manage" ON public.districts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- CIRCLES
CREATE TABLE public.circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (district_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;
GRANT ALL ON public.circles TO service_role;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "circles: read authenticated" ON public.circles FOR SELECT TO authenticated USING (true);
CREATE POLICY "circles: edit by district" ON public.circles FOR ALL TO authenticated
  USING (public.can_edit_district(auth.uid(), district_id))
  WITH CHECK (public.can_edit_district(auth.uid(), district_id));

-- POLICE STATIONS
CREATE TABLE public.police_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (circle_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.police_stations TO authenticated;
GRANT ALL ON public.police_stations TO service_role;
ALTER TABLE public.police_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps: read authenticated" ON public.police_stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "ps: edit by district" ON public.police_stations FOR ALL TO authenticated
  USING (public.can_edit_district(auth.uid(), district_id))
  WITH CHECK (public.can_edit_district(auth.uid(), district_id));

-- DESIGNATIONS (managed by super admin; visible to all)
CREATE TABLE public.designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  bps INT,
  display_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.designations TO authenticated;
GRANT ALL ON public.designations TO service_role;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "desig: read auth" ON public.designations FOR SELECT TO authenticated USING (true);
CREATE POLICY "desig: super admin manage" ON public.designations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- STAFF
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT UNIQUE,
  service_number TEXT,
  full_name TEXT NOT NULL,
  father_name TEXT,
  cnic TEXT,
  mobile TEXT,
  designation_id UUID REFERENCES public.designations(id),
  cadre TEXT,
  bps INT,
  date_of_birth DATE,
  date_of_joining DATE,
  district_id UUID NOT NULL REFERENCES public.districts(id),
  circle_id UUID REFERENCES public.circles(id),
  police_station_id UUID REFERENCES public.police_stations(id),
  posting_type public.posting_type NOT NULL DEFAULT 'district_office',
  current_posting TEXT,
  previous_posting TEXT,
  duty_status public.duty_status NOT NULL DEFAULT 'active',
  attachment_details TEXT,
  remarks TEXT,
  photo_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX staff_district_idx ON public.staff(district_id);
CREATE INDEX staff_designation_idx ON public.staff(designation_id);
CREATE INDEX staff_duty_idx ON public.staff(duty_status);
CREATE INDEX staff_cnic_idx ON public.staff(cnic);
CREATE INDEX staff_full_name_idx ON public.staff(full_name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff: view by district scope" ON public.staff FOR SELECT TO authenticated
  USING (public.can_view_district(auth.uid(), district_id));
CREATE POLICY "staff: insert by district admin/super" ON public.staff FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_district(auth.uid(), district_id));
CREATE POLICY "staff: update by district admin/super" ON public.staff FOR UPDATE TO authenticated
  USING (public.can_edit_district(auth.uid(), district_id))
  WITH CHECK (public.can_edit_district(auth.uid(), district_id));
CREATE POLICY "staff: delete super admin" ON public.staff FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER staff_updated BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRANSFERS
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  transfer_kind public.transfer_kind NOT NULL,
  order_number TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_date DATE,
  from_district_id UUID REFERENCES public.districts(id),
  from_circle_id UUID REFERENCES public.circles(id),
  from_police_station_id UUID REFERENCES public.police_stations(id),
  from_posting_type public.posting_type,
  to_district_id UUID NOT NULL REFERENCES public.districts(id),
  to_circle_id UUID REFERENCES public.circles(id),
  to_police_station_id UUID REFERENCES public.police_stations(id),
  to_posting_type public.posting_type NOT NULL,
  attachment_end_date DATE,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX transfers_staff_idx ON public.transfers(staff_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers: view if can view either side" ON public.transfers FOR SELECT TO authenticated
  USING (public.can_view_district(auth.uid(), to_district_id) OR (from_district_id IS NOT NULL AND public.can_view_district(auth.uid(), from_district_id)));
CREATE POLICY "transfers: insert by source district admin or super" ON public.transfers FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (from_district_id IS NOT NULL AND public.can_edit_district(auth.uid(), from_district_id))
    OR public.can_edit_district(auth.uid(), to_district_id)
  );
CREATE POLICY "transfers: update super" ON public.transfers FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "transfers: delete super" ON public.transfers FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Apply transfer to staff record automatically
CREATE OR REPLACE FUNCTION public.apply_transfer() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.staff%ROWTYPE;
  new_current TEXT;
BEGIN
  SELECT * INTO s FROM public.staff WHERE id = NEW.staff_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  new_current := COALESCE(NEW.to_posting_type::text, '');

  UPDATE public.staff
  SET
    previous_posting = s.current_posting,
    district_id = NEW.to_district_id,
    circle_id = NEW.to_circle_id,
    police_station_id = NEW.to_police_station_id,
    posting_type = NEW.to_posting_type,
    current_posting = new_current,
    duty_status = CASE
      WHEN NEW.transfer_kind = 'attachment' THEN 'attached'::public.duty_status
      WHEN NEW.transfer_kind = 'return_from_attachment' THEN 'active'::public.duty_status
      WHEN NEW.to_posting_type = 'osd' THEN 'osd'::public.duty_status
      WHEN NEW.to_posting_type = 'headquarters' THEN 'headquarters'::public.duty_status
      ELSE s.duty_status
    END,
    attachment_details = CASE
      WHEN NEW.transfer_kind = 'attachment' THEN NEW.remarks
      WHEN NEW.transfer_kind = 'return_from_attachment' THEN NULL
      ELSE s.attachment_details
    END,
    updated_at = now()
  WHERE id = NEW.staff_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER transfers_apply AFTER INSERT ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.apply_transfer();

-- AUDIT LOG
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit: super admin read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "audit: any insert own" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif: read own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif: update own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif: super admin insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()) OR user_id = auth.uid());
