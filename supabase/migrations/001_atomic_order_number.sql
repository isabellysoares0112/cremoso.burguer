-- Migration: Atomic order number generation
-- Replaces the client-side SELECT MAX+1 pattern with a PostgreSQL sequence.
-- Run this once in Supabase → SQL Editor → New Query.

-- 1. Create the sequence (idempotent).
CREATE SEQUENCE IF NOT EXISTS pedido_numero_seq START 1;

-- 2. Seed the sequence from the current maximum so existing numbers are never reused.
--    The third argument (false) means the NEXT call returns exactly this value.
SELECT setval(
  'pedido_numero_seq',
  COALESCE((SELECT MAX(numero_pedido) FROM pedidos), 0) + 1,
  false
);

-- 3. Safety-net unique constraint on numero_pedido (no-op if it already exists).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pedidos_numero_pedido_unique'
  ) THEN
    ALTER TABLE pedidos
      ADD CONSTRAINT pedidos_numero_pedido_unique UNIQUE (numero_pedido);
  END IF;
END
$$;

-- 4. Atomic function callable via supabase.rpc('next_pedido_number').
--    nextval() is VOLATILE and transaction-independent — PostgreSQL sequences
--    never roll back, so each call is guaranteed to return a unique value.
CREATE OR REPLACE FUNCTION next_pedido_number()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT nextval('pedido_numero_seq');
$$;
