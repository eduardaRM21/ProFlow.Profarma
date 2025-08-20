-- =====================================================
-- SCRIPT PARA CORRIGIR DUPLICAÇÕES DE NOTAS EM RELATÓRIOS
-- Execute este script para resolver o problema de duplicação
-- =====================================================

-- 1. Verificar duplicações existentes
SELECT 
    '🔍 VERIFICAÇÃO DE DUPLICAÇÕES' as info,
    COUNT(*) as total_relacionamentos,
    COUNT(DISTINCT relatorio_id) as relatorios_unicos,
    COUNT(DISTINCT nota_fiscal_id) as notas_unicas,
    COUNT(*) - COUNT(DISTINCT (relatorio_id, nota_fiscal_id)) as duplicacoes_encontradas
FROM relatorio_notas;

-- 2. Mostrar duplicações específicas
SELECT 
    relatorio_id,
    nota_fiscal_id,
    COUNT(*) as quantidade_duplicatas
FROM relatorio_notas
GROUP BY relatorio_id, nota_fiscal_id
HAVING COUNT(*) > 1
ORDER BY quantidade_duplicatas DESC;

-- 3. Remover duplicações mantendo apenas o registro mais antigo
DELETE FROM relatorio_notas 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY relatorio_id, nota_fiscal_id 
                   ORDER BY created_at ASC
               ) as rn
        FROM relatorio_notas
    ) t
    WHERE t.rn > 1
);

-- 4. Verificar se as duplicações foram removidas
SELECT 
    '✅ APÓS REMOÇÃO DE DUPLICAÇÕES' as info,
    COUNT(*) as total_relacionamentos,
    COUNT(DISTINCT relatorio_id) as relatorios_unicos,
    COUNT(DISTINCT nota_fiscal_id) as notas_unicas,
    COUNT(*) - COUNT(DISTINCT (relatorio_id, nota_fiscal_id)) as duplicacoes_restantes
FROM relatorio_notas;

-- 5. Adicionar constraint de unicidade (se não existir)
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'relatorio_notas_relatorio_id_nota_fiscal_id_key'
        AND table_name = 'relatorio_notas'
    ) THEN
        -- Adicionar constraint de unicidade
        ALTER TABLE relatorio_notas 
        ADD CONSTRAINT relatorio_notas_relatorio_id_nota_fiscal_id_key 
        UNIQUE (relatorio_id, nota_fiscal_id);
        
        RAISE NOTICE '✅ Constraint de unicidade adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Constraint de unicidade já existe.';
    END IF;
END $$;

-- 6. Verificar constraint criada
SELECT 
    '🔍 VERIFICAÇÃO DA CONSTRAINT' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'relatorio_notas' 
AND constraint_type = 'UNIQUE';

-- 7. Corrigir a função sync_relatorio_data para evitar duplicações
CREATE OR REPLACE FUNCTION sync_relatorio_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar campo colaboradores com dados da tabela relatorio_colaboradores
  UPDATE relatorios 
  SET colaboradores = (
    SELECT COALESCE(json_agg(DISTINCT u.nome), '[]'::jsonb)
    FROM relatorio_colaboradores rc
    JOIN users u ON rc.user_id = u.id
    WHERE rc.relatorio_id = NEW.relatorio_id
  )
  WHERE id = NEW.relatorio_id;
  
  -- Atualizar campo notas com dados da tabela relatorio_notas (usando DISTINCT para evitar duplicações)
  UPDATE relatorios 
  SET notas = (
    SELECT COALESCE(json_agg(DISTINCT jsonb_build_object(
      'id', nf.id,
      'numeroNF', nf.numero_nf,
      'codigoCompleto', nf.codigo_completo,
      'volumes', nf.volumes,
      'destino', nf.destino,
      'fornecedor', nf.fornecedor,
      'clienteDestino', nf.cliente_destino,
      'tipoCarga', nf.tipo_carga,
      'status', nf.status,
      'data', nf.data
    )), '[]'::jsonb)
    FROM (
      SELECT DISTINCT nf.id, nf.numero_nf, nf.codigo_completo, nf.volumes, 
             nf.destino, nf.fornecedor, nf.cliente_destino, nf.tipo_carga, 
             nf.status, nf.data
      FROM relatorio_notas rn
      JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
      WHERE rn.relatorio_id = NEW.relatorio_id
    ) nf
  )
  WHERE id = NEW.relatorio_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Verificar se a função foi corrigida
SELECT 
    '🔧 FUNÇÃO CORRIGIDA' as info,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'sync_relatorio_data';

-- 9. Teste final - tentar inserir duplicação (deve falhar)
-- Descomente as linhas abaixo para testar (opcional)
/*
INSERT INTO relatorio_notas (relatorio_id, nota_fiscal_id)
SELECT relatorio_id, nota_fiscal_id 
FROM relatorio_notas 
LIMIT 1;
*/
