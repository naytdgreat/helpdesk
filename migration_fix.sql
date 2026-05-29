-- Migration Fix (V2): Drop constraints BEFORE mapping data
-- 1. Rename column if it still has the old name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devices' AND column_name='location_status') THEN
        ALTER TABLE devices RENAME COLUMN location_status TO deployment_status;
    END IF;
END $$;

-- 2. Clean up OLD constraints first (Crucial: prevents violation during update)
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_location_status_check;
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_deployment_status_check;

-- 3. Update existing data to new terminology
UPDATE devices SET deployment_status = 'Available' WHERE deployment_status = 'Central Store';
UPDATE devices SET deployment_status = 'Archived' WHERE deployment_status = 'Archive Store';
UPDATE devices SET deployment_status = 'Available' WHERE deployment_status IS NULL;

-- 4. Apply the new check constraint
ALTER TABLE devices ADD CONSTRAINT devices_deployment_status_check 
    CHECK (deployment_status IN ('Available', 'Deployed', 'Archived', 'Retrieved'));

-- 5. Ensure other required structures are present
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS update_condition TEXT;

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

-- RLS for deployment logs
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
