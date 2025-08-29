-- =====================================================
-- CORREÇÃO DAS POLÍTICAS RLS PARA TABELA DIVERGÊNCIAS
-- =====================================================
-- Este script corrige o erro 406 (Not Acceptable) ao tentar
-- acessar a tabela divergencias no Supabase

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- A tabela divergencias tem RLS habilitado com políticas
-- que exigem autenticação (auth.role() = 'authenticated')
-- Como o sistema Profarma não usa autenticação do Supabase,
-- todas as consultas retornam erro 406

-- =====================================================
-- SOLUÇÃO 1: DESABILITAR RLS TEMPORARIAMENTE (RECOMENDADO)
-- =====================================================

-- Desabilitar RLS na tabela divergencias
ALTER TABLE divergencias DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- SOLUÇÃO 2: CRIAR POLÍTICAS PERMISSIVAS (ALTERNATIVA)
-- =====================================================

-- Se preferir manter RLS habilitado, descomente estas linhas:

/*
-- Remover políticas existentes
DROP POLICY IF EXISTS "Usuários autenticados podem ver divergências" ON divergencias;

-- Criar política permissiva para todas as operações
CREATE POLICY "Acesso total às divergências" ON divergencias
    FOR ALL USING (true);

-- Ou criar políticas específicas:
CREATE POLICY "Visualizar divergências" ON divergencias
    FOR SELECT USING (true);

CREATE POLICY "Inserir divergências" ON divergencias
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Atualizar divergências" ON divergencias
    FOR UPDATE USING (true);

CREATE POLICY "Excluir divergências" ON divergencias
    FOR DELETE USING (true);
*/

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se RLS está desabilitado
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '❌ RLS HABILITADO' 
        ELSE '✅ RLS DESABILITADO' 
    END as status_rls
FROM pg_tables 
WHERE tablename = 'divergencias';

-- Verificar políticas existentes (se houver)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'divergencias' 
AND schemaname = 'public';

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'divergencias' 
ORDER BY ordinal_position;

-- Verificar se há dados na tabela
SELECT 
    COUNT(*) as total_divergencias,
    COUNT(DISTINCT nota_fiscal_id) as notas_com_divergencia
FROM divergencias;

-- =====================================================
-- TESTE DE CONSULTA
-- =====================================================

-- Testar se a consulta funciona após a correção
-- (Execute esta consulta para verificar)
SELECT 
    d.id,
    d.nota_fiscal_id,
    d.tipo,
    d.observacoes,
    d.volumes_informados,
    d.created_at
FROM divergencias d
LIMIT 5;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

-- 1. Execute este script no SQL Editor do Supabase
-- 2. Use a Solução 1 (desabilitar RLS) para desenvolvimento
-- 3. Use a Solução 2 (políticas permissivas) para produção
-- 4. Após executar, teste novamente o sistema
-- 5. Verifique se o erro 406 foi resolvido

-- =====================================================
-- NOTA DE SEGURANÇA
-- =====================================================

-- ⚠️ ATENÇÃO: Desabilitar RLS ou usar políticas muito permissivas
-- pode expor dados sensíveis. Use apenas em ambientes de desenvolvimento
-- ou implemente autenticação adequada em produção.

-- =====================================================
-- ALTERNATIVA: VERIFICAR SE A TABELA EXISTE
-- =====================================================

-- Se a tabela divergencias não existir, execute primeiro:
/*
CREATE TABLE IF NOT EXISTS divergencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nota_fiscal_id UUID REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    volumes_informados INTEGER,
    volumes_reais INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_divergencias_nota_fiscal_id ON divergencias(nota_fiscal_id);
*/
