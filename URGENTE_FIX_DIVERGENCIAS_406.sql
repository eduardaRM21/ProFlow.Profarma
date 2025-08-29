-- =====================================================
-- 🚨 CORREÇÃO URGENTE - ERRO 406 TABELA DIVERGÊNCIAS
-- =====================================================
-- EXECUTE ESTE SCRIPT IMEDIATAMENTE NO SUPABASE SQL EDITOR
-- PARA RESOLVER O ERRO 406 (Not Acceptable)

-- =====================================================
-- SOLUÇÃO IMEDIATA
-- =====================================================

-- 1. DESABILITAR RLS NA TABELA DIVERGÊNCIAS
ALTER TABLE divergencias DISABLE ROW LEVEL SECURITY;

-- 2. VERIFICAR SE FOI APLICADO
SELECT 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO - EXECUTE NOVAMENTE' 
        ELSE '✅ RLS DESABILITADO COM SUCESSO' 
    END as status
FROM pg_tables 
WHERE tablename = 'divergencias';

-- 3. TESTAR SE A CONSULTA FUNCIONA
SELECT COUNT(*) as total_divergencias FROM divergencias;

-- 4. TESTAR CONSULTA ESPECÍFICA (que estava falhando)
SELECT * FROM divergencias WHERE nota_fiscal_id = 'aed97dee-51a7-4f0e-9843-02cef3e369df';

-- =====================================================
-- SE AINDA HOUVER PROBLEMAS, EXECUTE TAMBÉM:
-- =====================================================

-- Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'divergencias'
) as tabela_existe;

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'divergencias' 
ORDER BY ordinal_position;

-- Verificar políticas RLS existentes
SELECT 
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'divergencias' 
AND schemaname = 'public';

-- =====================================================
-- ALTERNATIVA: RECRIAR TABELA SE NECESSÁRIO
-- =====================================================

-- Se nada funcionar, execute estas linhas (CUIDADO: perde dados existentes):
/*
-- 1. Fazer backup dos dados existentes
CREATE TABLE divergencias_backup AS SELECT * FROM divergencias;

-- 2. Dropar tabela atual
DROP TABLE IF EXISTS divergencias;

-- 3. Recriar tabela sem RLS
CREATE TABLE divergencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nota_fiscal_id UUID REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    volumes_informados INTEGER,
    volumes_reais INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Recriar índice
CREATE INDEX idx_divergencias_nota_fiscal_id ON divergencias(nota_fiscal_id);

-- 5. Restaurar dados (se houver)
INSERT INTO divergencias SELECT * FROM divergencias_backup;

-- 6. Verificar resultado
SELECT COUNT(*) FROM divergencias;
*/

