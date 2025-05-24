-- Periksa apakah user sudah ada
DO $$
DECLARE
  user_exists boolean;
  admin_id uuid;
BEGIN
  -- Cek di tabel auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'mfaqih3562@gmail.com'
  ) INTO user_exists;

  -- Jika user belum ada, buat user baru
  IF NOT user_exists THEN
    -- Buat user di auth.users
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
      'mfaqih3562@gmail.com',
      crypt('Admin123!', gen_salt('bf')),
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

    RAISE NOTICE 'Admin user created successfully';
  ELSE
    -- Update role menjadi admin jika user sudah ada
    UPDATE public.users 
    SET role = 'admin'
    WHERE email = 'mfaqih3562@gmail.com';

    RAISE NOTICE 'Admin user already exists, role updated to admin';
  END IF;
END $$; 