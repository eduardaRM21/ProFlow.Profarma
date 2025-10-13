# 🔧 CORREÇÃO: Notas sem divergência não sendo salvas

## 📋 PROBLEMA ATUALIZADO

**Apenas as notas com divergência estão sendo salvas** na tabela `notas_fiscais`, mas as notas **sem divergência** não estão sendo salvas.

## 🔍 CAUSA IDENTIFICADA

O problema está na **constraint única** no campo `numero_nf` que está impedindo a inserção de notas sem divergência. O sistema está tentando fazer `upsert` com `onConflict: 'numero_nf'`, mas isso pode estar falhando para notas sem divergência.

## 🚀 SOLUÇÃO COMPLETA

### Passo 1: Executar diagnóstico

Execute o script `fix-notas-sem-divergencia.sql` no Supabase para:

1. **Verificar constraints únicas** problemáticas
2. **Diagnosticar estrutura** da tabela
3. **Testar inserção** de notas sem divergência

### Passo 2: Remover constraint única (se existir)

```sql
-- Verificar constraints únicas
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'notas_fiscais' 
    AND kcu.column_name = 'numero_nf'
    AND tc.constraint_type = 'UNIQUE';

-- Remover constraint única (substitua pelo nome real)
ALTER TABLE notas_fiscais DROP CONSTRAINT IF EXISTS nome_da_constraint;
```

### Passo 3: Criar índice simples (sem unicidade)

```sql
-- Remover índice único se existir
DROP INDEX IF EXISTS idx_notas_fiscais_numero_unique;

-- Criar índice simples para performance
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_numero ON notas_fiscais(numero_nf);
```

### Passo 4: Testar inserção

```sql
-- Testar inserção de nota sem divergência
INSERT INTO notas_fiscais (
    codigo_completo,
    numero_nf,
    data,
    volumes,
    destino,
    fornecedor,
    cliente_destino,
    tipo_carga,
    status
) VALUES (
    'TESTE2|789012|002|RJ|FORNECEDOR2|CLIENTE2|CARGA2',
    '789012',
    CURRENT_DATE,
    15,
    'RJ',
    'FORNECEDOR2',
    'CLIENTE2',
    'CARGA2',
    'ok'
);
```

## 📝 PASSOS PARA EXECUÇÃO

1. **Acesse o Supabase Dashboard**
   - Vá para o seu projeto no Supabase
   - Clique em "SQL Editor"

2. **Execute o script de correção**
   - Copie e cole o conteúdo do arquivo `fix-notas-sem-divergencia.sql`
   - Clique em "Run" para executar

3. **Verifique as constraints únicas**
   - O script irá listar todas as constraints únicas
   - Identifique se há constraint no campo `numero_nf`

4. **Remova constraints problemáticas**
   - Execute manualmente os comandos de remoção
   - Substitua `nome_da_constraint` pelo nome real

5. **Teste a inserção**
   - Execute o teste de inserção de nota sem divergência
   - Confirme que funciona

## 🔍 VERIFICAÇÃO

Após executar o script, verifique:

```sql
-- Verificar se não há mais constraints únicas
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'notas_fiscais' 
    AND kcu.column_name = 'numero_nf'
    AND tc.constraint_type = 'UNIQUE';

-- Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'notas_fiscais';
```

## ⚠️ IMPORTANTE

- **Constraint única**: Pode estar causando conflitos no upsert
- **Campo numero_nf**: Deve permitir duplicatas para diferentes relatórios
- **Backup**: Sempre faça backup antes de executar scripts de correção
- **Teste**: Sempre teste a inserção após as correções

## 📊 ESTRUTURA CORRETA

### Tabela `notas_fiscais` (sem constraint única)
- `id`: UUID PRIMARY KEY
- `numero_nf`: VARCHAR(100) NOT NULL (sem UNIQUE)
- `codigo_completo`: VARCHAR(255) NOT NULL
- `data`: DATE NOT NULL
- `volumes`: INTEGER NOT NULL
- `status`: VARCHAR(50) DEFAULT 'ok'

### Índices recomendados
- `idx_notas_fiscais_numero`: Para performance (sem unicidade)
- `idx_notas_fiscais_data`: Para consultas por data
- `idx_notas_fiscais_status`: Para consultas por status

## 🔄 FLUXO CORRIGIDO

1. **Relatório finalizado** → Salvo na tabela `relatorios`
2. **TODAS as notas** → Salvas na tabela `notas_fiscais` (com ou sem divergência)
3. **Relacionamentos** → Criados na tabela `relatorio_notas`
4. **Divergências** → Salvas na tabela `divergencias`

## 📞 SUPORTE

Se o problema persistir após executar o script:

1. Verifique os logs do console do navegador
2. Confirme se não há erros de constraint única
3. Verifique se o campo `numero_nf` está sendo preenchido corretamente
4. Execute o script de diagnóstico incluído

---

**Status**: 🔧 Solução identificada e documentada  
**Prioridade**: 🔴 ALTA - Bloqueia funcionalidade principal  
**Complexidade**: 🟡 MÉDIA - Requer remoção de constraints únicas
