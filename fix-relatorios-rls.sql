-- =====================================================
-- CORREÇÃO DAS POLÍTICAS RLS PARA TABELA RELATÓRIOS
-- =====================================================
-- Este script corrige o erro de violação de política RLS
-- que está impedindo a inserção de relatórios

-- Primeiro, vamos remover a política restritiva existente
DROP POLICY IF EXISTS "Usuários autenticados podem ver relatórios" ON relatorios;

-- Agora vamos criar políticas mais específicas e permissivas

-- Política para SELECT (visualização)
CREATE POLICY "Usuários autenticados podem visualizar relatórios" ON relatorios
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para INSERT (inserção)
CREATE POLICY "Usuários autenticados podem inserir relatórios" ON relatorios
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE (atualização)
CREATE POLICY "Usuários autenticados podem atualizar relatórios" ON relatorios
    FOR UPDATE USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Política para DELETE (exclusão)
CREATE POLICY "Usuários autenticados podem excluir relatórios" ON relatorios
    FOR DELETE USING (auth.role() = 'authenticated');

-- Alternativa: Política única permissiva (mais simples para desenvolvimento)
-- Descomente as linhas abaixo se preferir uma abordagem mais simples
/*
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar relatórios" ON relatorios;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir relatórios" ON relatorios;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar relatórios" ON relatorios;
DROP POLICY IF EXISTS "Usuários autenticados podem excluir relatórios" ON relatorios;

CREATE POLICY "Permitir todas as operações para usuários autenticados" ON relatorios
    FOR ALL USING (auth.role() = 'authenticated');
*/

-- Verificar se as políticas foram criadas corretamente
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
WHERE tablename = 'relatorios' 
AND schemaname = 'public'
ORDER BY policyname;

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'relatorios' 
AND schemaname = 'public';
