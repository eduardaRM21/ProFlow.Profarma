-- 🚨 URGENTE: CORRIGIR TABELA SESSIONS
-- Execute este SQL IMEDIATAMENTE no Supabase!

-- 1. DROP da tabela existente (se houver)
DROP TABLE IF EXISTS sessions CASCADE;

-- 2. CRIAR tabela sessions com estrutura correta
CREATE TABLE sessions (
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

-- 3. Criar índices
CREATE INDEX idx_sessions_area ON sessions(area);
CREATE INDEX idx_sessions_data ON sessions(data);

-- 4. Criar função e trigger para updated_at
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

-- 5. Verificar se foi criada
SELECT '✅ Tabela sessions criada com sucesso!' as resultado;
