-- Buat akun admin baru menggunakan Supabase Auth
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'mfaqih3562@gmail.com', -- Email admin
  crypt('Admin123!', gen_salt('bf')), -- Password admin
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Ambil ID user yang baru dibuat
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'mfaqih3562@gmail.com';

  -- Insert ke tabel users dengan role admin
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    created_at
  ) VALUES (
    admin_id,
    'mfaqih3562@gmail.com',
    'Muhammad Faqih',
    'admin',
    now()
  );
END $$; 