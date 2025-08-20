# Solução para Duplicação de Notas em Relatórios

## Problema Identificado

Quando um relatório é marcado com status "Em lançamento" ou "Lançado", as notas estavam sendo duplicadas na tabela `relatorio_notas`. Isso acontecia porque:

1. A função `saveRelatorio` estava sendo chamada toda vez que o status era alterado
2. Não havia verificação se as notas já estavam associadas ao relatório
3. A tabela `relatorio_notas` não tinha constraint de unicidade

## Soluções Implementadas

### 1. Correção no Código (database-service.ts)

- ✅ Adicionada verificação de notas existentes antes de inserir
- ✅ Implementada lógica para evitar duplicação de relacionamentos
- ✅ Melhorada a verificação de notas já existentes na tabela `notas_fiscais`

### 2. Nova Função Eficiente (updateRelatorioStatus)

- ✅ Criada função específica para atualizar apenas o status
- ✅ Evita reprocessar todas as notas quando apenas o status muda
- ✅ Mais eficiente e rápida

### 3. Constraint de Unicidade

- ✅ Adicionada constraint `UNIQUE(relatorio_id, nota_fiscal_id)` na tabela `relatorio_notas`
- ✅ Previne duplicações no nível do banco de dados

### 4. Script de Correção

- ✅ Criado script `fix-relatorios-duplicacao.sql` para corrigir dados existentes
- ✅ Remove duplicações existentes mantendo apenas o registro mais antigo
- ✅ Adiciona a constraint de unicidade
- ✅ Corrige a função `sync_relatorio_data()` para evitar duplicações no trigger

### 5. Correção de Triggers

- ✅ Identificado problema no trigger `sync_relatorio_notas`
- ✅ Corrigida função `sync_relatorio_data()` para usar `DISTINCT`
- ✅ Criado script `disable-triggers-temporarily.sql` para desabilitar triggers se necessário

## Como Aplicar as Correções

### Passo 1: Executar o Script de Correção

```sql
-- Execute o script fix-relatorios-duplicacao.sql no seu banco de dados
-- Isso irá:
-- 1. Verificar duplicações existentes
-- 2. Remover duplicações
-- 3. Adicionar constraint de unicidade
-- 4. Corrigir a função sync_relatorio_data()
```

### Passo 1.5: Se ainda houver duplicações (Opcional)

```sql
-- Execute o script disable-triggers-temporarily.sql
-- Isso desabilitará os triggers que podem estar causando duplicações
-- Reabilite os triggers posteriormente quando o problema for resolvido
```

### Passo 2: Verificar as Alterações

As seguintes alterações foram feitas no código:

1. **lib/database-service.ts**: Melhorada a função `saveRelatorio`
2. **hooks/use-database.ts**: Adicionada função `updateRelatorioStatus`
3. **app/custos/page.tsx**: Atualizada para usar a nova função
4. **create-tables-simple.sql**: Adicionada constraint de unicidade

### Passo 3: Testar

1. Crie um relatório com algumas notas
2. Altere o status para "Em lançamento"
3. Altere o status para "Lançado"
4. Verifique que as notas não foram duplicadas

## Benefícios

- ✅ Elimina duplicação de notas
- ✅ Melhora performance ao alterar status
- ✅ Previne problemas futuros com constraint de unicidade
- ✅ Mantém integridade dos dados

## Arquivos Modificados

- `lib/database-service.ts`
- `hooks/use-database.ts`
- `app/custos/page.tsx`
- `create-tables-simple.sql`
- `fix-relatorios-duplicacao.sql` (novo)
- `disable-triggers-temporarily.sql` (novo)

## Observações

- A constraint de unicidade será aplicada automaticamente em novos bancos
- Para bancos existentes, execute o script de correção
- A nova função `updateRelatorioStatus` é mais eficiente para mudanças de status
- O código mantém compatibilidade com versões anteriores
