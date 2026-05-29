-- Database Schema for NMG Helpdesk (Supabase/PostgreSQL)
-- This script is idempotent and can be run multiple times.

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Locations Hierarchy
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wing_id UUID REFERENCES wings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS desks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    assigned_to_user TEXT, -- End-user name
    last_audit_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Profiles (User Roles & Assignment)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('ADMIN', 'IT_OFFICER')) NOT NULL DEFAULT 'IT_OFFICER',
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Device Categories
CREATE TABLE IF NOT EXISTS device_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Devices
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL, 
    barcode TEXT UNIQUE NOT NULL,
    serial_number TEXT,
    brand TEXT,
    model TEXT,
    specifications JSONB,
    category_id UUID REFERENCES device_categories(id),
    desk_id UUID REFERENCES desks(id) ON DELETE SET NULL,
    office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
    ip_address TEXT,
    mac_address TEXT,
    deployment_status TEXT DEFAULT 'Available' CHECK (deployment_status IN ('Available', 'Deployed', 'Faulty', 'Disposal')),
    maintenance_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Maintenance Records
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    it_officer_id UUID REFERENCES auth.users(id),
    description TEXT NOT NULL,
    parts_replaced TEXT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Deployment History
CREATE TABLE IF NOT EXISTS deployment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    desk_id UUID REFERENCES desks(id) ON DELETE SET NULL,
    it_officer_id UUID REFERENCES auth.users(id),
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    removed_at TIMESTAMP WITH TIME ZONE
);

-- 8. Complaints
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT CHECK (category IN ('Software', 'Hardware', 'Network', 'Other')),
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Escalated')),
    assigned_to_id UUID REFERENCES auth.users(id),
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    desk_id UUID REFERENCES desks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Requests
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Fulfilled', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Functions & Triggers

-- Trigger for Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, hospital_id)
  VALUES (
    new.id, 
    COALESCE((new.raw_user_meta_data->>'role'), 'IT_OFFICER'),
    CASE 
      WHEN (new.raw_user_meta_data->>'hospital_id') IS NOT NULL AND (new.raw_user_meta_data->>'hospital_id') != ''
      THEN (new.raw_user_meta_data->>'hospital_id')::uuid 
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for Maintenance Count
CREATE OR REPLACE FUNCTION update_maintenance_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE devices SET maintenance_count = maintenance_count + 1 WHERE id = NEW.device_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE devices SET maintenance_count = maintenance_count - 1 WHERE id = OLD.device_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_maintenance_count ON maintenance_logs;
CREATE TRIGGER tr_update_maintenance_count
AFTER INSERT OR DELETE ON maintenance_logs
FOR EACH ROW EXECUTE FUNCTION update_maintenance_count();

-- Trigger for Deployment History
CREATE OR REPLACE FUNCTION track_device_deployments()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.desk_id IS DISTINCT FROM NEW.desk_id) THEN
    UPDATE deployment_history 
    SET removed_at = NOW() 
    WHERE device_id = NEW.id AND removed_at IS NULL;
    
    IF (NEW.desk_id IS NOT NULL) THEN
      INSERT INTO deployment_history (device_id, desk_id, it_officer_id)
      VALUES (NEW.id, NEW.desk_id, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_track_device_deployments ON devices;
CREATE TRIGGER tr_track_device_deployments
AFTER UPDATE OF desk_id ON devices
FOR EACH ROW EXECUTE FUNCTION track_device_deployments();

-- 11. Row Level Security (RLS)
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE desks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;

-- Helper Function to get user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper Function to get user hospital
CREATE OR REPLACE FUNCTION current_user_hospital()
RETURNS UUID AS $$
  SELECT hospital_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies
DO $$ 
BEGIN
    -- Drop existing policies to recreate them
    DROP POLICY IF EXISTS "Admins full access" ON hospitals;
    DROP POLICY IF EXISTS "Admins full access" ON wings;
    DROP POLICY IF EXISTS "Admins full access" ON offices;
    DROP POLICY IF EXISTS "Admins full access" ON device_categories;
    DROP POLICY IF EXISTS "IT Officers see their hospital" ON hospitals;
    DROP POLICY IF EXISTS "IT Officers see their wings" ON wings;
    DROP POLICY IF EXISTS "IT Officers see their offices" ON offices;
    DROP POLICY IF EXISTS "IT Officers manage desks" ON desks;
    DROP POLICY IF EXISTS "Users can see all categories" ON device_categories;
    DROP POLICY IF EXISTS "Profiles viewable by owner/admin" ON profiles;
    DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can view all requests" ON requests;
    DROP POLICY IF EXISTS "Users can create requests" ON requests;
END $$;

-- Admins
CREATE POLICY "Admins full access" ON hospitals FOR ALL USING (current_user_role() = 'ADMIN');
CREATE POLICY "Admins full access" ON wings FOR ALL USING (current_user_role() = 'ADMIN');
CREATE POLICY "Admins full access" ON offices FOR ALL USING (current_user_role() = 'ADMIN');
CREATE POLICY "Admins full access" ON device_categories FOR ALL USING (current_user_role() = 'ADMIN');
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (current_user_role() = 'ADMIN');

-- IT Officers
CREATE POLICY "IT Officers see their hospital" ON hospitals FOR SELECT USING (id = current_user_hospital() OR current_user_role() = 'ADMIN');
CREATE POLICY "IT Officers see their wings" ON wings FOR SELECT USING (hospital_id = current_user_hospital() OR current_user_role() = 'ADMIN');
CREATE POLICY "IT Officers see their offices" ON offices FOR SELECT USING (EXISTS (SELECT 1 FROM wings WHERE wings.id = offices.wing_id AND wings.hospital_id = current_user_hospital()) OR current_user_role() = 'ADMIN');
CREATE POLICY "IT Officers manage desks" ON desks FOR ALL USING (EXISTS (SELECT 1 FROM offices JOIN wings ON offices.wing_id = wings.id WHERE offices.id = desks.office_id AND wings.hospital_id = current_user_hospital()) OR current_user_role() = 'ADMIN');

-- General
CREATE POLICY "Users can see all categories" ON device_categories FOR SELECT USING (true);
CREATE POLICY "Profiles viewable by owner/admin" ON profiles FOR SELECT USING (auth.uid() = id OR current_user_role() = 'ADMIN');
CREATE POLICY "Users can view all requests" ON requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create requests" ON requests FOR INSERT TO authenticated WITH CHECK (true);

-- ==========================================
-- DEFAULT ACCOUNT SETUP
-- ==========================================
-- Default Credentials: admin@helpdesk.com / Wordcity

DO $$
BEGIN
    -- 1. Create User if they don't exist with verified metadata
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@helpdesk.com') THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, 
            email_confirmed_at, last_sign_in_at, raw_app_meta_data, 
            raw_user_meta_data, is_super_admin, created_at, updated_at
        ) 
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            uuid_generate_v4(),
            'authenticated',
            'authenticated',
            'admin@helpdesk.com',
            crypt('Wordcity', gen_salt('bf', 10)),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            false,
            now(),
            now()
        );
    END IF;

    -- 2. Link/Promote to ADMIN role in profiles
    INSERT INTO public.profiles (id, role)
    SELECT id, 'ADMIN' FROM auth.users WHERE email = 'admin@helpdesk.com'
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

    -- 3. Seed Default Device Categories
    INSERT INTO public.device_categories (name)
    VALUES 
        ('CPU / Desktop'),
        ('Laptop'),
        ('Monitor'),
        ('UPS / Power'),
        ('Printer / Scanner'),
        ('Networking (Router/Switch)'),
        ('Mouse'),
        ('Keyboard'),
        ('Other Peripheral')
    ON CONFLICT (name) DO NOTHING;

END $$;
