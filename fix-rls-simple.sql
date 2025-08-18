-- Solução simples para o erro RLS na tabela relatorios
-- Execute este script no SQL Editor do Supabase

-- Opção 1: Desabilitar RLS completamente (mais simples)
ALTER TABLE relatorios DISABLE ROW LEVEL SECURITY;

-- Opção 2: Se quiser manter RLS, criar política permissiva
-- ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all operations on relatorios" ON relatorios;
-- CREATE POLICY "relatorios_allow_all" ON relatorios FOR ALL USING (true) WITH CHECK (true);

-- Verificar se funcionou
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'relatorios';


