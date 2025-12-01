-- Migração para ajustar a tabela wms_palete_notas
-- De: uma linha por nota (relacionamento 1:1)
-- Para: uma linha por palete com array de notas (relacionamento 1:N)

-- 1. Criar tabela temporária com a nova estrutura
CREATE TABLE IF NOT EXISTS wms_palete_notas_new (
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

-- 2. Migrar dados da tabela antiga para a nova
-- Agrupar por palete_id e criar array de notas
INSERT INTO wms_palete_notas_new (palete_id, cliente_destino, destino, total_volumes, notas, data_associacao, created_at)
SELECT 
  palete_id,
  MAX(cliente_destino) as cliente_destino, -- Pegar o primeiro valor não nulo
  MAX(destino) as destino, -- Pegar o primeiro valor não nulo
  SUM(volumes) as total_volumes, -- Somar todos os volumes
  jsonb_agg(
    jsonb_build_object(
      'numero_nf', numero_nf,
      'codigo_completo', codigo_completo,
      'fornecedor', fornecedor,
      'cliente_destino', cliente_destino,
      'destino', destino,
      'volumes', volumes,
      'data_associacao', data_associacao
    )
    ORDER BY data_associacao
  ) as notas,
  MIN(data_associacao) as data_associacao, -- Data da primeira nota
  MIN(created_at) as created_at -- Data de criação mais antiga
FROM wms_palete_notas
GROUP BY palete_id
ON CONFLICT (palete_id) DO NOTHING;

-- 3. Remover duplicatas no array de notas (caso a mesma nota apareça múltiplas vezes)
UPDATE wms_palete_notas_new
SET notas = (
  SELECT jsonb_agg(DISTINCT nota)
  FROM jsonb_array_elements(notas) AS nota
);

-- 4. Remover constraint UNIQUE da tabela antiga (se existir)
DO $$
BEGIN
  -- Remover constraint UNIQUE se existir
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'wms_palete_notas'
      AND c.contype = 'u'
  ) THEN
    ALTER TABLE wms_palete_notas DROP CONSTRAINT IF EXISTS wms_palete_notas_palete_id_numero_nf_key;
    RAISE NOTICE 'Constraint UNIQUE removido da tabela antiga';
  END IF;
END $$;

-- 5. Renomear tabelas (backup da antiga e ativação da nova)
ALTER TABLE wms_palete_notas RENAME TO wms_palete_notas_old;
ALTER TABLE wms_palete_notas_new RENAME TO wms_palete_notas;

-- 6. Recriar índices
CREATE INDEX IF NOT EXISTS idx_wms_palete_notas_palete ON wms_palete_notas(palete_id);
CREATE INDEX IF NOT EXISTS idx_wms_palete_notas_destino ON wms_palete_notas(destino);
CREATE INDEX IF NOT EXISTS idx_wms_palete_notas_cliente ON wms_palete_notas(cliente_destino);
CREATE INDEX IF NOT EXISTS idx_wms_palete_notas_notas ON wms_palete_notas USING GIN (notas);

-- 7. Recriar trigger para updated_at
CREATE TRIGGER update_wms_palete_notas_updated_at BEFORE UPDATE ON wms_palete_notas
  FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at();

-- 8. Recriar políticas RLS
ALTER TABLE wms_palete_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on wms_palete_notas" ON wms_palete_notas
  FOR ALL USING (true);

-- 9. Comentários
COMMENT ON TABLE wms_palete_notas IS 'Tabela de associação entre paletes e notas fiscais (uma linha por palete com array de notas)';
COMMENT ON COLUMN wms_palete_notas.palete_id IS 'ID do palete (UNIQUE - apenas uma linha por palete)';
COMMENT ON COLUMN wms_palete_notas.notas IS 'Array JSONB com todas as notas fiscais do palete';
COMMENT ON COLUMN wms_palete_notas.total_volumes IS 'Total de volumes de todas as notas do palete';
COMMENT ON COLUMN wms_palete_notas.cliente_destino IS 'Cliente destino do palete';
COMMENT ON COLUMN wms_palete_notas.destino IS 'Destino do palete';

-- 10. Verificar migração
SELECT 
  'Tabela antiga (backup)' as tabela,
  COUNT(*) as total_registros
FROM wms_palete_notas_old
UNION ALL
SELECT 
  'Tabela nova' as tabela,
  COUNT(*) as total_registros
FROM wms_palete_notas;

-- 11. Verificar estrutura da nova tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'wms_palete_notas'
ORDER BY ordinal_position;

