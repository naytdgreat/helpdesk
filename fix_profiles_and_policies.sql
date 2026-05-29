-- 1. Update the Trigger Function to capture name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, hospital_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', ''),
    COALESCE((new.raw_user_meta_data->>'role'), 'IT_OFFICER'),
    CASE 
      WHEN (new.raw_user_meta_data->>'hospital_id') IS NOT NULL AND (new.raw_user_meta_data->>'hospital_id') != ''
      THEN (new.raw_user_meta_data->>'hospital_id')::uuid 
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name,
      role = EXCLUDED.role,
      hospital_id = EXCLUDED.hospital_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing profiles policies for update and delete to avoid duplicates
DROP POLICY IF EXISTS "Admins update hospital profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete hospital profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins view hospital profiles" ON public.profiles;

-- 3. Redefine / add policies on profiles table for Facility Admins (ADMIN role)
-- Allow Admins to SELECT profiles in their own hospital
CREATE POLICY "Admins view hospital profiles" ON public.profiles 
FOR SELECT 
USING (
  (hospital_id = current_user_hospital() AND current_user_role() = 'ADMIN')
  OR current_user_role() = 'SUPER_ADMIN'
);

-- Allow Admins to UPDATE profiles in their own hospital
CREATE POLICY "Admins update hospital profiles" ON public.profiles 
FOR UPDATE 
USING (
  (hospital_id = current_user_hospital() AND current_user_role() = 'ADMIN')
  OR current_user_role() = 'SUPER_ADMIN'
)
WITH CHECK (
  (hospital_id = current_user_hospital() AND current_user_role() = 'ADMIN')
  OR current_user_role() = 'SUPER_ADMIN'
);

-- Allow Admins to DELETE profiles in their own hospital
CREATE POLICY "Admins delete hospital profiles" ON public.profiles 
FOR DELETE 
USING (
  (hospital_id = current_user_hospital() AND current_user_role() = 'ADMIN')
  OR current_user_role() = 'SUPER_ADMIN'
);
