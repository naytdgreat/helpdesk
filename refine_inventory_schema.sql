-- Refine Inventory Schema
-- Separating Physical Condition from Location Status

-- 1. Update Devices Table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS physical_condition TEXT DEFAULT 'Good' CHECK (physical_condition IN ('Good', 'Faulty', 'In Repair', 'Scrapped')),
ADD COLUMN IF NOT EXISTS location_status TEXT DEFAULT 'Central Store' CHECK (location_status IN ('Central Store', 'Deployed', 'Archive Store'));

-- Migrate existing status data to the new columns
UPDATE devices 
SET 
  physical_condition = CASE 
    WHEN status = 'Faulty' THEN 'Faulty' 
    WHEN status = 'Disposal' THEN 'Scrapped' 
    ELSE 'Good' 
  END,
  location_status = CASE 
    WHEN status = 'Deployed' THEN 'Deployed' 
    ELSE 'Central Store' 
  END
WHERE physical_condition = 'Good' AND location_status = 'Central Store'; -- Only run if defaults are still there

-- 2. Update Maintenance Logs Table
ALTER TABLE maintenance_logs
ADD COLUMN IF NOT EXISTS performer_type TEXT DEFAULT 'Staff' CHECK (performer_type IN ('Staff', 'Vendor')),
ADD COLUMN IF NOT EXISTS performer_name TEXT;

-- Migration: Set default performer name for existing logs if it_officer_id exists
UPDATE maintenance_logs ml
SET performer_name = p.email
FROM auth.users p
WHERE ml.it_officer_id = p.id AND ml.performer_name IS NULL;

-- 3. Update RLS (if needed, though existing policies usually cover new columns)
-- No major RLS changes needed as current policies are based on role/hospital ownership.
