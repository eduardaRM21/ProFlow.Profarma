-- =====================================================
-- TABELA DE NOTAS BIPADAS DO SETOR DE EMBALAGEM
-- =====================================================
CREATE TABLE IF NOT EXISTS embalagem_notas_bipadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_nf VARCHAR(50) NOT NULL,
    codigo_completo VARCHAR(255) NOT NULL,
    carro_id VARCHAR(255), -- Alterado de UUID para VARCHAR para compatibilidade
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
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_codigo_completo ON embalagem_notas_bipadas(codigo_completo);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_numero_nf ON embalagem_notas_bipadas(numero_nf);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_carro_id ON embalagem_notas_bipadas(carro_id);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_session_id ON embalagem_notas_bipadas(session_id);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_data ON embalagem_notas_bipadas(data);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_timestamp ON embalagem_notas_bipadas(timestamp_bipagem);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_embalagem_notas_bipadas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_embalagem_notas_bipadas_updated_at
    BEFORE UPDATE ON embalagem_notas_bipadas
    FOR EACH ROW
    EXECUTE FUNCTION update_embalagem_notas_bipadas_updated_at();

-- Comentários na tabela
COMMENT ON TABLE embalagem_notas_bipadas IS 'Tabela para armazenar notas fiscais bipadas no setor de embalagem';
COMMENT ON COLUMN embalagem_notas_bipadas.numero_nf IS 'Número da nota fiscal';
COMMENT ON COLUMN embalagem_notas_bipadas.codigo_completo IS 'Código completo do código de barras';
COMMENT ON COLUMN embalagem_notas_bipadas.carro_id IS 'ID do carro onde a nota foi bipada';
COMMENT ON COLUMN embalagem_notas_bipadas.session_id IS 'ID da sessão de trabalho';
COMMENT ON COLUMN embalagem_notas_bipadas.colaboradores IS 'Lista de colaboradores da sessão';
COMMENT ON COLUMN embalagem_notas_bipadas.data IS 'Data da bipagem';
COMMENT ON COLUMN embalagem_notas_bipadas.turno IS 'Turno de trabalho';
COMMENT ON COLUMN embalagem_notas_bipadas.volumes IS 'Quantidade de volumes';
COMMENT ON COLUMN embalagem_notas_bipadas.destino IS 'Destino da nota fiscal';
COMMENT ON COLUMN embalagem_notas_bipadas.fornecedor IS 'Nome do fornecedor';
COMMENT ON COLUMN embalagem_notas_bipadas.cliente_destino IS 'Cliente de destino';
COMMENT ON COLUMN embalagem_notas_bipadas.tipo_carga IS 'Tipo de carga';
COMMENT ON COLUMN embalagem_notas_bipadas.status IS 'Status da nota (bipada, invalida, etc.)';
COMMENT ON COLUMN embalagem_notas_bipadas.observacoes IS 'Observações adicionais';
COMMENT ON COLUMN embalagem_notas_bipadas.timestamp_bipagem IS 'Timestamp exato da bipagem';
