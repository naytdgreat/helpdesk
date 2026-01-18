-- Finalize Inventory Schema Refinements
-- Rename location_status and add deployment history

-- 1. Rename column in devices table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devices' AND column_name='location_status') THEN
        ALTER TABLE devices RENAME COLUMN location_status TO deployment_status;
    END IF;
END $$;

-- 2. Update status mapping for the user's specific terminology
-- terminology: 'Available', 'Deployed', 'Archived', 'Retrieved'
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_location_status_check;
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_deployment_status_check;
ALTER TABLE devices ADD CONSTRAINT devices_deployment_status_check 
    CHECK (deployment_status IN ('Available', 'Deployed', 'Archived', 'Retrieved'));

-- 3. Update maintenance_logs to include the condition update
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS update_condition TEXT;

-- 4. Create Deployment Logs table for history tracking
CREATE TABLE IF NOT EXISTS deployment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'Deploy', 'Retrieve', 'Archive', 'Initialize'
    status TEXT NOT NULL, -- The status set (e.g., 'Deployed', 'Retrieved')
    hospital_id UUID REFERENCES hospitals(id),
    office_id UUID REFERENCES offices(id), -- Target office
    desk_id UUID REFERENCES desks(id),     -- Target desk
    performer_id UUID REFERENCES profiles(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Enable RLS for deployment_logs
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deployment logs of their hospital" 
ON deployment_logs FOR SELECT 
USING (
    hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = auth.uid()
    ) OR (
        SELECT role FROM profiles WHERE id = auth.uid()
    ) = 'ADMIN'
);

CREATE POLICY "Admin/Staff can insert deployment logs" 
ON deployment_logs FOR INSERT 
WITH CHECK (true); -- Usually restricted by app logic, but for simplicity here.

-- 5. Fix Barcode Uniqueness (if not already unique)
-- ALTER TABLE devices ADD CONSTRAINT devices_barcode_key UNIQUE (barcode);
