-- Criar tabela para eventos em tempo real
CREATE TABLE IF NOT EXISTS realtime_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  carro_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_realtime_events_event_type ON realtime_events(event_type);
CREATE INDEX IF NOT EXISTS idx_realtime_events_carro_id ON realtime_events(carro_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_timestamp ON realtime_events(timestamp);

-- Habilitar RLS (Row Level Security)
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de eventos
CREATE POLICY "Permitir inserção de eventos" ON realtime_events
  FOR INSERT WITH CHECK (true);

-- Política para permitir leitura de eventos
CREATE POLICY "Permitir leitura de eventos" ON realtime_events
  FOR SELECT USING (true);

-- Comentários
COMMENT ON TABLE realtime_events IS 'Tabela para sincronização em tempo real de eventos do sistema';
COMMENT ON COLUMN realtime_events.event_type IS 'Tipo do evento (ex: carro_excluido, carro_criado)';
COMMENT ON COLUMN realtime_events.carro_id IS 'ID do carro relacionado ao evento';
COMMENT ON COLUMN realtime_events.data IS 'Dados adicionais do evento em formato JSON';
