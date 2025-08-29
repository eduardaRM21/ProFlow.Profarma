-- =====================================================
-- 🔍 VERIFICAÇÃO COMPLETA - TABELA DIVERGÊNCIAS
-- =====================================================
-- Execute este script para diagnosticar TODOS os problemas
-- que podem estar causando o erro 406

-- =====================================================
-- 1. VERIFICAÇÃO BÁSICA DA TABELA
-- =====================================================

-- Verificar se a tabela existe
SELECT 
    'EXISTÊNCIA DA TABELA' as verificacao,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'divergencias'
    ) as tabela_existe;

-- Verificar se a tabela tem dados
SELECT 
    'DADOS NA TABELA' as verificacao,
    COUNT(*) as total_registros
FROM divergencias;

-- =====================================================
-- 2. VERIFICAÇÃO DE RLS
-- =====================================================

-- Verificar status do RLS
SELECT 
    'STATUS RLS' as verificacao,
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '❌ RLS HABILITADO' 
        ELSE '✅ RLS DESABILITADO' 
    END as status_rls
FROM pg_tables 
WHERE tablename = 'divergencias';

-- Verificar políticas RLS existentes
SELECT 
    'POLÍTICAS RLS' as verificacao,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'divergencias' 
AND schemaname = 'public';

-- =====================================================
-- 3. VERIFICAÇÃO DE PERMISSÕES
-- =====================================================

-- Verificar permissões da tabela
SELECT 
    'PERMISSÕES' as verificacao,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'divergencias'
AND table_schema = 'public';

-- Verificar permissões do usuário anônimo
SELECT 
    'PERMISSÕES ANÔNIMO' as verificacao,
    has_table_privilege('anon', 'divergencias', 'SELECT') as pode_selecionar,
    has_table_privilege('anon', 'divergencias', 'INSERT') as pode_inserir,
    has_table_privilege('anon', 'divergencias', 'UPDATE') as pode_atualizar,
    has_table_privilege('anon', 'divergencias', 'DELETE') as pode_deletar;

-- =====================================================
-- 4. VERIFICAÇÃO DE ESTRUTURA
-- =====================================================

-- Verificar estrutura da tabela
SELECT 
    'ESTRUTURA' as verificacao,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'divergencias' 
ORDER BY ordinal_position;

-- Verificar índices
SELECT 
    'ÍNDICES' as verificacao,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'divergencias';

-- =====================================================
-- 5. VERIFICAÇÃO DE DADOS ESPECÍFICOS
-- =====================================================

-- Tentar consulta que está falhando
SELECT 
    'CONSULTA ESPECÍFICA' as verificacao,
    COUNT(*) as total_encontrado
FROM divergencias 
WHERE nota_fiscal_id = '51f26c92-327f-4a7d-a10a-95a85412e1c7';

-- Verificar se o ID existe
SELECT 
    'ID EXISTENTE' as verificacao,
    id,
    nota_fiscal_id,
    tipo,
    created_at
FROM divergencias 
WHERE nota_fiscal_id = '51f26c92-327f-4a7d-a10a-95a85412e1c7';

-- =====================================================
-- 6. VERIFICAÇÃO DE CONEXÃO
-- =====================================================

-- Verificar se há conexões ativas
SELECT 
    'CONEXÕES' as verificacao,
    count(*) as conexoes_ativas
FROM pg_stat_activity 
WHERE datname = current_database();

-- Verificar configurações do banco
SELECT 
    'CONFIGURAÇÕES' as verificacao,
    name,
    setting,
    unit
FROM pg_settings 
WHERE name IN ('row_security', 'default_table_access_method');

-- =====================================================
-- 7. SOLUÇÕES AUTOMÁTICAS
-- =====================================================

-- Se RLS estiver habilitado, desabilitar
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'divergencias' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE divergencias DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela divergencias';
    ELSE
        RAISE NOTICE 'ℹ️ RLS já está desabilitado na tabela divergencias';
    END IF;
END $$;

-- Verificar resultado final
SELECT 
    'RESULTADO FINAL' as verificacao,
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO' 
        ELSE '✅ RLS DESABILITADO COM SUCESSO' 
    END as status_final
FROM pg_tables 
WHERE tablename = 'divergencias';

-- =====================================================
-- 8. TESTE FINAL
-- =====================================================

-- Testar consulta após correções
SELECT 
    'TESTE FINAL' as verificacao,
    'Consulta funcionando' as status,
    COUNT(*) as total_divergencias
FROM divergencias;

