# Instruções para Executar Scripts SQL

## ⚠️ IMPORTANTE

Para que os códigos de palete e carga sejam gerados automaticamente no formato curto (PAL-00001, CAR-00001), você precisa executar os scripts SQL no banco de dados.

## Scripts Necessários

### 1. Script para Códigos de Palete
**Arquivo:** `create-palete-sequence.sql`

Este script cria:
- Sequência `wms_palete_codigo_seq` para números únicos
- Função `gerar_codigo_palete()` que retorna códigos no formato `PAL-00001`, `PAL-00002`, etc.

**Como executar:**
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo do arquivo `create-palete-sequence.sql`
4. Execute o script

### 2. Script para Códigos de Carga
**Arquivo:** `create-carga-sequence.sql`

Este script cria:
- Sequência `wms_carga_codigo_seq` para números únicos
- Função `gerar_codigo_carga()` que retorna códigos no formato `CAR-00001`, `CAR-00002`, etc.

**Como executar:**
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo do arquivo `create-carga-sequence.sql`
4. Execute o script

## Verificação

Após executar os scripts, você pode verificar se as funções foram criadas:

**Opção 1: Usar o script de verificação**
Execute o arquivo `verificar-funcoes-codigos.sql` no SQL Editor do Supabase. Ele mostrará:
- Status de cada função (existe ou não)
- Status de cada sequência
- Testes das funções
- Amostra dos códigos atuais nas tabelas

**Opção 2: Verificar manualmente**
```sql
-- Verificar se a função de palete existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'gerar_codigo_palete';

-- Verificar se a função de carga existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'gerar_codigo_carga';

-- Testar a função de palete
SELECT gerar_codigo_palete();

-- Testar a função de carga
SELECT gerar_codigo_carga();
```

## Fallback

Se os scripts não forem executados, o sistema usará automaticamente um fallback baseado em timestamp:
- Paletes: `PAL-{timestamp}`
- Cargas: `CARGA-{timestamp}`

Mas é **recomendado** executar os scripts para ter códigos mais curtos e organizados.

## Ordem de Execução

Execute os scripts na seguinte ordem:
1. `create-palete-sequence.sql`
2. `create-carga-sequence.sql`

Ambos podem ser executados independentemente, mas é recomendado executar ambos para ter consistência.

