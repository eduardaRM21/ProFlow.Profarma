-- =====================================================
-- CORREÇÃO URGENTE - ERRO 406 TABELA DIVERGÊNCIAS
-- =====================================================
-- Execute este script no SQL Editor do Supabase para resolver
-- imediatamente o erro 406 (Not Acceptable)

-- SOLUÇÃO RÁPIDA: Desabilitar RLS na tabela divergencias
ALTER TABLE divergencias DISABLE ROW LEVEL SECURITY;

-- VERIFICAÇÃO: Confirmar que RLS foi desabilitado
SELECT 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO' 
        ELSE '✅ RLS DESABILITADO COM SUCESSO' 
    END as status
FROM pg_tables 
WHERE tablename = 'divergencias';

-- TESTE: Verificar se a consulta funciona
SELECT COUNT(*) as total_divergencias FROM divergencias;
