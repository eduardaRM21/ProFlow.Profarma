-- =====================================================
-- VERIFICAR E CORRIGIR TABELA SESSIONS
-- =====================================================

-- 1. Verificar se a tabela sessions existe
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') 
        THEN '✅ Tabela sessions existe' 
        ELSE '❌ Tabela sessions NÃO existe' 
    END as status;

-- 2. Se não existir, criar a tabela
CREATE TABLE IF NOT EXISTS sessions (
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

-- 3. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

-- 4. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_sessions_area ON sessions(area);
CREATE INDEX IF NOT EXISTS idx_sessions_data ON sessions(data);

-- 5. Criar trigger para updated_at se não existir
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

-- 6. Verificar se tudo foi criado corretamente
SELECT 'Tabela sessions verificada e corrigida com sucesso!' as resultado;
