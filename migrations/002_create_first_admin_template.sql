-- ==============================================================================
-- Blue Bolt Page Studio - Safe First Admin Provisioning Template
-- Run manually in Neon SQL Editor. Replace placeholders before executing.
-- ==============================================================================

-- Instructions:
-- 1. Replace 'SEU_EMAIL_AQUI@bluebolt.pt' with the administrator's email.
-- 2. Replace 'DEFINA_AQUI_UMA_SENHA_FORTE' with a unique, high-entropy password.
-- 3. Execute in the Neon SQL Editor. The password will be hashed using bcrypt (cost 12).

DO $$
DECLARE
    new_admin_id UUID;
    target_email TEXT := 'admin@bluebolt.pt'; -- <--- Substitua pelo e-mail desejado
    target_password TEXT := 'DEFINA_AQUI_UMA_SENHA_FORTE'; -- <--- Substitua por uma palavra-passe forte
    target_name TEXT := 'Administrador Principal';
BEGIN
    -- Ensure pgcrypto is available for bcrypt hashing
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- Insert user with bcrypt hash (cost factor 12)
    INSERT INTO public.users (email, password_hash)
    VALUES (
        LOWER(TRIM(target_email)),
        crypt(target_password, gen_salt('bf', 12))
    )
    ON CONFLICT (email) DO UPDATE
    SET password_hash = crypt(target_password, gen_salt('bf', 12))
    RETURNING id INTO new_admin_id;

    -- Upsert profile with admin role
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new_admin_id, target_name, 'admin')
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', full_name = target_name;

    RAISE NOTICE 'Administrador criado/atualizado com sucesso para o e-mail: %', target_email;
END $$;
