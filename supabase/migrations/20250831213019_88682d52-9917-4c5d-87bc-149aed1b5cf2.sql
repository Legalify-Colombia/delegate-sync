-- Add flag column to countries table if it doesn't exist
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS flag TEXT;