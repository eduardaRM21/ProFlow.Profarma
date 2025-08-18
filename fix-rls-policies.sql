-- =====================================================
-- CORREÇÃO DAS POLÍTICAS RLS PARA TABELA RELATÓRIOS
-- =====================================================

-- Este arquivo corrige as políticas RLS que estão impedindo
-- o acesso à tabela relatorios no sistema Profarma

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- As políticas RLS estão configuradas para auth.role() = 'authenticated'
-- mas o sistema não está usando autenticação do Supabase
-- Isso impede a criação e leitura de relatórios

-- =====================================================
-- SOLUÇÃO 1: DESABILITAR RLS TEMPORARIAMENTE
-- =====================================================

-- Desabilitar RLS na tabela relatorios para desenvolvimento
ALTER TABLE relatorios DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- SOLUÇÃO 2: CRIAR POLÍTICAS MAIS PERMISSIVAS
-- =====================================================

-- Se preferir manter RLS habilitado, use estas políticas:

-- Política para permitir acesso total à tabela relatorios
-- DROP POLICY IF EXISTS "Usuários autenticados podem ver relatórios" ON relatorios;
-- CREATE POLICY "Acesso total aos relatórios" ON relatorios
--     FOR ALL USING (true);

-- Política para permitir inserção
-- DROP POLICY IF EXISTS "Usuários autenticados podem inserir relatórios" ON relatorios;
-- CREATE POLICY "Inserir relatórios" ON relatorios
--     FOR INSERT WITH CHECK (true);

-- Política para permitir leitura
-- DROP POLICY IF EXISTS "Usuários autenticados podem ler relatórios" ON relatorios;
-- CREATE POLICY "Ler relatórios" ON relatorios
--     FOR SELECT USING (true);

-- Política para permitir atualização
-- DROP POLICY IF EXISTS "Usuários autenticados podem atualizar relatórios" ON relatorios;
-- CREATE POLICY "Atualizar relatórios" ON relatorios
--     FOR UPDATE USING (true);

-- Política para permitir exclusão
-- DROP POLICY IF EXISTS "Usuários autenticados podem excluir relatórios" ON relatorios;
-- CREATE POLICY "Excluir relatórios" ON relatorios
--     FOR DELETE USING (true);

-- =====================================================
-- SOLUÇÃO 3: CRIAR USUÁRIO ANÔNIMO COM PERMISSÕES
-- =====================================================

-- Se quiser manter RLS mas permitir acesso anônimo:
-- CREATE POLICY "Acesso anônimo aos relatórios" ON relatorios
--     FOR ALL USING (true);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se RLS está desabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'relatorios';

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'relatorios';

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

-- 1. Execute este script no seu banco Supabase
-- 2. Use a Solução 1 (desabilitar RLS) para desenvolvimento
-- 3. Use a Solução 2 (políticas permissivas) para produção
-- 4. Após executar, teste novamente o sistema

-- =====================================================
-- NOTA DE SEGURANÇA
-- =====================================================

-- ⚠️ ATENÇÃO: Desabilitar RLS ou usar políticas muito permissivas
-- pode expor dados sensíveis. Use apenas em ambientes de desenvolvimento
-- ou implemente autenticação adequada em produção.
