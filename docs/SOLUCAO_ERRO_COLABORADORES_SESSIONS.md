# 🚨 SOLUÇÃO: Erro "Could not find the 'colaboradores' column of 'sessions'"

## Problema Identificado
```
❌ Erro ao salvar sessão: 
{code: 'PGRST204', details: null, hint: null, message: "Could not find the 'colaboradores' column of 'sessions' in the schema cache"}
```

## Causa
A tabela `sessions` no Supabase não tem a coluna `colaboradores` ou não foi criada corretamente.

## Solução Imediata

### 1. Acessar Supabase
- Vá para [supabase.com](https://supabase.com)
- Login no projeto `vzqibndtoitnppvgkekc`
- Clique em "SQL Editor" no menu lateral

### 2. Executar Script de Correção
Copie e cole este SQL no editor:

```sql
-- Verificar se a tabela sessions existe
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') 
        THEN '✅ Tabela sessions existe' 
        ELSE '❌ Tabela sessions NÃO existe' 
    END as status;

-- Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL,
  colaboradores TEXT[] NOT NULL,
  data TEXT NOT NULL,
  turno TEXT NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL,
  usuario_custos TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_sessions_area ON sessions(area);
CREATE INDEX IF NOT EXISTS idx_sessions_data ON sessions(data);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Verificar Estrutura
Execute este SQL para confirmar:

```sql
-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;
```

## Estrutura Esperada da Tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | TEXT | ID único da sessão |
| `area` | TEXT | Área de trabalho (recebimento, embalagem, inventario, custos) |
| `colaboradores` | TEXT[] | Array de colaboradores da sessão |
| `data` | TEXT | Data da sessão |
| `turno` | TEXT | Turno de trabalho |
| `login_time` | TIMESTAMP | Horário de login |
| `usuario_custos` | TEXT | Usuário específico para custos (opcional) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

## Após Executar o Script

✅ O sistema voltará a funcionar normalmente  
✅ As sessões serão salvas corretamente  
✅ O login funcionará sem erros  
✅ A coluna `colaboradores` estará disponível  

## ⚠️ IMPORTANTE
**Execute este SQL IMEDIATAMENTE** para resolver o erro de login!
