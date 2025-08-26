# Como Criar a Tabela inventario_notas_bipadas no Supabase

## Resumo da Solução

As notas bipadas no setor de inventário agora devem ser:
1. **Validadas** pela verificação de duplicatas em outros setores
2. **Armazenadas** na tabela específica `inventario_notas_bipadas`
3. **Sincronizadas** com a tabela centralizada `notas_bipadas`

## Passos para Criar a Tabela

### 1. Acessar o Painel do Supabase
- Vá para [supabase.com](https://supabase.com)
- Faça login na sua conta
- Acesse o projeto `vzqibndtoitnppvgkekc`

### 2. Abrir o SQL Editor
- No painel do Supabase, clique em "SQL Editor" no menu lateral
- Clique em "New query"

### 3. Executar o SQL
Copie e cole o seguinte SQL no editor:

```sql
-- =====================================================
-- TABELA DE NOTAS BIPADAS DO SETOR DE INVENTÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS inventario_notas_bipadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_inventario_notas_bipadas_codigo_completo ON inventario_notas_bipadas(codigo_completo);
CREATE INDEX IF NOT EXISTS idx_inventario_notas_bipadas_numero_nf ON inventario_notas_bipadas(numero_nf);
CREATE INDEX IF NOT EXISTS idx_inventario_notas_bipadas_rua ON inventario_notas_bipadas(rua);
CREATE INDEX IF NOT EXISTS idx_inventario_notas_bipadas_session_id ON inventario_notas_bipadas(session_id);
CREATE INDEX IF NOT EXISTS idx_inventario_notas_bipadas_data ON inventario_notas_bipadas(data);
CREATE INDEX IF NOT EXISTS idx_inventario_notas_bipadas_timestamp ON inventario_notas_bipadas(timestamp_bipagem);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_inventario_notas_bipadas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventario_notas_bipadas_updated_at
    BEFORE UPDATE ON inventario_notas_bipadas
    FOR EACH ROW
    EXECUTE FUNCTION update_inventario_notas_bipadas_updated_at();
```

### 4. Verificar a Criação
Execute o seguinte SQL para verificar se a tabela foi criada:

```sql
-- Verificar se a tabela foi criada
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventario_notas_bipadas') 
        THEN '✅ Tabela inventario_notas_bipadas criada com sucesso!' 
        ELSE '❌ Erro ao criar tabela inventario_notas_bipadas' 
    END as status;

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'inventario_notas_bipadas' 
ORDER BY ordinal_position;
```

## Funcionalidades Implementadas

### 1. Salvamento Duplo
- **Tabela específica**: `inventario_notas_bipadas` (para consultas específicas do inventário)
- **Tabela centralizada**: `notas_bipadas` (para consultas gerais de todos os setores)

### 2. Verificação de Duplicatas
- **ALERTA CRÍTICO**: Apenas para notas já bipadas no setor de embalagem
- **Permitido**: Bipagem de notas em outros setores (recebimento, custos, etc.)
- **Objetivo**: Evitar duplicação entre embalagem e inventário

### 3. Rastreabilidade
- Armazena rua onde a nota foi bipada
- Registra colaborador que bipou
- Mantém timestamp exato da bipagem
- Inclui observações detalhadas

## Estrutura da Tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `numero_nf` | VARCHAR(50) | Número da nota fiscal |
| `codigo_completo` | VARCHAR(255) | Código completo do código de barras |
| `rua` | VARCHAR(255) | Rua onde a nota foi bipada |
| `session_id` | VARCHAR(255) | ID da sessão de trabalho |
| `colaboradores` | TEXT | Lista de colaboradores |
| `data` | DATE | Data da bipagem |
| `turno` | VARCHAR(50) | Turno de trabalho |
| `volumes` | INTEGER | Quantidade de volumes |
| `destino` | VARCHAR(255) | Destino da nota fiscal |
| `fornecedor` | VARCHAR(255) | Nome do fornecedor |
| `cliente_destino` | VARCHAR(255) | Cliente de destino |
| `tipo_carga` | VARCHAR(100) | Tipo de carga |
| `status` | VARCHAR(50) | Status da nota |
| `observacoes` | TEXT | Observações adicionais |
| `timestamp_bipagem` | TIMESTAMP | Timestamp exato da bipagem |

## Benefícios

1. **Organização**: Dados específicos do inventário separados
2. **Performance**: Consultas mais rápidas para o setor
3. **Rastreabilidade**: Informações detalhadas sobre cada bipagem
4. **Consistência**: Sincronização com tabela centralizada
5. **Segurança**: Verificação de duplicatas em tempo real

## Próximos Passos

Após criar a tabela:
1. Testar o salvamento de notas no setor de inventário
2. Verificar se os dados estão sendo salvos corretamente
3. Confirmar que a verificação de duplicatas está funcionando
4. Validar a sincronização com a tabela centralizada
