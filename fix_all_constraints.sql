-- Standardize all device status constraints

-- 1. Status (Physical Condition)
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_status_check;
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_physical_condition_check;

-- Ensure existing data is valid
UPDATE devices SET status = 'Good' WHERE status NOT IN ('Good', 'Fair', 'Faulty', 'In Repair', 'Bad', 'Scrapped');
UPDATE devices SET physical_condition = 'Good' WHERE physical_condition NOT IN ('Good', 'Fair', 'Faulty', 'In Repair', 'Bad', 'Scrapped');

ALTER TABLE devices 
ADD CONSTRAINT devices_status_check 
CHECK (status IN ('Good', 'Fair', 'Faulty', 'In Repair', 'Bad', 'Scrapped'));

ALTER TABLE devices 
ADD CONSTRAINT devices_physical_condition_check 
CHECK (physical_condition IN ('Good', 'Fair', 'Faulty', 'In Repair', 'Bad', 'Scrapped'));



-- 2. Deployment Status
-- Drop the existing constraint
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_deployment_status_check;

-- Update data: Force all values into the new allowed set
UPDATE devices SET deployment_status = 'Available' WHERE deployment_status = 'Retrieved';
UPDATE devices SET deployment_status = 'Deployed' WHERE deployment_status = 'In Use';
UPDATE devices SET deployment_status = 'Disposal' WHERE deployment_status = 'Scrapped';

-- Fallback: Any remaining non-compliant values go to 'Available'
UPDATE devices 
SET deployment_status = 'Available' 
WHERE deployment_status NOT IN ('Available', 'Deployed', 'Archived', 'Faulty', 'Disposal');

-- Add comprehensive constraint
ALTER TABLE devices 
ADD CONSTRAINT devices_deployment_status_check 
CHECK (deployment_status IN ('Available', 'Deployed', 'Archived', 'Faulty', 'Disposal'));

