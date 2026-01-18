-- Update device status constraints to match new UI options (Good, Faulty, In Repair, Bad)

-- 1. Drop existing constraints
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_status_check;
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_physical_condition_check;

-- 2. Migrate existing data to be compatible
-- Map old status values to new physical condition values
UPDATE devices 
SET status = 'Good' 
WHERE status IN ('Available', 'Deployed');

UPDATE devices 
SET status = 'Bad' 
WHERE status = 'Disposal';

-- Ensure physical_condition matches status for consistency
UPDATE devices 
SET physical_condition = status;

-- 3. Add new constraints
ALTER TABLE devices 
ADD CONSTRAINT devices_status_check 
CHECK (status IN ('Good', 'Faulty', 'In Repair', 'Bad'));

ALTER TABLE devices 
ADD CONSTRAINT devices_physical_condition_check 
CHECK (physical_condition IN ('Good', 'Faulty', 'In Repair', 'Bad'));
