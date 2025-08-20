-- Tabela para armazenar status dos carros em tempo real
CREATE TABLE IF NOT EXISTS carros_status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carro_id TEXT NOT NULL,
  nome_carro TEXT NOT NULL,
  colaboradores TEXT[] NOT NULL,
  data TEXT NOT NULL,
  turno TEXT NOT NULL,
  destino_final TEXT NOT NULL,
  quantidade_nfs INTEGER NOT NULL,
  total_volumes INTEGER NOT NULL,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL,
  data_finalizacao TIMESTAMP WITH TIME ZONE,
  numeros_sap TEXT[],
  status_carro TEXT NOT NULL CHECK (status_carro IN ('embalando', 'divergencia', 'aguardando_lancamento', 'finalizado')),
  nfs JSONB NOT NULL DEFAULT '[]',
  estimativa_pallets INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(carro_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_carros_status_carro_id ON carros_status(carro_id);
CREATE INDEX IF NOT EXISTS idx_carros_status_session_id ON carros_status(session_id);
CREATE INDEX IF NOT EXISTS idx_carros_status_status ON carros_status(status_carro);
CREATE INDEX IF NOT EXISTS idx_carros_status_data ON carros_status(data);
CREATE INDEX IF NOT EXISTS idx_carros_status_updated_at ON carros_status(updated_at);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_carros_status_updated_at BEFORE UPDATE ON carros_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE carros_status ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (para desenvolvimento)
CREATE POLICY "Allow all operations on carros_status" ON carros_status
  FOR ALL USING (true);

-- Comentário da tabela
COMMENT ON TABLE carros_status IS 'Tabela para armazenar status dos carros em tempo real para múltiplos usuários';
