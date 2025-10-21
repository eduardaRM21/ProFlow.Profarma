-- =====================================================
-- CORREÇÃO DO ERRO 406 (Not Acceptable) NA TABELA notas_bipadas
-- =====================================================

-- Este script corrige o erro 406 que está ocorrendo ao consultar
-- a tabela notas_bipadas no setor de recebimento

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- O erro 406 (Not Acceptable) geralmente indica:
-- 1. Problema com políticas RLS (Row Level Security)
-- 2. Problema com a estrutura da consulta
-- 3. Problema com permissões de acesso
-- 4. Problema com índices ou constraints

-- =====================================================
-- SOLUÇÃO 1: VERIFICAR E CORRIGIR POLÍTICAS RLS
-- =====================================================

-- Verificar se RLS está habilitado na tabela notas_bipadas
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'RLS HABILITADO' 
        ELSE 'RLS DESABILITADO' 
    END as status_rls
FROM pg_tables 
WHERE tablename = 'notas_bipadas';

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notas_bipadas';

-- =====================================================
-- SOLUÇÃO 2: DESABILITAR RLS TEMPORARIAMENTE
-- =====================================================

-- Desabilitar RLS na tabela notas_bipadas para resolver o erro 406
ALTER TABLE notas_bipadas DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- SOLUÇÃO 3: CRIAR POLÍTICAS MAIS PERMISSIVAS (ALTERNATIVA)
-- =====================================================

-- Se preferir manter RLS habilitado, use estas políticas:

-- Remover políticas existentes
-- DROP POLICY IF EXISTS "Allow all operations on notas_bipadas" ON notas_bipadas;

-- Criar política permissiva para todas as operações
-- CREATE POLICY "notas_bipadas_allow_all" 
--     ON notas_bipadas 
--     FOR ALL 
--     USING (true) 
--     WITH CHECK (true);

-- =====================================================
-- SOLUÇÃO 4: VERIFICAR E CORRIGIR ÍNDICES
-- =====================================================

-- Verificar índices existentes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'notas_bipadas';

-- Recriar índices se necessário
-- DROP INDEX IF EXISTS idx_notas_bipadas_numero_nf;
-- CREATE INDEX IF NOT EXISTS idx_notas_bipadas_numero_nf ON notas_bipadas(numero_nf);

-- DROP INDEX IF EXISTS idx_notas_bipadas_area_origem;
-- CREATE INDEX IF NOT EXISTS idx_notas_bipadas_area_origem ON notas_bipadas(area_origem);

-- DROP INDEX IF EXISTS idx_notas_bipadas_session_id;
-- CREATE INDEX IF NOT EXISTS idx_notas_bipadas_session_id ON notas_bipadas(session_id);

-- =====================================================
-- SOLUÇÃO 5: VERIFICAR ESTRUTURA DA TABELA
-- =====================================================

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'notas_bipadas' 
ORDER BY ordinal_position;

-- =====================================================
-- SOLUÇÃO 6: TESTAR CONSULTA SIMPLES
-- =====================================================

-- Testar consulta simples para verificar se o problema foi resolvido
SELECT COUNT(*) as total_notas_bipadas FROM notas_bipadas;

-- Testar consulta com filtros básicos
SELECT 
    area_origem,
    COUNT(*) as total
FROM notas_bipadas 
GROUP BY area_origem;

-- =====================================================
-- SOLUÇÃO 7: VERIFICAR PERMISSÕES DE USUÁRIO
-- =====================================================

-- Verificar permissões do usuário anônimo
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'notas_bipadas';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se RLS foi desabilitado com sucesso
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO' 
        ELSE '✅ RLS DESABILITADO COM SUCESSO' 
    END as status_final
FROM pg_tables 
WHERE tablename = 'notas_bipadas';

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

-- 1. Execute este script no SQL Editor do Supabase
-- 2. A Solução 2 (desabilitar RLS) é a mais rápida para resolver o erro 406
-- 3. Após executar, teste novamente o sistema de recebimento
-- 4. Se o problema persistir, verifique os logs do Supabase para mais detalhes

-- =====================================================
-- NOTA DE SEGURANÇA
-- =====================================================

-- ⚠️ ATENÇÃO: Desabilitar RLS pode expor dados sensíveis.
-- Use apenas em ambientes de desenvolvimento ou implemente
-- autenticação adequada em produção.

-- =====================================================
-- LOGS PARA DEBUG
-- =====================================================

-- Para debug adicional, execute estas consultas:

-- Verificar se há dados na tabela
SELECT COUNT(*) as total_registros FROM notas_bipadas;

-- Verificar dados recentes
SELECT 
    id,
    numero_nf,
    area_origem,
    session_id,
    created_at
FROM notas_bipadas 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar se há problemas com session_id específico
SELECT 
    session_id,
    COUNT(*) as total
FROM notas_bipadas 
WHERE session_id LIKE '%recebimento_Alexsandro_2025-10-20_A%'
GROUP BY session_id;
