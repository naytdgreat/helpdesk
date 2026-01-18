-- Migration: Add name field to profiles and update complaints schema
-- This script adds a name field to profiles for better user identification

-- Add name field to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add notes field to complaints (if not already added)
ALTER TABLE complaints 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to 
ON complaints(assigned_to_id);

CREATE INDEX IF NOT EXISTS idx_complaints_status 
ON complaints(status);

CREATE INDEX IF NOT EXISTS idx_profiles_hospital 
ON profiles(hospital_id);

-- Add RLS policies for complaints (if not already added)
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view all complaints" ON complaints;
    DROP POLICY IF EXISTS "Users can create complaints" ON complaints;
    DROP POLICY IF EXISTS "Users can update complaints" ON complaints;
    DROP POLICY IF EXISTS "Users can delete complaints" ON complaints;
END $$;

-- Allow all authenticated users to view complaints
CREATE POLICY "Users can view all complaints" 
ON complaints FOR SELECT 
TO authenticated 
USING (true);

-- Allow all authenticated users to create complaints
CREATE POLICY "Users can create complaints" 
ON complaints FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to update complaints
CREATE POLICY "Users can update complaints" 
ON complaints FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Allow ADMIN and IT_OFFICER to delete complaints
CREATE POLICY "Users can delete complaints" 
ON complaints FOR DELETE 
TO authenticated 
USING (
    current_user_role() IN ('ADMIN', 'IT_OFFICER')
);

-- Add comments
COMMENT ON COLUMN profiles.name IS 'Display name for the user';
COMMENT ON COLUMN complaints.notes IS 'Optional notes added when updating complaint status or assignment';
