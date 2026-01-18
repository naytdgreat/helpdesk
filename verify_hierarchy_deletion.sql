-- VERIFICATION SCRIPT
-- Use this to test the triggers in your Supabase SQL Editor

-- 1. Setup Test Data
-- Create a test wing
INSERT INTO wings (id, hospital_id, name) 
SELECT '00000000-0000-0000-0000-000000000001', id, 'Test Wing' 
FROM hospitals LIMIT 1;

-- Create a test office
INSERT INTO offices (id, wing_id, name) 
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Test Office');

-- Create a test desk
INSERT INTO desks (id, office_id, name) 
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Test Desk');

-- Create test devices
INSERT INTO devices (id, barcode, brand, model, hospital_id, wing_id, office_id, desk_id, deployment_status)
SELECT 
    '00000000-0000-0000-0000-000000000004', 
    'TEST-DEVICE-01', 
    'Test Brand', 
    'Test Model', 
    hospital_id,
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    'Deployed'
FROM wings WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Verify Initial State
-- SELECT barcode, deployment_status, office_id, desk_id FROM devices WHERE barcode = 'TEST-DEVICE-01';

-- 3. Test Office Deletion
-- DELETE FROM offices WHERE id = '00000000-0000-0000-0000-000000000002';

-- 4. Verify Result (Should be Retrieved, NULL, NULL)
-- SELECT barcode, deployment_status, office_id, desk_id FROM devices WHERE barcode = 'TEST-DEVICE-01';

-- 5. Cleanup (optional)
-- DELETE FROM wings WHERE id = '00000000-0000-0000-0000-000000000001';
