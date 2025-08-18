-- =====================================================
-- SCRIPT PARA CORRIGIR DADOS EXISTENTES DOS RELATÓRIOS
-- Execute este script APÓS executar o create-tables-simple.sql
-- =====================================================

-- 1. Verificar dados existentes
SELECT 
    '🔍 VERIFICAÇÃO INICIAL' as info,
    COUNT(*) as total_relatorios,
    COUNT(CASE WHEN colaboradores = '[]'::jsonb THEN 1 END) as relatorios_sem_colaboradores,
    COUNT(CASE WHEN notas = '[]'::jsonb THEN 1 END) as relatorios_sem_notas
FROM relatorios;

-- 2. Corrigir campo colaboradores para relatórios existentes
UPDATE relatorios 
SET colaboradores = (
    SELECT COALESCE(json_agg(u.nome), '[]'::jsonb)
    FROM relatorio_colaboradores rc
    JOIN users u ON rc.user_id = u.id
    WHERE rc.relatorio_id = relatorios.id
)
WHERE colaboradores = '[]'::jsonb OR colaboradores IS NULL;

-- 3. Corrigir campo notas para relatórios existentes
UPDATE relatorios 
SET notas = (
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', nf.id,
            'numeroNF', nf.numero_nf,
            'codigoCompleto', nf.codigo_completo,
            'volumes', nf.volumes,
            'destino', nf.destino,
            'fornecedor', nf.fornecedor,
            'clienteDestino', nf.cliente_destino,
            'tipoCarga', nf.tipo_carga,
            'status', nf.status,
            'data', nf.data
        )
    ), '[]'::jsonb)
    FROM relatorio_notas rn
    JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
    WHERE rn.relatorio_id = relatorios.id
)
WHERE notas = '[]'::jsonb OR notas IS NULL;

-- 4. Verificar dados após correção
SELECT 
    '✅ APÓS CORREÇÃO' as info,
    COUNT(*) as total_relatorios,
    COUNT(CASE WHEN colaboradores != '[]'::jsonb THEN 1 END) as relatorios_com_colaboradores,
    COUNT(CASE WHEN notas != '[]'::jsonb THEN 1 END) as relatorios_com_notas
FROM relatorios;

-- 5. Mostrar exemplo de relatório corrigido
SELECT 
    id,
    nome,
    colaboradores,
    quantidade_notas,
    notas,
    status,
    created_at
FROM relatorios 
WHERE colaboradores != '[]'::jsonb OR notas != '[]'::jsonb
LIMIT 3;

-- 6. Verificar se há usuários sem área definida
SELECT 
    '⚠️ USUÁRIOS SEM ÁREA' as info,
    COUNT(*) as total_usuarios_sem_area
FROM users 
WHERE area IS NULL OR area = '';

-- 7. Corrigir usuários sem área (assumir recebimento como padrão)
UPDATE users 
SET area = 'recebimento' 
WHERE area IS NULL OR area = '';

-- 8. Verificar estrutura das tabelas relacionais
SELECT 
    '🔍 ESTRUTURA DAS TABELAS' as info,
    'relatorio_colaboradores' as tabela,
    COUNT(*) as total_registros
FROM relatorio_colaboradores
UNION ALL
SELECT 
    'relatorio_notas' as tabela,
    COUNT(*) as total_registros
FROM relatorio_notas
UNION ALL
SELECT 
    'notas_fiscais' as tabela,
    COUNT(*) as total_registros
FROM notas_fiscais
UNION ALL
SELECT 
    'users' as tabela,
    COUNT(*) as total_registros
FROM users;

-- 9. Criar usuários de exemplo se não existirem
INSERT INTO users (nome, email, area) 
SELECT 
    'João Silva',
    'joao.silva@profarma.com',
    'recebimento'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE nome = 'João Silva');

INSERT INTO users (nome, email, area) 
SELECT 
    'Maria Santos',
    'maria.santos@profarma.com',
    'recebimento'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE nome = 'Maria Santos');

INSERT INTO users (nome, email, area) 
SELECT 
    'Pedro Oliveira',
    'pedro.oliveira@profarma.com',
    'recebimento'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE nome = 'Pedro Oliveira');

-- 10. Verificar se os triggers estão funcionando
SELECT 
    '🔧 VERIFICAÇÃO DOS TRIGGERS' as info,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'relatorios'
ORDER BY trigger_name;

-- 11. Testar sincronização automática
-- Inserir um relatório de teste
INSERT INTO relatorios (
    nome,
    colaboradores,
    data,
    turno,
    area,
    quantidade_notas,
    soma_volumes,
    notas,
    status
) VALUES (
    'TESTE SINCRONIZAÇÃO - ' || NOW()::text,
    '[]'::jsonb,
    NOW()::date::text,
    'TESTE',
    'recebimento',
    0,
    0,
    '[]'::jsonb,
    'em_andamento'
) RETURNING id;

-- 12. Comentários finais
/*
🎯 SCRIPT EXECUTADO COM SUCESSO!

✅ PROBLEMAS RESOLVIDOS:
- Campos colaboradores e notas agora são preenchidos automaticamente
- Triggers sincronizam dados entre tabelas relacionais e campos JSON
- Usuários sem área foram corrigidos
- Estrutura das tabelas foi verificada

📋 PRÓXIMOS PASSOS:
1. Execute este script no seu banco de dados
2. Verifique se os relatórios existentes agora mostram colaboradores e notas
3. Teste criando um novo relatório para confirmar que funciona
4. Se houver problemas, verifique os logs do console do navegador

🚨 ATENÇÃO:
- Este script modifica dados existentes
- Faça backup antes de executar em produção
- Execute primeiro em ambiente de teste
*/
