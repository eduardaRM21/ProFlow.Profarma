-- Schema WMS (Warehouse Management System) para ProFlow
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de cargas (agrupamento de NFs que serão embaladas)
CREATE TABLE IF NOT EXISTS wms_cargas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  codigo_carga TEXT UNIQUE NOT NULL,
  cliente_destino TEXT NOT NULL,
  destino TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('montada', 'aguardando_armazenagem', 'armazenada', 'liberada_para_expedicao')),
  quantidade_paletes INTEGER DEFAULT 0,
  quantidade_gaiolas INTEGER DEFAULT 0,
  quantidade_caixas_mangas INTEGER DEFAULT 0,
  total_volumes INTEGER DEFAULT 0,
  total_nfs INTEGER DEFAULT 0,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_armazenamento TIMESTAMP WITH TIME ZONE,
  data_liberacao TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de posições do porta-paletes (2.940 posições: 28 corredores × 21 ruas × 5 níveis)
-- Criada antes de paletes para evitar dependência circular
CREATE TABLE IF NOT EXISTS wms_posicoes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  codigo_posicao TEXT UNIQUE NOT NULL, -- Formato: CXX-RYY-NZ (ex: C01-R01-N1)
  corredor INTEGER NOT NULL CHECK (corredor >= 1 AND corredor <= 28),
  rua INTEGER NOT NULL CHECK (rua >= 1 AND rua <= 21),
  nivel INTEGER NOT NULL CHECK (nivel >= 1 AND nivel <= 5),
  posicao INTEGER, -- Número da posição (ex: 001, 020) - extraído do código
  status TEXT NOT NULL CHECK (status IN ('disponivel', 'ocupada', 'bloqueada')) DEFAULT 'disponivel',
  palete_id UUID, -- Será referenciado após criar wms_paletes
  capacidade_peso DECIMAL(10, 2) DEFAULT 1000.00, -- Peso máximo em kg
  cliente_preferencial TEXT, -- Cliente que normalmente ocupa esta posição
  destino_preferencial TEXT, -- Destino que normalmente ocupa esta posição
  data_ocupacao TIMESTAMP WITH TIME ZONE,
  data_liberacao TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de paletes (unidade de armazenamento)
CREATE TABLE IF NOT EXISTS wms_paletes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  codigo_palete TEXT UNIQUE NOT NULL,
  carga_id UUID REFERENCES wms_cargas(id) ON DELETE CASCADE,
  posicao_id UUID REFERENCES wms_posicoes(id) ON DELETE SET NULL,
  status TEXT NOT NULL, -- Constraint será adicionado após corrigir dados inválidos
  quantidade_volumes INTEGER DEFAULT 0,
  quantidade_nfs INTEGER DEFAULT 0,
  peso_estimado DECIMAL(10, 2),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_armazenamento TIMESTAMP WITH TIME ZONE,
  data_expedicao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign key de palete_id em posicoes após criar wms_paletes
ALTER TABLE wms_posicoes 
  ADD CONSTRAINT fk_wms_posicoes_palete 
  FOREIGN KEY (palete_id) REFERENCES wms_paletes(id) ON DELETE SET NULL;

-- Tabela de associação NFs com Paletes (uma linha por palete com array de notas)
CREATE TABLE IF NOT EXISTS wms_palete_notas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  palete_id UUID REFERENCES wms_paletes(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cliente_destino TEXT,
  destino TEXT,
  total_volumes INTEGER DEFAULT 0,
  notas JSONB DEFAULT '[]'::jsonb NOT NULL,
  data_associacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de movimentações
CREATE TABLE IF NOT EXISTS wms_movimentacoes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  palete_id UUID REFERENCES wms_paletes(id) ON DELETE SET NULL,
  posicao_origem_id UUID REFERENCES wms_posicoes(id) ON DELETE SET NULL,
  posicao_destino_id UUID REFERENCES wms_posicoes(id) ON DELETE SET NULL,
  tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('armazenamento', 'transferencia', 'expedicao', 'reposicao')),
  usuario TEXT NOT NULL,
  data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_wms_cargas_status ON wms_cargas(status);
CREATE INDEX IF NOT EXISTS idx_wms_cargas_cliente ON wms_cargas(cliente_destino);
CREATE INDEX IF NOT EXISTS idx_wms_paletes_carga ON wms_paletes(carga_id);
CREATE INDEX IF NOT EXISTS idx_wms_paletes_posicao ON wms_paletes(posicao_id);
CREATE INDEX IF NOT EXISTS idx_wms_paletes_status ON wms_paletes(status);
CREATE INDEX IF NOT EXISTS idx_wms_posicoes_codigo ON wms_posicoes(codigo_posicao);
CREATE INDEX IF NOT EXISTS idx_wms_posicoes_status ON wms_posicoes(status);
CREATE INDEX IF NOT EXISTS idx_wms_posicoes_corredor_rua_nivel ON wms_posicoes(corredor, rua, nivel);
CREATE INDEX IF NOT EXISTS idx_wms_palete_notas_palete ON wms_palete_notas(palete_id);
CREATE INDEX IF NOT EXISTS idx_wms_palete_notas_destino ON wms_palete_notas(destino);
CREATE INDEX IF NOT EXISTS idx_wms_palete_notas_cliente ON wms_palete_notas(cliente_destino);
CREATE INDEX IF NOT EXISTS idx_wms_palete_notas_notas ON wms_palete_notas USING GIN (notas);
CREATE INDEX IF NOT EXISTS idx_wms_movimentacoes_palete ON wms_movimentacoes(palete_id);
CREATE INDEX IF NOT EXISTS idx_wms_movimentacoes_data ON wms_movimentacoes(data_movimentacao);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_wms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_wms_cargas_updated_at BEFORE UPDATE ON wms_cargas
  FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at();

CREATE TRIGGER update_wms_paletes_updated_at BEFORE UPDATE ON wms_paletes
  FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at();

CREATE TRIGGER update_wms_posicoes_updated_at BEFORE UPDATE ON wms_posicoes
  FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at();

CREATE TRIGGER update_wms_palete_notas_updated_at BEFORE UPDATE ON wms_palete_notas
  FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at();

-- Função para gerar código de posição automaticamente
CREATE OR REPLACE FUNCTION gerar_codigo_posicao(corredor_num INTEGER, rua_num INTEGER, nivel_num INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'C' || LPAD(corredor_num::TEXT, 2, '0') || '-R' || LPAD(rua_num::TEXT, 2, '0') || '-N' || nivel_num::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Inicializar todas as 2.940 posições do porta-paletes
DO $$
DECLARE
  corredor_num INTEGER;
  rua_num INTEGER;
  nivel_num INTEGER;
  codigo TEXT;
BEGIN
  FOR corredor_num IN 1..28 LOOP
    FOR rua_num IN 1..21 LOOP
      FOR nivel_num IN 1..5 LOOP
        codigo := gerar_codigo_posicao(corredor_num, rua_num, nivel_num);
        
        INSERT INTO wms_posicoes (codigo_posicao, corredor, rua, nivel, status)
        VALUES (codigo, corredor_num, rua_num, nivel_num, 'disponivel')
        ON CONFLICT (codigo_posicao) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE wms_cargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_paletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_posicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_palete_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir todas as operações (ajustar conforme necessário em produção)
CREATE POLICY "Allow all operations on wms_cargas" ON wms_cargas
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on wms_paletes" ON wms_paletes
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on wms_posicoes" ON wms_posicoes
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on wms_palete_notas" ON wms_palete_notas
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on wms_movimentacoes" ON wms_movimentacoes
  FOR ALL USING (true);

-- Comentários das tabelas
COMMENT ON TABLE wms_cargas IS 'Tabela para armazenar cargas (agrupamento de NFs)';
COMMENT ON TABLE wms_paletes IS 'Tabela para armazenar paletes (unidade de armazenamento)';
COMMENT ON TABLE wms_posicoes IS 'Tabela para armazenar posições do porta-paletes (2.940 posições)';
COMMENT ON TABLE wms_palete_notas IS 'Tabela de associação entre paletes e notas fiscais (uma linha por palete com array de notas)';
COMMENT ON COLUMN wms_palete_notas.palete_id IS 'ID do palete (UNIQUE - apenas uma linha por palete)';
COMMENT ON COLUMN wms_palete_notas.notas IS 'Array JSONB com todas as notas fiscais do palete';
COMMENT ON COLUMN wms_palete_notas.total_volumes IS 'Total de volumes de todas as notas do palete';
COMMENT ON COLUMN wms_palete_notas.cliente_destino IS 'Cliente destino do palete';
COMMENT ON COLUMN wms_palete_notas.destino IS 'Destino do palete';
COMMENT ON TABLE wms_movimentacoes IS 'Tabela de histórico de movimentações de paletes';

-- IMPORTANTE: Execute o script fix-wms-paletes-status-constraint.sql
-- para corrigir dados inválidos e adicionar o constraint de status

-- Verificar se as tabelas foram criadas corretamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name LIKE 'wms_%'
ORDER BY table_name, ordinal_position;

