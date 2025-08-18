-- =====================================================
-- SOLUÇÃO RÁPIDA PARA ERRO RLS NA TABELA RELATÓRIOS
-- =====================================================
-- Execute este script no seu banco de dados para resolver
-- o erro: "new row violates row-level security policy for table 'relatorios'"

-- 1. Remover política restritiva existente
DROP POLICY IF EXISTS "Usuários autenticados podem ver relatórios" ON relatorios;

-- 2. Criar política permissiva para todas as operações
CREATE POLICY "Permitir todas as operações para usuários autenticados" ON relatorios
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Verificar se foi aplicado
SELECT 
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'relatorios' 
AND schemaname = 'public';
