-- Script de diagnóstico para problema dos colaboradores não aparecendo nos relatórios de custos
-- Execute este script no seu banco de dados para verificar a estrutura e dados

-- 1. Verificar se a tabela relatorio_colaboradores existe
SELECT 
    table_name,
    '✅ Existe' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'relatorio_colaboradores';

-- 2. Verificar estrutura da tabela relatorio_colaboradores
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'relatorio_colaboradores'
ORDER BY ordinal_position;

-- 3. Verificar se há dados na tabela relatorio_colaboradores
SELECT 
    COUNT(*) as total_registros,
    COUNT(DISTINCT relatorio_id) as relatorios_unicos,
    COUNT(DISTINCT user_id) as usuarios_unicos
FROM relatorio_colaboradores;

-- 4. Verificar alguns registros de exemplo
SELECT 
    rc.id,
    rc.relatorio_id,
    rc.user_id,
    rc.created_at,
    u.nome as nome_usuario,
    r.nome as nome_relatorio,
    r.area
FROM relatorio_colaboradores rc
LEFT JOIN users u ON rc.user_id = u.id
LEFT JOIN relatorios r ON rc.relatorio_id = r.id
LIMIT 10;

-- 5. Verificar relatórios da área custos
SELECT 
    r.id,
    r.nome,
    r.area,
    r.created_at,
    COUNT(rc.user_id) as total_colaboradores
FROM relatorios r
LEFT JOIN relatorio_colaboradores rc ON r.id = rc.relatorio_id
WHERE r.area = 'custos'
GROUP BY r.id, r.nome, r.area, r.created_at
ORDER BY r.created_at DESC
LIMIT 10;

-- 6. Verificar se há relatórios sem colaboradores
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

-- 7. Verificar estrutura da tabela users
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 8. Verificar se há usuários cadastrados
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN nome IS NOT NULL AND nome != '' THEN 1 END) as usuarios_com_nome
FROM users;

-- 9. Verificar alguns usuários de exemplo
SELECT 
    id,
    nome,
    area,
    created_at
FROM users
LIMIT 10;

-- 10. Verificar se há problemas de relacionamento
SELECT 
    'Relatórios sem colaboradores' as problema,
    COUNT(*) as quantidade
FROM relatorios r
WHERE r.area = 'custos'
AND NOT EXISTS (
    SELECT 1 FROM relatorio_colaboradores rc 
    WHERE rc.relatorio_id = r.id
)

UNION ALL

SELECT 
    'Colaboradores sem usuário válido' as problema,
    COUNT(*) as quantidade
FROM relatorio_colaboradores rc
LEFT JOIN users u ON rc.user_id = u.id
WHERE u.id IS NULL OR u.nome IS NULL OR u.nome = '';

-- 11. Verificar triggers relacionados
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('relatorio_colaboradores', 'relatorios')
ORDER BY event_object_table, trigger_name;
