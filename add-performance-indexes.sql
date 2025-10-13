-- =====================================================
-- ÍNDICES PARA OTIMIZAÇÃO DE PERFORMANCE
-- =====================================================

-- Índices para tabela divergencias
CREATE INDEX IF NOT EXISTS idx_divergencias_nota_fiscal_id 
ON divergencias(nota_fiscal_id);

CREATE INDEX IF NOT EXISTS idx_divergencias_created_at 
ON divergencias(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_divergencias_tipo 
ON divergencias(tipo);

-- Índices para tabela embalagem_notas_bipadas
CREATE INDEX IF NOT EXISTS idx_embalagem_carro_id 
ON embalagem_notas_bipadas(carro_id);

CREATE INDEX IF NOT EXISTS idx_embalagem_status 
ON embalagem_notas_bipadas(status);

CREATE INDEX IF NOT EXISTS idx_embalagem_created_at 
ON embalagem_notas_bipadas(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_embalagem_session_id 
ON embalagem_notas_bipadas(session_id);

CREATE INDEX IF NOT EXISTS idx_embalagem_numero_nf 
ON embalagem_notas_bipadas(numero_nf);

-- Índices para tabela relatorio_notas
CREATE INDEX IF NOT EXISTS idx_relatorio_notas_relatorio_id 
ON relatorio_notas(relatorio_id);

CREATE INDEX IF NOT EXISTS idx_relatorio_notas_nota_fiscal_id 
ON relatorio_notas(nota_fiscal_id);

-- Índices para tabela relatorios
CREATE INDEX IF NOT EXISTS idx_relatorios_area 
ON relatorios(area);

CREATE INDEX IF NOT EXISTS idx_relatorios_data 
ON relatorios(data);

CREATE INDEX IF NOT EXISTS idx_relatorios_turno 
ON relatorios(turno);

CREATE INDEX IF NOT EXISTS idx_relatorios_status 
ON relatorios(status);

CREATE INDEX IF NOT EXISTS idx_relatorios_created_at 
ON relatorios(created_at DESC);

-- Índices para tabela notas_fiscais
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_session_id 
ON notas_fiscais(session_id);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_numero_nf 
ON notas_fiscais(numero_nf);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status 
ON notas_fiscais(status);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_created_at 
ON notas_fiscais(created_at DESC);

-- Índices para tabela relatorio_colaboradores
CREATE INDEX IF NOT EXISTS idx_relatorio_colaboradores_relatorio_id 
ON relatorio_colaboradores(relatorio_id);

CREATE INDEX IF NOT EXISTS idx_relatorio_colaboradores_user_id 
ON relatorio_colaboradores(user_id);

-- Índices para tabela users
CREATE INDEX IF NOT EXISTS idx_users_area 
ON users(area);

CREATE INDEX IF NOT EXISTS idx_users_ativo 
ON users(ativo);

-- Índices para tabela sessions
CREATE INDEX IF NOT EXISTS idx_sessions_area_data_turno 
ON sessions(area, data, turno);

CREATE INDEX IF NOT EXISTS idx_sessions_status 
ON sessions(status);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at 
ON sessions(created_at DESC);

-- =====================================================
-- ÍNDICES COMPOSTOS PARA CONSULTAS COMPLEXAS
-- =====================================================

-- Índice composto para relatórios por área e data
CREATE INDEX IF NOT EXISTS idx_relatorios_area_data 
ON relatorios(area, data DESC);

-- Índice composto para relatórios por área, data e turno
CREATE INDEX IF NOT EXISTS idx_relatorios_area_data_turno 
ON relatorios(area, data, turno);

-- Índice composto para embalagem por carro e status
CREATE INDEX IF NOT EXISTS idx_embalagem_carro_status 
ON embalagem_notas_bipadas(carro_id, status);

-- Índice composto para divergências por nota e tipo
CREATE INDEX IF NOT EXISTS idx_divergencias_nota_tipo 
ON divergencias(nota_fiscal_id, tipo);

-- =====================================================
-- ÍNDICES PARCIAIS PARA DADOS ATIVOS
-- =====================================================

-- Índice parcial para sessões ativas
CREATE INDEX IF NOT EXISTS idx_sessions_ativas 
ON sessions(area, data, turno) 
WHERE status = 'ativa';

-- Índice parcial para usuários ativos
CREATE INDEX IF NOT EXISTS idx_users_ativos 
ON users(area) 
WHERE ativo = true;

-- Índice parcial para relatórios não finalizados
CREATE INDEX IF NOT EXISTS idx_relatorios_nao_finalizados 
ON relatorios(area, data, turno) 
WHERE status != 'finalizado';

-- =====================================================
-- ANÁLISE DE PERFORMANCE
-- =====================================================

-- Função para analisar uso de índices
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    schemaname text,
    tablename text,
    indexname text,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname,
        s.relname as tablename,
        s.indexrelname as indexname,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch
    FROM pg_stat_user_indexes s
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONFIGURAÇÕES DE PERFORMANCE
-- =====================================================

-- Configurar estatísticas para otimizador de consultas
ALTER TABLE divergencias ALTER COLUMN nota_fiscal_id SET STATISTICS 1000;
ALTER TABLE embalagem_notas_bipadas ALTER COLUMN carro_id SET STATISTICS 1000;
ALTER TABLE relatorio_notas ALTER COLUMN relatorio_id SET STATISTICS 1000;
ALTER TABLE relatorios ALTER COLUMN area SET STATISTICS 1000;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON INDEX idx_divergencias_nota_fiscal_id IS 'Índice para consultas de divergências por nota fiscal';
COMMENT ON INDEX idx_embalagem_carro_id IS 'Índice para consultas de notas por carro';
COMMENT ON INDEX idx_relatorio_notas_relatorio_id IS 'Índice para consultas de notas por relatório';
COMMENT ON INDEX idx_relatorios_area_data IS 'Índice composto para consultas de relatórios por área e data';

-- =====================================================
-- VERIFICAÇÃO DE ÍNDICES CRIADOS
-- =====================================================

-- Query para verificar se todos os índices foram criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
