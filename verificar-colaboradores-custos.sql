-- Script para verificar e corrigir problema dos colaboradores nos relatórios de custos
-- Execute este script no seu banco de dados

-- 1. Verificar se há relatórios da área custos
SELECT 
    'Relatórios da área custos' as info,
    COUNT(*) as total
FROM relatorios 
WHERE area = 'custos';

-- 2. Verificar se há registros na tabela relatorio_colaboradores
SELECT 
    'Registros em relatorio_colaboradores' as info,
    COUNT(*) as total,
    COUNT(DISTINCT relatorio_id) as relatorios_unicos,
    COUNT(DISTINCT user_id) as usuarios_unicos
FROM relatorio_colaboradores;

-- 3. Verificar relatórios de custos e seus colaboradores
SELECT 
    r.id as relatorio_id,
    r.nome as nome_relatorio,
    r.area,
    r.created_at,
    COUNT(rc.user_id) as total_colaboradores,
    CASE 
        WHEN COUNT(rc.user_id) > 0 THEN '✅ Com colaboradores'
        ELSE '❌ Sem colaboradores'
    END as status
FROM relatorios r
LEFT JOIN relatorio_colaboradores rc ON r.id = rc.relatorio_id
WHERE r.area = 'custos'
GROUP BY r.id, r.nome, r.area, r.created_at
ORDER BY r.created_at DESC;

-- 4. Verificar detalhes dos colaboradores para relatórios de custos
SELECT 
    r.id as relatorio_id,
    r.nome as nome_relatorio,
    rc.user_id,
    u.nome as nome_usuario,
    u.area as area_usuario,
    rc.created_at as data_vinculo
FROM relatorios r
INNER JOIN relatorio_colaboradores rc ON r.id = rc.relatorio_id
INNER JOIN users u ON rc.user_id = u.id
WHERE r.area = 'custos'
ORDER BY r.created_at DESC, u.nome;

-- 5. Verificar se há usuários sem nome
SELECT 
    'Usuários sem nome' as problema,
    COUNT(*) as quantidade
FROM users 
WHERE nome IS NULL OR nome = '';

-- 6. Verificar se há relatórios de custos sem colaboradores
SELECT 
    r.id,
    r.nome,
    r.area,
    r.created_at,
    '❌ Sem colaboradores' as status
FROM relatorios r
WHERE r.area = 'custos'
AND NOT EXISTS (
    SELECT 1 FROM relatorio_colaboradores rc 
    WHERE rc.relatorio_id = r.id
)
ORDER BY r.created_at DESC;

-- 7. Verificar estrutura da tabela relatorio_colaboradores
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'relatorio_colaboradores'
ORDER BY ordinal_position;

-- 8. Verificar se há problemas de constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'relatorio_colaboradores';

-- 9. Verificar se há triggers funcionando
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('relatorio_colaboradores', 'relatorios')
ORDER BY event_object_table, trigger_name;

-- 10. Verificar se há dados órfãos (relatorio_colaboradores sem relatório válido)
SELECT 
    'Colaboradores órfãos' as problema,
    COUNT(*) as quantidade
FROM relatorio_colaboradores rc
LEFT JOIN relatorios r ON rc.relatorio_id = r.id
WHERE r.id IS NULL;

-- 11. Verificar se há dados órfãos (relatorio_colaboradores sem usuário válido)
SELECT 
    'Usuários órfãos' as problema,
    COUNT(*) as quantidade
FROM relatorio_colaboradores rc
LEFT JOIN users u ON rc.user_id = u.id
WHERE u.id IS NULL;

-- 12. Verificar se há relatórios com campo colaboradores preenchido mas sem registros na tabela
SELECT 
    r.id,
    r.nome,
    r.colaboradores,
    '⚠️ Campo preenchido mas sem registros na tabela' as status
FROM relatorios r
WHERE r.area = 'custos'
AND r.colaboradores IS NOT NULL 
AND r.colaboradores != '[]'::jsonb
AND NOT EXISTS (
    SELECT 1 FROM relatorio_colaboradores rc 
    WHERE rc.relatorio_id = r.id
);
