-- Script para criar tabela de notas consolidadas
-- Execute este script no Supabase SQL Editor

-- Criar tabela de notas consolidadas se não existir
CREATE TABLE IF NOT EXISTS notas_consolidado (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_completo TEXT,
  numero_nf TEXT NOT NULL,
  data DATE NOT NULL,
  volumes INTEGER NOT NULL DEFAULT 0,
  destino TEXT NOT NULL,
  fornecedor TEXT NOT NULL,
  cliente_destino TEXT,
  tipo_carga TEXT,
  transportadora TEXT NOT NULL,
  usuario TEXT NOT NULL,
  data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'deu entrada' CHECK (status IN ('deu entrada', 'recebida', 'processada', 'finalizada', 'cancelada')),
  session_id TEXT, -- Será adicionada foreign key constraint após verificar tipo da tabela sessions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NOTA: A foreign key constraint será adicionada após verificar o tipo do campo 'id' na tabela 'sessions'
-- Se sessions.id for UUID, altere session_id para UUID e execute:
-- ALTER TABLE notas_consolidado ALTER COLUMN session_id TYPE UUID;
-- ALTER TABLE notas_consolidado ADD CONSTRAINT notas_consolidado_session_id_fkey 
--   FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notas_consolidado_numero_nf ON notas_consolidado(numero_nf);
CREATE INDEX IF NOT EXISTS idx_notas_consolidado_data ON notas_consolidado(data);
CREATE INDEX IF NOT EXISTS idx_notas_consolidado_session_id ON notas_consolidado(session_id);
CREATE INDEX IF NOT EXISTS idx_notas_consolidado_transportadora ON notas_consolidado(transportadora);
CREATE INDEX IF NOT EXISTS idx_notas_consolidado_fornecedor ON notas_consolidado(fornecedor);
CREATE INDEX IF NOT EXISTS idx_notas_consolidado_status ON notas_consolidado(status);
CREATE INDEX IF NOT EXISTS idx_notas_consolidado_data_entrada ON notas_consolidado(data_entrada);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela
  DROP TRIGGER IF EXISTS update_notas_consolidado_updated_at ON notas_consolidado;
  CREATE TRIGGER update_notas_consolidado_updated_at
      BEFORE UPDATE ON notas_consolidado
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

-- Criar política RLS (Row Level Security)
ALTER TABLE notas_consolidado ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados" ON notas_consolidado
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção para usuários autenticados" ON notas_consolidado
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização para usuários autenticados" ON notas_consolidado
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão para usuários autenticados" ON notas_consolidado
    FOR DELETE USING (auth.role() = 'authenticated');

-- Comentários na tabela e colunas
COMMENT ON TABLE notas_consolidado IS 'Tabela para armazenar notas consolidadas do sistema de recebimento';
COMMENT ON COLUMN notas_consolidado.id IS 'Identificador único da nota fiscal';
COMMENT ON COLUMN notas_consolidado.codigo_completo IS 'Código completo da nota fiscal (código de barras)';
COMMENT ON COLUMN notas_consolidado.numero_nf IS 'Número da nota fiscal';
COMMENT ON COLUMN notas_consolidado.data IS 'Data da nota fiscal';
COMMENT ON COLUMN notas_consolidado.volumes IS 'Quantidade de volumes da nota';
COMMENT ON COLUMN notas_consolidado.destino IS 'Destino da nota fiscal';
COMMENT ON COLUMN notas_consolidado.fornecedor IS 'Nome do fornecedor';
COMMENT ON COLUMN notas_consolidado.cliente_destino IS 'Cliente de destino';
COMMENT ON COLUMN notas_consolidado.tipo_carga IS 'Tipo da carga';
COMMENT ON COLUMN notas_consolidado.transportadora IS 'Nome da transportadora';
COMMENT ON COLUMN notas_consolidado.usuario IS 'Usuário que processou a nota';
COMMENT ON COLUMN notas_consolidado.data_entrada IS 'Data e hora de entrada da nota no sistema';
COMMENT ON COLUMN notas_consolidado.status IS 'Status atual da nota fiscal';
COMMENT ON COLUMN notas_consolidado.session_id IS 'ID da sessão de recebimento';
COMMENT ON COLUMN notas_consolidado.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN notas_consolidado.updated_at IS 'Data da última atualização do registro';

-- Inserir dados de exemplo (opcional)
-- Tabela criada com sucesso
-- Dados serão inseridos através da aplicação

-- Verificar tipo da tabela sessions existente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' AND column_name = 'id'
ORDER BY ordinal_position;

-- Verificar se a tabela foi criada corretamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notas_consolidado'
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'notas_consolidado';

-- Verificar políticas RLS
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'notas_consolidado';
