-- Script para diagnosticar a NF 000016498 que não está sendo encontrada
-- Execute este script no seu banco de dados para identificar o problema

-- 1. Verificar se a NF existe na tabela notas_fiscais
SELECT 
    'Verificação na tabela notas_fiscais' as info,
    COUNT(*) as total_encontradas
FROM notas_fiscais 
WHERE numero_nf = '000016498';

-- 2. Verificar se a NF existe com diferentes variações
SELECT 
    'Variações da NF 000016498' as info,
    numero_nf,
    codigo_completo,
    id,
    created_at,
    status
FROM notas_fiscais 
WHERE numero_nf LIKE '%000016498%' 
   OR codigo_completo LIKE '%000016498%'
   OR codigo_completo LIKE '%16498%';

-- 3. Verificar se a NF está em relatórios de recebimento
SELECT 
    'NF em relatórios de recebimento' as info,
    r.id as relatorio_id,
    r.nome as nome_relatorio,
    r.area,
    r.status,
    r.created_at,
    r.data_finalizacao
FROM relatorios r
INNER JOIN relatorio_notas rn ON r.id = rn.relatorio_id
INNER JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
WHERE nf.numero_nf = '000016498'
   OR nf.numero_nf LIKE '%000016498%'
   OR nf.codigo_completo LIKE '%000016498%';

-- 4. Verificar se a NF está em relatórios de custos
SELECT 
    'NF em relatórios de custos' as info,
    r.id as relatorio_id,
    r.nome as nome_relatorio,
    r.area,
    r.status,
    r.created_at,
    r.data_finalizacao
FROM relatorios r
INNER JOIN relatorio_notas rn ON r.id = rn.relatorio_id
INNER JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
WHERE (nf.numero_nf = '000016498' OR nf.numero_nf LIKE '%000016498%')
   AND r.area = 'custos';

-- 5. Verificar se a NF está em relatórios de inventário
SELECT 
    'NF em relatórios de inventário' as info,
    r.id as relatorio_id,
    r.nome as nome_relatorio,
    r.area,
    r.status,
    r.created_at,
    r.data_finalizacao
FROM relatorios r
INNER JOIN relatorio_notas rn ON r.id = rn.relatorio_id
INNER JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
WHERE (nf.numero_nf = '000016498' OR nf.numero_nf LIKE '%000016498%')
   AND r.area = 'inventario';

-- 6. Verificar se a NF está em alguma tabela de notas bipadas
SELECT 
    'NF em notas bipadas' as info,
    COUNT(*) as total_encontradas
FROM embalagem_notas_bipadas 
WHERE numero_nf = '000016498' 
   OR codigo_completo LIKE '%000016498%';

-- 7. Verificar se a NF está em divergências
SELECT 
    'NF em divergências' as info,
    d.id,
    d.nota_fiscal_id,
    d.tipo,
    d.descricao,
    d.created_at
FROM divergencias d
INNER JOIN notas_fiscais nf ON d.nota_fiscal_id = nf.id
WHERE nf.numero_nf = '000016498' 
   OR nf.numero_nf LIKE '%000016498%';

-- 8. Verificar estrutura da tabela notas_fiscais
SELECT 
    'Estrutura da tabela notas_fiscais' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notas_fiscais'
ORDER BY ordinal_position;

-- 9. Verificar se há problemas de case sensitivity
SELECT 
    'Verificação case insensitive' as info,
    numero_nf,
    codigo_completo,
    id,
    created_at
FROM notas_fiscais 
WHERE LOWER(numero_nf) = LOWER('000016498')
   OR LOWER(codigo_completo) LIKE LOWER('%000016498%');

-- 10. Verificar se a NF foi processada recentemente
SELECT 
    'NFs processadas recentemente' as info,
    numero_nf,
    codigo_completo,
    created_at,
    status
FROM notas_fiscais 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 11. Verificar se há problemas de relacionamento
SELECT 
    'Relacionamentos quebrados' as info,
    COUNT(*) as total
FROM relatorio_notas rn
LEFT JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
WHERE nf.id IS NULL;

-- 12. Verificar se há NFs órfãs
SELECT 
    'NFs órfãs' as info,
    COUNT(*) as total
FROM notas_fiscais nf
LEFT JOIN relatorio_notas rn ON nf.id = rn.nota_fiscal_id
WHERE rn.nota_fiscal_id IS NULL;

-- 13. Verificar se a NF está sendo buscada corretamente
-- Simular a busca que o sistema está fazendo
SELECT 
    'Simulação da busca do sistema' as info,
    '000016498' as numero_buscado,
    COUNT(*) as total_encontradas,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ NF encontrada'
        ELSE '❌ NF não encontrada'
    END as status
FROM notas_fiscais 
WHERE numero_nf = '000016498';

-- 14. Verificar se há problemas de encoding ou caracteres especiais
SELECT 
    'Verificação de caracteres especiais' as info,
    numero_nf,
    LENGTH(numero_nf) as tamanho,
    ASCII(SUBSTRING(numero_nf, 1, 1)) as primeiro_char_ascii,
    codigo_completo,
    LENGTH(codigo_completo) as tamanho_codigo
FROM notas_fiscais 
WHERE numero_nf LIKE '%16498%'
   OR codigo_completo LIKE '%16498%'
LIMIT 5;
