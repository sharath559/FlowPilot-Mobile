-- Run this once in Supabase Dashboard > SQL Editor.
-- Replace the email with the owner's exact Google/email login address.
SELECT public.bootstrap_first_owner(
  'owner@gmail.com',
  '00000000-0000-4000-8000-000000000001'
);
