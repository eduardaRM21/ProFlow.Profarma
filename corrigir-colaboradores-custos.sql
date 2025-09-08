-- Script para corrigir problema dos colaboradores nos relatórios de custos
-- Execute este script APÓS executar o script de verificação

-- 1. Verificar se há relatórios de custos sem colaboradores
DO $$
DECLARE
    relatorio_record RECORD;
    user_record RECORD;
    colaborador_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 Verificando relatórios de custos sem colaboradores...';
    
    FOR relatorio_record IN 
        SELECT id, nome, created_at 
        FROM relatorios 
        WHERE area = 'custos'
        AND NOT EXISTS (
            SELECT 1 FROM relatorio_colaboradores rc 
            WHERE rc.relatorio_id = relatorios.id
        )
    LOOP
        RAISE NOTICE '📋 Relatório sem colaboradores: % - % (ID: %)', 
            relatorio_record.nome, 
            relatorio_record.created_at, 
            relatorio_record.id;
        
        -- Verificar se há usuários disponíveis para atribuir
        SELECT COUNT(*) INTO colaborador_count
        FROM users 
        WHERE area = 'custos' OR area IS NULL;
        
        IF colaborador_count > 0 THEN
            -- Atribuir o primeiro usuário disponível como colaborador
            FOR user_record IN 
                SELECT id, nome 
                FROM users 
                WHERE area = 'custos' OR area IS NULL
                LIMIT 1
            LOOP
                INSERT INTO relatorio_colaboradores (relatorio_id, user_id)
                VALUES (relatorio_record.id, user_record.id);
                
                RAISE NOTICE '✅ Colaborador atribuído: % (ID: %) para relatório %', 
                    user_record.nome, 
                    user_record.id, 
                    relatorio_record.nome;
            END LOOP;
        ELSE
            RAISE NOTICE '⚠️ Nenhum usuário disponível para atribuir ao relatório %', relatorio_record.nome;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Verificação concluída!';
END $$;

-- 2. Verificar se há usuários sem nome e corrigir
UPDATE users 
SET nome = COALESCE(nome, 'Usuário ' || id)
WHERE nome IS NULL OR nome = '';

-- 3. Verificar se há relatórios com campo colaboradores vazio mas com registros na tabela
UPDATE relatorios 
SET colaboradores = (
    SELECT COALESCE(json_agg(DISTINCT u.nome), '[]'::jsonb)
    FROM relatorio_colaboradores rc
    JOIN users u ON rc.user_id = u.id
    WHERE rc.relatorio_id = relatorios.id
)
WHERE area = 'custos'
AND (colaboradores IS NULL OR colaboradores = '[]'::jsonb)
AND EXISTS (
    SELECT 1 FROM relatorio_colaboradores rc 
    WHERE rc.relatorio_id = relatorios.id
);

-- 4. Verificar se há dados órfãos e limpar
DELETE FROM relatorio_colaboradores 
WHERE relatorio_id NOT IN (SELECT id FROM relatorios);

DELETE FROM relatorio_colaboradores 
WHERE user_id NOT IN (SELECT id FROM users);

-- 5. Verificar se há triggers funcionando corretamente
-- Se não houver, recriar o trigger
DO $$
BEGIN
    -- Verificar se o trigger existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'sync_relatorio_colaboradores' 
        AND event_object_table = 'relatorio_colaboradores'
    ) THEN
        -- Recriar o trigger
        CREATE TRIGGER sync_relatorio_colaboradores
            AFTER INSERT OR DELETE ON relatorio_colaboradores
            FOR EACH ROW EXECUTE FUNCTION sync_relatorio_data();
        
        RAISE NOTICE '✅ Trigger sync_relatorio_colaboradores recriado com sucesso';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger sync_relatorio_colaboradores já existe';
    END IF;
END $$;

-- 6. Verificar se a função sync_relatorio_data existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'sync_relatorio_data'
    ) THEN
        -- Recriar a função
        CREATE OR REPLACE FUNCTION sync_relatorio_data()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Atualizar campo colaboradores com dados da tabela relatorio_colaboradores
          UPDATE relatorios 
          SET colaboradores = (
            SELECT COALESCE(json_agg(DISTINCT u.nome), '[]'::jsonb)
            FROM relatorio_colaboradores rc
            JOIN users u ON rc.user_id = u.id
            WHERE rc.relatorio_id = NEW.relatorio_id
          )
          WHERE id = NEW.relatorio_id;
          
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        RAISE NOTICE '✅ Função sync_relatorio_data recriada com sucesso';
    ELSE
        RAISE NOTICE 'ℹ️ Função sync_relatorio_data já existe';
    END IF;
END $$;

-- 7. Forçar sincronização de todos os relatórios de custos
UPDATE relatorios 
SET colaboradores = (
    SELECT COALESCE(json_agg(DISTINCT u.nome), '[]'::jsonb)
    FROM relatorio_colaboradores rc
    JOIN users u ON rc.user_id = u.id
    WHERE rc.relatorio_id = relatorios.id
)
WHERE area = 'custos';

-- 8. Verificar resultado final
SELECT 
    'Resultado final' as info,
    COUNT(*) as total_relatorios,
    COUNT(CASE WHEN colaboradores IS NOT NULL AND colaboradores != '[]'::jsonb THEN 1 END) as com_colaboradores,
    COUNT(CASE WHEN colaboradores IS NULL OR colaboradores = '[]'::jsonb THEN 1 END) as sem_colaboradores
FROM relatorios 
WHERE area = 'custos';

-- 9. Mostrar alguns exemplos de relatórios corrigidos
SELECT 
    id,
    nome,
    colaboradores,
    created_at
FROM relatorios 
WHERE area = 'custos'
AND colaboradores IS NOT NULL 
AND colaboradores != '[]'::jsonb
ORDER BY created_at DESC
LIMIT 5;
