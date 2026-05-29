-- RBAC Refinement: Introduce SUPER_ADMIN and scope ADMIN to Hospital

-- 1. Update Profiles Role Constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'IT_OFFICER'));

-- 2. Update Helper Functions (Optional, but useful for clarity if logic changes)
-- current_user_role() and current_user_hospital() remain the same.

-- 3. Update Policies

-- Drop existing "Admins full access" policies (which were global)
DROP POLICY IF EXISTS "Admins full access" ON hospitals;
DROP POLICY IF EXISTS "Admins full access" ON wings;
DROP POLICY IF EXISTS "Admins full access" ON offices;
DROP POLICY IF EXISTS "Admins full access" ON device_categories;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Drop IT Officer policies to redefine them with new ADMIN logic
DROP POLICY IF EXISTS "IT Officers see their hospital" ON hospitals;
DROP POLICY IF EXISTS "IT Officers see their wings" ON wings;
DROP POLICY IF EXISTS "IT Officers see their offices" ON offices;
DROP POLICY IF EXISTS "IT Officers manage desks" ON desks;

-- ============================
-- SUPER_ADMIN (Global Access)
-- ============================
CREATE POLICY "Super Admins full access" ON hospitals FOR ALL USING (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Super Admins full access" ON wings FOR ALL USING (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Super Admins full access" ON offices FOR ALL USING (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Super Admins full access" ON device_categories FOR ALL USING (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Super Admins manage all profiles" ON profiles FOR ALL USING (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Super Admins manage devices" ON devices FOR ALL USING (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Super Admins manage maintenance" ON maintenance_logs FOR ALL USING (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Super Admins manage history" ON deployment_history FOR ALL USING (current_user_role() = 'SUPER_ADMIN');

-- ============================
-- ADMIN (Hospital Scope) & IT_OFFICER
-- ============================

-- HOSPITALS: Admin/IT can view their own hospital
CREATE POLICY "Hospital Staff view own hospital" ON hospitals FOR SELECT 
USING (id = current_user_hospital());

-- WINGS: Admin (Manage), IT (View)
CREATE POLICY "Admins manage own wings" ON wings FOR ALL 
USING (hospital_id = current_user_hospital() AND current_user_role() = 'ADMIN');

CREATE POLICY "IT view own wings" ON wings FOR SELECT 
USING (hospital_id = current_user_hospital());

-- OFFICES: Admin (Manage), IT (View)
CREATE POLICY "Admins manage own offices" ON offices FOR ALL 
USING (EXISTS (SELECT 1 FROM wings WHERE wings.id = offices.wing_id AND wings.hospital_id = current_user_hospital()) AND current_user_role() = 'ADMIN');

CREATE POLICY "IT view own offices" ON offices FOR SELECT 
USING (EXISTS (SELECT 1 FROM wings WHERE wings.id = offices.wing_id AND wings.hospital_id = current_user_hospital()));

-- DESKS: Admin (Manage), IT (Manage - existing logic kept IT as managers of desks)
-- Let's give Admin full control too.
CREATE POLICY "Staff manage own desks" ON desks FOR ALL 
USING (EXISTS (
    SELECT 1 FROM offices 
    JOIN wings ON offices.wing_id = wings.id 
    WHERE offices.id = desks.office_id 
    AND wings.hospital_id = current_user_hospital()
));

-- DEVICES:
-- Super Admin handled above.
-- Admin: Manage own hospital devices.
-- IT Officer: Manage own hospital devices? (Usually yes for inventory).
-- Let's keep specific policies if they existed, or create new ones.
-- Existing policies on devices were NOT explicitly shown in the snippet above (lines 200+).
-- I'll ensure we have policies for devices.
DROP POLICY IF EXISTS "Admins full access" ON devices; -- Just in case
DROP POLICY IF EXISTS "IT Officers manage devices" ON devices;

CREATE POLICY "Staff manage own hospital devices" ON devices FOR ALL
USING (hospital_id = current_user_hospital());

-- PROFILES
-- Super Admin manages all (above).
-- Admin: Can view profiles in their hospital?
CREATE POLICY "Admins view hospital profiles" ON profiles FOR SELECT
USING (hospital_id = current_user_hospital() AND current_user_role() = 'ADMIN');


-- 4. Update Initial Seed (Promote existing admin to SUPER_ADMIN?)
-- The existing admin@helpdesk.com should probably be SUPER_ADMIN now.
UPDATE profiles SET role = 'SUPER_ADMIN' WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@helpdesk.com');

