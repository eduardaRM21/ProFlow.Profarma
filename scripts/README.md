# Scripts para Salvar Notas Fiscais

Este diretório contém scripts para salvar as notas fiscais que foram dadas entrada no sistema de recebimento.

## 🚨 CORREÇÃO URGENTE NECESSÁRIA

**ERRO ATUAL:** `400 (Bad Request)` ao tentar salvar notas no banco.

**CAUSA:** A tabela `sessions` não tem a estrutura correta ou está faltando a coluna `colaboradores`.

**SOLUÇÃO:** Execute o script de correção antes de usar os scripts de salvamento.

### 🔧 CORREÇÃO IMEDIATA

**Execute diretamente no Supabase SQL Editor:**
```sql
-- Adicionar colunas que podem estar faltando
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS colaboradores TEXT[] DEFAULT ARRAY['Sistema'],
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativa',
ADD COLUMN IF NOT EXISTS login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

## 📁 Arquivos Disponíveis

### 1. `save-notes-to-database.js`
Script Node.js para salvar notas no banco de dados (execução no servidor).

**Como usar:**
```bash
# Instalar dependências
npm install @supabase/supabase-js

# Executar o script
node scripts/save-notes-to-database.js
```

### 2. `save-notes-browser.js`
Script para execução no navegador (console do navegador).

**Como usar:**
1. Abra o console do navegador (F12)
2. Cole o conteúdo do arquivo
3. Execute: `saveNotesFromBrowser()`

### 3. `create-notas-consolidado-table.sql`
Script SQL para criar a tabela de notas consolidadas no Supabase.

**Como usar:**
1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Cole e execute o script

### 4. `lib/save-notes-service.ts`
Serviço TypeScript integrado ao sistema.

**Como usar:**
```typescript
import { SaveNotesService } from '@/lib/save-notes-service'

// Salvar notas do localStorage
const result = await SaveNotesService.saveNotesFromLocalStorage()

// Fazer backup
SaveNotesService.backupNotesToFile()

// Limpar duplicatas
const { removed, total } = SaveNotesService.cleanDuplicateNotes()
```

## 🚀 Funcionalidades

### ✅ Salvamento de Notas
- Salva notas do localStorage para o banco de dados
- Valida dados antes de salvar
- Evita duplicatas
- Cria sessões automaticamente

### ✅ Validação de Dados
- Verifica campos obrigatórios
- Valida formato de data (DD/MM/YYYY)
- Valida número da nota (apenas números)
- Valida volume (deve ser > 0)

### ✅ Backup e Limpeza
- Cria backup das notas em arquivo JSON
- Remove notas duplicadas do localStorage
- Mantém histórico de operações

### ✅ Tratamento de Erros
- Logs detalhados de erros
- Continua processamento mesmo com erros individuais
- Relatório final de sucessos e falhas

## 📊 Estrutura da Tabela

A tabela `notas_consolidado` contém:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| codigo_completo | TEXT | Código de barras completo |
| numero_nf | TEXT | Número da nota fiscal |
| data | DATE | Data da nota |
| volumes | INTEGER | Quantidade de volumes |
| destino | TEXT | Destino da nota |
| fornecedor | TEXT | Nome do fornecedor |
| cliente_destino | TEXT | Cliente de destino |
| tipo_carga | TEXT | Tipo da carga |
| transportadora | TEXT | Transportadora |
| usuario | TEXT | Usuário que processou |
| data_entrada | TIMESTAMP | Data de entrada no sistema |
| status | TEXT | Status da nota |
| session_id | UUID | ID da sessão |

## ⚠️ Importante - Tabela Sessions Existente

A tabela `sessions` já existe no banco de dados. O script foi ajustado para:

1. **Não criar a tabela sessions** (já existe)
2. **Criar apenas a tabela notas_consolidado** sem foreign key constraint inicialmente
3. **Verificar o tipo do campo `id`** na tabela sessions existente
4. **Adicionar a foreign key constraint** após confirmar o tipo correto

### Passos para Configuração:

1. Execute `create-notas-consolidado-table.sql`
2. Verifique o tipo do campo `sessions.id` (UUID ou TEXT)
3. Execute `add-foreign-key-constraint.sql` com o tipo correto

## 🔧 Configuração

### Variáveis de Ambiente
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vzqibndtoitnppvgkekc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

### Dependências
```json
{
  "@supabase/supabase-js": "^2.0.0"
}
```

## 📋 Exemplo de Uso Completo

### 1. Preparar o Banco
```sql
-- Executar no Supabase SQL Editor
\i scripts/create-notas-consolidado-table.sql

-- Após verificar o tipo da tabela sessions, adicionar foreign key:
\i scripts/add-foreign-key-constraint.sql
```

### 2. Salvar Notas (Navegador)
```javascript
// No console do navegador
saveNotesFromBrowser()
  .then(result => {
    console.log('Resultado:', result)
  })
  .catch(error => {
    console.error('Erro:', error)
  })
```

### 3. Integrar no Sistema
```typescript
// Em um componente React
import { SaveNotesService } from '@/lib/save-notes-service'

const handleSaveNotes = async () => {
  const result = await SaveNotesService.saveNotesFromLocalStorage()
  
  if (result.success) {
    alert(`✅ ${result.savedNotes} notas salvas com sucesso!`)
  } else {
    alert(`❌ Erro: ${result.message}`)
  }
}
```

## 🛠️ Troubleshooting

### Erro de Conexão
- Verifique as variáveis de ambiente
- Confirme se o Supabase está acessível
- Verifique as permissões da chave API

### Erro de Validação
- Verifique se todos os campos obrigatórios estão preenchidos
- Confirme o formato da data (DD/MM/YYYY)
- Verifique se o número da nota contém apenas números

### Erro de Duplicata
- Use `cleanDuplicateNotes()` para limpar duplicatas
- Verifique se a nota já existe no banco antes de salvar

## 📈 Monitoramento

### Logs de Sucesso
```
✅ Conexão estabelecida com sucesso
✅ Nota 000123456 salva com ID: abc123
✅ 5 notas salvas com sucesso
```

### Logs de Erro
```
❌ Erro ao salvar nota 000123456: duplicate key value
⚠️ Nota 000123456 já existe, pulando...
```

### Relatório Final
```
📊 RESUMO DO SALVAMENTO:
✅ Notas salvas com sucesso: 5
❌ Erros encontrados: 1
📊 Total processadas: 6
```

## 🔄 Próximos Passos

1. **Automatização**: Configurar salvamento automático
2. **Sincronização**: Implementar sincronização em tempo real
3. **Backup**: Configurar backups automáticos
4. **Monitoramento**: Implementar alertas de erro
5. **Performance**: Otimizar consultas e índices
