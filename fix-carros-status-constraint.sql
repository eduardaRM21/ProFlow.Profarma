-- CORREÇÃO DA CONSTRAINT DA TABELA carros_status
-- Adicionar o status 'lancado' à lista de valores permitidos

-- 1. Remover a constraint atual
ALTER TABLE carros_status 
DROP CONSTRAINT IF EXISTS carros_status_status_carro_check;

-- 2. Adicionar a nova constraint com todos os status válidos
ALTER TABLE carros_status 
ADD CONSTRAINT carros_status_status_carro_check 
CHECK (status_carro IN (
  'embalando', 
  'divergencia', 
  'aguardando_lancamento', 
  'finalizado',
  'lancado'
));

-- 3. Verificar se a constraint foi aplicada corretamente
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'carros_status'::regclass 
AND contype = 'c';

-- 4. Comentário explicativo
COMMENT ON CONSTRAINT carros_status_status_carro_check ON carros_status 
IS 'Constraint que permite os seguintes status: embalando, divergencia, aguardando_lancamento, finalizado, lancado';
