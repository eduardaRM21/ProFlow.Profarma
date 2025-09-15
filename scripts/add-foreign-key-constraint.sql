-- Script para adicionar foreign key constraint após verificar o tipo da tabela sessions
-- Execute este script APÓS executar create-notas-consolidado-table.sql

-- 1. Verificar o tipo do campo 'id' na tabela 'sessions'
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' AND column_name = 'id';

-- 2. Se sessions.id for UUID, execute:
-- ALTER TABLE notas_consolidado ALTER COLUMN session_id TYPE UUID;
-- ALTER TABLE notas_consolidado ADD CONSTRAINT notas_consolidado_session_id_fkey 
--   FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 3. Se sessions.id for TEXT, execute:
-- ALTER TABLE notas_consolidado ADD CONSTRAINT notas_consolidado_session_id_fkey 
--   FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 4. Verificar se a constraint foi adicionada corretamente
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'notas_consolidado'
  AND kcu.column_name = 'session_id';
