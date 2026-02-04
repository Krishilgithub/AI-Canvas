-- Fix for missing profiles causing FK errors
-- Run this if you have existing users who don't have a profile yet.

INSERT INTO public.profiles (id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
