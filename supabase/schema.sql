-- ============================================================
-- ClinicOS — Full Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS (mirrors auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'doctor', 'staff')),
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  age             INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender          TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  medical_history TEXT,
  allergies       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);

-- ============================================================
-- 3. VISITS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id        UUID NOT NULL REFERENCES public.users(id),
  diagnosis        TEXT NOT NULL,
  treatment_notes  TEXT,
  medicines        TEXT,
  images           TEXT[] DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON public.visits(patient_id);

-- ============================================================
-- 4. INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id      UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  payment_mode  TEXT CHECK (payment_mode IN ('upi', 'cash', 'card', 'other')),
  payment_note  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- ============================================================
-- 5. INVOICE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0)
);

-- ============================================================
-- 6. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  category    TEXT NOT NULL CHECK (category IN ('salary', 'rent', 'supplies', 'equipment', 'other')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  expiry_date  DATE,
  threshold    INTEGER NOT NULL DEFAULT 5 CHECK (threshold >= 0)
);

-- ============================================================
-- 8. EQUIPMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.equipment (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  last_service_date DATE,
  next_service_date DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  check_in    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);

-- ============================================================
-- 10. FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id  UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES — authenticated full access
-- ============================================================

-- users
CREATE POLICY "authenticated full access" ON public.users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- patients
CREATE POLICY "authenticated full access" ON public.patients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- visits
CREATE POLICY "authenticated full access" ON public.visits
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- invoices
CREATE POLICY "authenticated full access" ON public.invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- invoice_items
CREATE POLICY "authenticated full access" ON public.invoice_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- expenses
CREATE POLICY "authenticated full access" ON public.expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- inventory
CREATE POLICY "authenticated full access" ON public.inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- equipment
CREATE POLICY "authenticated full access" ON public.equipment
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- attendance
CREATE POLICY "authenticated full access" ON public.attendance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- feedback — authenticated full access
CREATE POLICY "authenticated full access" ON public.feedback
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- feedback — anon INSERT (public feedback form)
CREATE POLICY "anon can submit feedback" ON public.feedback
  FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- TRIGGER: auto-insert into public.users on auth signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
