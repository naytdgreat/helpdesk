-- Run this in your Supabase SQL Editor to fix the missing column
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;

-- Also ensure RLS policies can see this column
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Reload schema cache notification (usually automatic but good to check)
-- If the error persists, try logging out and back in to the Supabase dashboard.
