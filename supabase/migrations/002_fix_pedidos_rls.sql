-- Migration: Fix pedidos RLS — remove public SELECT, keep anon INSERT
-- Run this in the Supabase dashboard > SQL Editor

-- Step 1: Drop all SELECT policies for anon/public on pedidos
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'pedidos'
      AND cmd        = 'SELECT'
      AND (roles @> ARRAY['anon'::text] OR roles @> ARRAY['public'::text])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pedidos', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END;
$$;

-- Step 2: Ensure anon can INSERT (order creation via client-side)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'pedidos'
      AND cmd        = 'INSERT'
      AND (roles @> ARRAY['anon'::text] OR roles @> ARRAY['public'::text])
  ) THEN
    CREATE POLICY "anon_can_insert_orders" ON public.pedidos
      FOR INSERT TO anon
      WITH CHECK (true);
    RAISE NOTICE 'Created INSERT policy for anon';
  ELSE
    RAISE NOTICE 'INSERT policy for anon already exists';
  END IF;
END;
$$;

-- Verify result
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'pedidos'
ORDER BY cmd;
