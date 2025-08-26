-- =====================================================
-- CRIAR TABELA inventario_notas_bipadas
-- =====================================================

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

-- Criar índices básicos
CREATE INDEX IF NOT EXISTS idx_inventario_codigo ON inventario_notas_bipadas(codigo_completo);
CREATE INDEX IF NOT EXISTS idx_inventario_nf ON inventario_notas_bipadas(numero_nf);
CREATE INDEX IF NOT EXISTS idx_inventario_rua ON inventario_notas_bipadas(rua);
CREATE INDEX IF NOT EXISTS idx_inventario_session ON inventario_notas_bipadas(session_id);

-- Verificar se foi criada
SELECT 'Tabela inventario_notas_bipadas criada com sucesso!' as status;
