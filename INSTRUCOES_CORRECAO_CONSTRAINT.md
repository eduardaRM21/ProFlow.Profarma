# INSTRUÇÕES PARA CORRIGIR A CONSTRAINT DA TABELA carros_status

## Problema Identificado
A tabela `carros_status` tem uma constraint que só permite os seguintes status:
- `'embalando'`
- `'divergencia'`
- `'aguardando_lancamento'`
- `'finalizado'`

Mas o código está tentando usar o status `'lancado'`, que não está permitido.

## Solução
Execute o seguinte SQL no seu banco de dados Supabase:

```sql
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
```

## Como Executar
1. Acesse o painel do Supabase
2. Vá para a seção "SQL Editor"
3. Cole o código SQL acima
4. Execute a query

## Alternativa Temporária
Se não puder executar o SQL imediatamente, o código foi modificado para usar o status `'finalizado'` em vez de `'lancado'` temporariamente.

## Verificação
Após executar o SQL, o modal de gerenciar carros deve funcionar corretamente, exibindo os números de notas e tipos.
