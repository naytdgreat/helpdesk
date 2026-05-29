-- Default Admin Seed
-- Email: admin@helpdesk.com
-- Password: Wordcity

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@helpdesk.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token)
        VALUES (
            uuid_generate_v4(), 
            'admin@helpdesk.com', 
            crypt('Wordcity', gen_salt('bf')), 
            now(), 
            'authenticated', 
            'authenticated', 
            ''
        );
    END IF;
END $$;

-- 2. Ensure the profile is set to ADMIN
UPDATE public.profiles 
SET role = 'ADMIN' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@helpdesk.com');
