-- Fix hierarchy deletion constraints and auto-update devices

-- 1. Fix deployment_logs: Set office_id to NULL if office is deleted
ALTER TABLE deployment_logs
DROP CONSTRAINT IF EXISTS deployment_logs_office_id_fkey;

ALTER TABLE deployment_logs
ADD CONSTRAINT deployment_logs_office_id_fkey
FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL;

-- 2. Fix deployment_logs: Set desk_id to NULL if desk is deleted
ALTER TABLE deployment_logs
DROP CONSTRAINT IF EXISTS deployment_logs_desk_id_fkey;

ALTER TABLE deployment_logs
ADD CONSTRAINT deployment_logs_desk_id_fkey
FOREIGN KEY (desk_id) REFERENCES desks(id) ON DELETE SET NULL;

-- 3. Ensure Offices delete when Wing is deleted
ALTER TABLE offices
DROP CONSTRAINT IF EXISTS offices_wing_id_fkey;

ALTER TABLE offices
ADD CONSTRAINT offices_wing_id_fkey
FOREIGN KEY (wing_id) REFERENCES wings(id) ON DELETE CASCADE;

-- 4. Ensure Wings delete when Hospital is deleted
ALTER TABLE wings
DROP CONSTRAINT IF EXISTS wings_hospital_id_fkey;

ALTER TABLE wings
ADD CONSTRAINT wings_hospital_id_fkey
FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE;

-- 5. Fix Desks: Delete desks if Office is deleted
ALTER TABLE desks
DROP CONSTRAINT IF EXISTS desks_office_id_fkey;

ALTER TABLE desks
ADD CONSTRAINT desks_office_id_fkey
FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE;

-- 6. Allow 'Retrieved' status in devices (Targeting 'deployment_status' column)
ALTER TABLE devices
DROP CONSTRAINT IF EXISTS devices_deployment_status_check;

ALTER TABLE devices
ADD CONSTRAINT devices_deployment_status_check
CHECK (deployment_status IN ('Available', 'Deployed', 'Faulty', 'Disposal', 'Scrapped', 'Retrieved'));

-- 7. Trigger to Auto-Retrieve devices when Desk is deleted
CREATE OR REPLACE FUNCTION handle_desk_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update devices currently at this desk
    UPDATE devices 
    SET deployment_status = 'Retrieved', 
        desk_id = NULL,
        office_id = NULL,
        updated_at = NOW()
    WHERE desk_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_desk_deleted ON desks;
CREATE TRIGGER on_desk_deleted
BEFORE DELETE ON desks
FOR EACH ROW EXECUTE FUNCTION handle_desk_deletion();

-- 8. Trigger to Auto-Retrieve devices when Office is deleted
CREATE OR REPLACE FUNCTION handle_office_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update devices currently in this office
    UPDATE devices 
    SET deployment_status = 'Retrieved', 
        office_id = NULL,
        desk_id = NULL,
        updated_at = NOW()
    WHERE office_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_office_deleted ON offices;
CREATE TRIGGER on_office_deleted
BEFORE DELETE ON offices
FOR EACH ROW EXECUTE FUNCTION handle_office_deletion();

-- 9. Trigger to Auto-Retrieve devices when Wing is deleted
CREATE OR REPLACE FUNCTION handle_wing_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update devices in any office that belongs to this wing
    UPDATE devices 
    SET deployment_status = 'Retrieved', 
        office_id = NULL,
        desk_id = NULL,
        updated_at = NOW()
    WHERE office_id IN (SELECT id FROM offices WHERE wing_id = OLD.id);
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_wing_deleted ON wings;
CREATE TRIGGER on_wing_deleted
BEFORE DELETE ON wings
FOR EACH ROW EXECUTE FUNCTION handle_wing_deletion();
