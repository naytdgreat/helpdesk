-- Final Schema Alignment for Maintenance and Deployment Logs

-- 1. Ensure maintenance_logs has all required columns
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS it_officer_id UUID REFERENCES profiles(id);
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS performer_type TEXT; -- 'Staff' or 'Vendor'
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS performer_name TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS update_condition TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS performed_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure device status and condition are consistent
-- This repeats the fix from previousTurn just in case
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_status_check;
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_physical_condition_check;

ALTER TABLE devices 
ADD CONSTRAINT devices_status_check 
CHECK (status IN ('Good', 'Fair', 'Faulty', 'In Repair', 'Bad', 'Scrapped'));

ALTER TABLE devices 
ADD CONSTRAINT devices_physical_condition_check 
CHECK (physical_condition IN ('Good', 'Fair', 'Faulty', 'In Repair', 'Bad', 'Scrapped'));


-- 3. Ensure deployment_logs has all columns (as defined in previousTurn but reinforcing)
CREATE TABLE IF NOT EXISTS deployment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    type TEXT NOT NULL, 
    status TEXT NOT NULL,
    hospital_id UUID REFERENCES hospitals(id),
    office_id UUID REFERENCES offices(id),
    desk_id UUID REFERENCES desks(id),
    performer_id UUID REFERENCES profiles(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Enable RLS for deployment_logs
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view deployment logs') THEN
        CREATE POLICY "Users can view deployment logs" ON deployment_logs FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert deployment logs') THEN
        CREATE POLICY "Users can insert deployment logs" ON deployment_logs FOR INSERT WITH CHECK (true);
    END IF;
END $$;
