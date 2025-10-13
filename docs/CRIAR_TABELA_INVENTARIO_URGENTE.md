# 🚨 URGENTE: Criar Tabela inventario_notas_bipadas

## Erro Atual
```
Could not find the table 'public.inventario_notas_bipadas' in the schema cache
```

## Solução Imediata

### 1. Acessar Supabase
- Vá para [supabase.com](https://supabase.com)
- Login no projeto `vzqibndtoitnppvgkekc`
- Clique em "SQL Editor" no menu lateral

### 2. Executar SQL
Copie e cole este SQL no editor:

```sql
-- Criar a tabela
CREATE TABLE IF NOT EXISTS inventario_notas_bipadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_nf VARCHAR(50) NOT NULL,
    codigo_completo VARCHAR(255) NOT NULL,
    rua VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    colaboradores TEXT,
    data DATE NOT NULL,
    turno VARCHAR(50) NOT NULL,
    volumes INTEGER DEFAULT 1,
    destino VARCHAR(255),
    fornecedor VARCHAR(255),
    cliente_destino VARCHAR(255),
    tipo_carga VARCHAR(100),
    status VARCHAR(50) DEFAULT 'bipada',
    observacoes TEXT,
    timestamp_bipagem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_inventario_codigo ON inventario_notas_bipadas(codigo_completo);
CREATE INDEX IF NOT EXISTS idx_inventario_nf ON inventario_notas_bipadas(numero_nf);
CREATE INDEX IF NOT EXISTS idx_inventario_rua ON inventario_notas_bipadas(rua);
CREATE INDEX IF NOT EXISTS idx_inventario_session ON inventario_notas_bipadas(session_id);
```

### 3. Verificar
Execute este SQL para confirmar:

```sql
SELECT 'Tabela criada com sucesso!' as status;
```

## Após Criar a Tabela
- O sistema voltará a funcionar normalmente
- As notas do inventário serão salvas corretamente
- O ALERTA CRÍTICO funcionará apenas para embalagem

## ⚠️ IMPORTANTE
**Execute este SQL IMEDIATAMENTE** para resolver o erro 404!
