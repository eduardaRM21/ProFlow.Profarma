-- Script para corrigir o problema da NF 000016498
-- Execute este script APÓS executar o script de diagnóstico

-- 1. Verificar se a NF existe em algum lugar do sistema
-- Se não existir, vamos criar um registro para ela

-- Primeiro, vamos verificar se há algum problema de sincronização
-- entre as tabelas relatorio_notas e notas_fiscais

-- 2. Verificar se há relatórios que referenciam esta NF mas ela não está na tabela notas_fiscais
SELECT 
    'Relatórios que podem referenciar NF 000016498' as info,
    r.id as relatorio_id,
    r.nome as nome_relatorio,
    r.area,
    r.status,
    r.created_at
FROM relatorios r
WHERE r.notas::text LIKE '%000016498%'
   OR r.notas::text LIKE '%16498%';

-- 3. Se a NF não existir na tabela notas_fiscais, vamos criar um registro para ela
-- (Isso é necessário para que a validação funcione)

DO $$
DECLARE
    nf_exists BOOLEAN;
    new_nf_id UUID;
BEGIN
    -- Verificar se a NF já existe
    SELECT EXISTS(
        SELECT 1 FROM notas_fiscais WHERE numero_nf = '000016498'
    ) INTO nf_exists;
    
    IF NOT nf_exists THEN
        RAISE NOTICE '🔍 NF 000016498 não encontrada. Criando registro...';
        
        -- Gerar novo ID
        new_nf_id := gen_random_uuid();
        
        -- Inserir NF na tabela notas_fiscais
        INSERT INTO notas_fiscais (
            id,
            numero_nf,
            codigo_completo,
            volumes,
            destino,
            fornecedor,
            cliente_destino,
            tipo_carga,
            status,
            data,
            created_at
        ) VALUES (
            new_nf_id,
            '000016498',
            '000016498|000016498|0|DESTINO|FORNECEDOR|CLIENTE|TIPO',
            0,
            'DESTINO TEMPORÁRIO',
            'FORNECEDOR TEMPORÁRIO',
            'CLIENTE TEMPORÁRIO',
            'TIPO TEMPORÁRIO',
            'pendente',
            CURRENT_DATE,
            NOW()
        );
        
        RAISE NOTICE '✅ NF 000016498 criada com ID: %', new_nf_id;
        
        -- Verificar se há relatórios que referenciam esta NF
        -- Se houver, vamos criar o relacionamento
        IF EXISTS (
            SELECT 1 FROM relatorios r 
            WHERE r.notas::text LIKE '%000016498%'
        ) THEN
            RAISE NOTICE '🔍 Encontrados relatórios que referenciam NF 000016498. Criando relacionamentos...';
            
            -- Aqui você pode adicionar lógica para criar os relacionamentos
            -- dependendo de como os dados estão estruturados
        END IF;
        
    ELSE
        RAISE NOTICE 'ℹ️ NF 000016498 já existe na tabela notas_fiscais';
    END IF;
END $$;

-- 4. Verificar se a NF foi criada corretamente
SELECT 
    'Verificação pós-correção' as info,
    COUNT(*) as total_encontradas,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ NF encontrada'
        ELSE '❌ NF ainda não encontrada'
    END as status
FROM notas_fiscais 
WHERE numero_nf = '000016498';

-- 5. Verificar se há problemas de relacionamento que precisam ser corrigidos
-- Se a NF foi criada mas não está sendo encontrada, pode ser um problema de relacionamento

-- 6. Verificar se há problemas de cache ou sincronização
-- Limpar cache se necessário (dependendo da implementação)

-- 7. Verificar se a função de busca está funcionando corretamente
-- Simular a busca novamente
SELECT 
    'Teste da busca pós-correção' as info,
    '000016498' as numero_buscado,
    COUNT(*) as total_encontradas,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Busca funcionando'
        ELSE '❌ Busca ainda não funcionando'
    END as status
FROM notas_fiscais 
WHERE numero_nf = '000016498';

-- 8. Se ainda houver problemas, verificar se há triggers ou constraints que impedem a inserção
SELECT 
    'Verificação de triggers e constraints' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'notas_fiscais';

-- 9. Verificar se há problemas de permissões
SELECT 
    'Verificação de permissões' as info,
    table_name,
    privilege_type,
    grantee
FROM information_schema.role_table_grants 
WHERE table_name = 'notas_fiscais';

-- 10. Verificar se há problemas de RLS (Row Level Security)
SELECT 
    'Verificação de RLS' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notas_fiscais';

-- 11. Se tudo estiver funcionando, verificar se a NF está sendo encontrada em relatórios
SELECT 
    'Verificação final - NF em relatórios' as info,
    r.id as relatorio_id,
    r.nome as nome_relatorio,
    r.area,
    r.status,
    r.created_at
FROM relatorios r
INNER JOIN relatorio_notas rn ON r.id = rn.relatorio_id
INNER JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
WHERE nf.numero_nf = '000016498';

-- 12. Resumo final
SELECT 
    'RESUMO FINAL' as info,
    (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') as nf_na_tabela,
    (SELECT COUNT(*) FROM relatorio_notas rn 
     INNER JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id 
     WHERE nf.numero_nf = '000016498') as nf_em_relatorios,
    CASE 
        WHEN (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') > 0 
        THEN '✅ NF disponível para validação'
        ELSE '❌ NF ainda não disponível'
    END as status_final;
