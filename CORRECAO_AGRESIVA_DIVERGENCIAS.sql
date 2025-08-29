-- =====================================================
-- 🚨 CORREÇÃO AGRESIVA - ERRO 406 TABELA DIVERGÊNCIAS
-- =====================================================
-- EXECUTE ESTE SCRIPT SE O RLS SIMPLES NÃO FUNCIONAR
-- ATENÇÃO: Este script é mais agressivo e pode recriar a tabela

-- =====================================================
-- PASSO 1: VERIFICAÇÃO INICIAL
-- =====================================================

-- Verificar se a tabela existe
SELECT 
    'VERIFICAÇÃO INICIAL' as etapa,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'divergencias'
    ) as tabela_existe;

-- =====================================================
-- PASSO 2: DESABILITAR RLS (TENTATIVA 1)
-- =====================================================

-- Tentar desabilitar RLS
ALTER TABLE divergencias DISABLE ROW LEVEL SECURITY;

-- Verificar se funcionou
SELECT 
    'DESABILITAR RLS' as etapa,
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO' 
        ELSE '✅ RLS DESABILITADO' 
    END as status
FROM pg_tables 
WHERE tablename = 'divergencias';

-- =====================================================
-- PASSO 3: REMOVER POLÍTICAS RLS EXISTENTES
-- =====================================================

-- Listar políticas existentes
SELECT 
    'POLÍTICAS EXISTENTES' as etapa,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'divergencias' 
AND schemaname = 'public';

-- Remover TODAS as políticas RLS
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'divergencias' 
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON divergencias';
        RAISE NOTICE '✅ Política removida: %', policy_record.policyname;
    END LOOP;
END $$;

-- =====================================================
-- PASSO 4: VERIFICAR PERMISSÕES
-- =====================================================

-- Verificar permissões do usuário anônimo
SELECT 
    'PERMISSÕES ANÔNIMO' as etapa,
    has_table_privilege('anon', 'divergencias', 'SELECT') as pode_selecionar,
    has_table_privilege('anon', 'divergencias', 'INSERT') as pode_inserir,
    has_table_privilege('anon', 'divergencias', 'UPDATE') as pode_atualizar,
    has_table_privilege('anon', 'divergencias', 'DELETE') as pode_deletar;

-- =====================================================
-- PASSO 5: CONCEDER PERMISSÕES EXPLÍCITAS
-- =====================================================

-- Conceder todas as permissões para o usuário anônimo
GRANT ALL PRIVILEGES ON TABLE divergencias TO anon;
GRANT ALL PRIVILEGES ON SEQUENCE divergencias_id_seq TO anon;

-- Verificar permissões após concessão
SELECT 
    'PERMISSÕES APÓS CONCESSÃO' as etapa,
    has_table_privilege('anon', 'divergencias', 'SELECT') as pode_selecionar,
    has_table_privilege('anon', 'divergencias', 'INSERT') as pode_inserir,
    has_table_privilege('anon', 'divergencias', 'UPDATE') as pode_atualizar,
    has_table_privilege('anon', 'divergencias', 'DELETE') as pode_deletar;

-- =====================================================
-- PASSO 6: TESTAR CONSULTA
-- =====================================================

-- Testar consulta simples
SELECT 
    'TESTE CONSULTA SIMPLES' as etapa,
    COUNT(*) as total_registros
FROM divergencias;

-- Testar consulta específica que estava falhando
SELECT 
    'TESTE CONSULTA ESPECÍFICA' as etapa,
    COUNT(*) as total_encontrado
FROM divergencias 
WHERE nota_fiscal_id = '51f26c92-327f-4a7d-a10a-95a85412e1c7';

-- =====================================================
-- PASSO 7: SE AINDA NÃO FUNCIONAR - RECRIAR TABELA
-- =====================================================

-- Se nada funcionar, execute estas linhas (CUIDADO: perde dados existentes):
/*
-- 1. Fazer backup dos dados existentes
CREATE TABLE IF NOT EXISTS divergencias_backup AS 
SELECT * FROM divergencias;

-- 2. Dropar tabela atual
DROP TABLE IF EXISTS divergencias CASCADE;

-- 3. Recriar tabela SEM RLS
CREATE TABLE divergencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_fiscal_id UUID NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    volumes_informados INTEGER,
    volumes_reais INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índice
CREATE INDEX idx_divergencias_nota_fiscal_id ON divergencias(nota_fiscal_id);

-- 5. Restaurar dados (se houver)
INSERT INTO divergencias 
SELECT * FROM divergencias_backup;

-- 6. Verificar resultado
SELECT COUNT(*) as total_restaurado FROM divergencias;
*/

-- =====================================================
-- PASSO 8: VERIFICAÇÃO FINAL
-- =====================================================

-- Status final da tabela
SELECT 
    'STATUS FINAL' as etapa,
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO' 
        ELSE '✅ RLS DESABILITADO COM SUCESSO' 
    END as status_final
FROM pg_tables 
WHERE tablename = 'divergencias';

-- Teste final
SELECT 
    'TESTE FINAL' as etapa,
    'Consulta funcionando' as status,
    COUNT(*) as total_divergencias
FROM divergencias;

