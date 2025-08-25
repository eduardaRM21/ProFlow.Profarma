# Instruções para Adicionar Coluna palletes_reais na Tabela carros_status

## Problema
O sistema está tentando atualizar uma coluna `palletes_reais` na tabela `carros_status` que não existe no banco de dados, causando o erro:

```
Could not find the 'palletes_reais' column of 'carros_status' in the schema cache
```

## Solução Temporária
✅ **IMPLEMENTADA**: O código foi modificado para não tentar atualizar a coluna `palletes_reais` até que ela seja adicionada ao banco.

## Solução Definitiva
Para resolver completamente o problema, execute o seguinte SQL no seu banco de dados:

### Opção 1: Via Supabase Dashboard
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para o projeto `proflow_profarma`
3. Clique em "SQL Editor"
4. Execute o seguinte comando:

```sql
-- Adicionar coluna palletes_reais na tabela carros_status
ALTER TABLE carros_status 
ADD COLUMN IF NOT EXISTS palletes_reais INTEGER;

-- Adicionar comentário explicativo
COMMENT ON COLUMN carros_status.palletes_reais IS 'Quantidade real de pallets utilizados no carro (diferente da estimativa)';

-- Verificar se foi criada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'carros_status' 
AND column_name = 'palletes_reais';
```

### Opção 2: Via psql (se disponível)
```bash
psql -h db.vzqibndtoitnppvgkekc.supabase.co -U postgres -d postgres -f add-palletes-reais-to-carros-status.sql
```

### Opção 3: Via Script Node.js
Após adicionar a coluna, execute:
```bash
node scripts/add-palletes-reais-column.js
```

## Verificação
Após executar o SQL, a tabela `carros_status` deve ter a seguinte estrutura adicional:

```sql
palletes_reais | integer | yes | null
```

## Reversão da Solução Temporária
Após adicionar a coluna no banco, você pode reverter a modificação no código removendo o comentário e adicionando novamente:

```typescript
palletes_reais: palletsReais,
```

## Arquivos Afetados
- `lib/embalagem-notas-bipadas-service.ts` (linha 71)
- `create-carros-status-table.sql` (estrutura da tabela)

## Status
- ❌ **Problema**: Coluna `palletes_reais` não existe na tabela `carros_status`
- ✅ **Solução Temporária**: Código modificado para não usar a coluna
- ⏳ **Solução Definitiva**: Aguardando execução do SQL no banco
