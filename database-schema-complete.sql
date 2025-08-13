-- =====================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS PROFLOW
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA DE USUÁRIOS/COLABORADORES
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    area VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE SESSÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    area VARCHAR(100) NOT NULL,
    data DATE NOT NULL,
    turno VARCHAR(50) NOT NULL,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'ativa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE NOTAS FISCAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_completo VARCHAR(255) NOT NULL,
    numero_nf VARCHAR(100) NOT NULL,
    data DATE NOT NULL,
    volumes INTEGER NOT NULL,
    destino VARCHAR(255),
    fornecedor VARCHAR(255),
    cliente_destino VARCHAR(255),
    tipo_carga VARCHAR(100),
    status VARCHAR(50) DEFAULT 'recebida',
    session_id UUID REFERENCES sessions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE DIVERGÊNCIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS divergencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nota_fiscal_id UUID REFERENCES notas_fiscais(id),
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    volumes_informados INTEGER,
    volumes_reais INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE CARROS DE EMBALAGEM
-- =====================================================
CREATE TABLE IF NOT EXISTS carros_embalagem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    destino_final VARCHAR(255),
    status VARCHAR(50) DEFAULT 'aguardando_colagem',
    session_id UUID REFERENCES sessions(id),
    data_inicio DATE NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE ITENS DO CARRO
-- =====================================================
CREATE TABLE IF NOT EXISTS carro_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carro_id UUID REFERENCES carros_embalagem(id),
    nota_fiscal_id UUID REFERENCES notas_fiscais(id),
    quantidade INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'valida',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE INVENTÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nota_fiscal_id UUID REFERENCES notas_fiscais(id),
    rua VARCHAR(100) NOT NULL,
    quantidade INTEGER DEFAULT 1,
    session_id UUID REFERENCES sessions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE RELATÓRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS relatorios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    area VARCHAR(100) NOT NULL,
    data DATE NOT NULL,
    turno VARCHAR(50) NOT NULL,
    quantidade_notas INTEGER DEFAULT 0,
    soma_volumes INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'aguardando_lancamento',
    observacoes TEXT,
    data_finalizacao TIMESTAMP WITH TIME ZONE,
    data_lancamento TIMESTAMP WITH TIME ZONE,
    numero_lancamento VARCHAR(100),
    responsavel_lancamento UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE COLABORADORES POR RELATÓRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS relatorio_colaboradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relatorio_id UUID REFERENCES relatorios(id),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE NOTAS POR RELATÓRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS relatorio_notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relatorio_id UUID REFERENCES relatorios(id),
    nota_fiscal_id UUID REFERENCES notas_fiscais(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE LOGS DE ATIVIDADE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE CONFIGURAÇÕES DO SISTEMA
-- =====================================================
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para sessions
CREATE INDEX IF NOT EXISTS idx_sessions_area_data ON sessions(area, data);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Índices para notas_fiscais
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_numero ON notas_fiscais(numero_nf);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_session ON notas_fiscais(session_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON notas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_data ON notas_fiscais(data);

-- Índices para carros_embalagem
CREATE INDEX IF NOT EXISTS idx_carros_session ON carros_embalagem(session_id);
CREATE INDEX IF NOT EXISTS idx_carros_status ON carros_embalagem(status);
CREATE INDEX IF NOT EXISTS idx_carros_ativo ON carros_embalagem(ativo);

-- Índices para inventario
CREATE INDEX IF NOT EXISTS idx_inventario_rua ON inventario(rua);
CREATE INDEX IF NOT EXISTS idx_inventario_session ON inventario(session_id);

-- Índices para relatorios
CREATE INDEX IF NOT EXISTS idx_relatorios_area_data ON relatorios(area, data);
CREATE INDEX IF NOT EXISTS idx_relatorios_status ON relatorios(status);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notas_fiscais_updated_at BEFORE UPDATE ON notas_fiscais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carros_embalagem_updated_at BEFORE UPDATE ON carros_embalagem
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventario_updated_at BEFORE UPDATE ON inventario
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relatorios_updated_at BEFORE UPDATE ON relatorios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular estatísticas
CREATE OR REPLACE FUNCTION get_sector_stats(
    p_area VARCHAR,
    p_data DATE,
    p_turno VARCHAR
)
RETURNS TABLE (
    total_nfs BIGINT,
    total_volumes BIGINT,
    total_divergencias BIGINT,
    total_relatorios BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT nf.id)::BIGINT as total_nfs,
        COALESCE(SUM(nf.volumes), 0)::BIGINT as total_volumes,
        COUNT(DISTINCT d.id)::BIGINT as total_divergencias,
        COUNT(DISTINCT r.id)::BIGINT as total_relatorios
    FROM sessions s
    LEFT JOIN notas_fiscais nf ON s.id = nf.session_id
    LEFT JOIN divergencias d ON nf.id = d.nota_fiscal_id
    LEFT JOIN relatorios r ON s.area = r.area AND s.data = r.data AND s.turno = r.turno
    WHERE s.area = p_area 
    AND s.data = p_data 
    AND s.turno = p_turno;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir configurações padrão do sistema
INSERT INTO system_config (key, value, description) VALUES
('system_name', 'ProFlow - Sistema de Gestão Profarma', 'Nome do sistema'),
('version', '2.0.0', 'Versão atual do sistema'),
('maintenance_mode', 'false', 'Modo de manutenção'),
('max_session_duration', '8', 'Duração máxima da sessão em horas'),
('auto_logout_enabled', 'true', 'Logout automático habilitado')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS - Row Level Security)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE divergencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE carros_embalagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE carro_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorio_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorio_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (serão configuradas pelo Supabase)
-- Estas políticas permitem acesso total para desenvolvimento
-- Em produção, devem ser configuradas adequadamente

-- Política para usuários autenticados
CREATE POLICY "Usuários autenticados podem ver dados" ON users
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ver sessões" ON sessions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ver notas fiscais" ON notas_fiscais
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ver divergências" ON divergencias
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ver carros" ON carros_embalagem
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ver inventário" ON inventario
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ver relatórios" ON relatorios
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- COMENTÁRIOS DAS TABELAS
-- =====================================================

COMMENT ON TABLE users IS 'Tabela de usuários/colaboradores do sistema';
COMMENT ON TABLE sessions IS 'Sessões de trabalho dos usuários';
COMMENT ON TABLE notas_fiscais IS 'Notas fiscais processadas no sistema';
COMMENT ON TABLE divergencias IS 'Divergências encontradas nas notas fiscais';
COMMENT ON TABLE carros_embalagem IS 'Carros de embalagem para transporte';
COMMENT ON TABLE carro_itens IS 'Itens (NFs) em cada carro de embalagem';
COMMENT ON TABLE inventario IS 'Controle de inventário por rua';
COMMENT ON TABLE relatorios IS 'Relatórios de produção por setor';
COMMENT ON TABLE activity_logs IS 'Log de todas as atividades do sistema';
COMMENT ON TABLE system_config IS 'Configurações do sistema';

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
