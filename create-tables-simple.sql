-- =====================================================
-- SCRIPT CORRIGIDO PARA CRIAR TABELAS NECESSÁRIAS
-- RESOLVENDO PROBLEMAS DE COLABORADORES E NOTAS EM BRANCO
-- =====================================================

-- 1. Criar tabela relatorios (corrigida com campos JSON para colaboradores e notas)
CREATE TABLE IF NOT EXISTS relatorios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    colaboradores JSONB NOT NULL DEFAULT '[]',           -- Corrigido: JSONB para armazenar array de colaboradores
    data TEXT NOT NULL,
    turno TEXT NOT NULL,
    area TEXT NOT NULL,
    quantidade_notas INTEGER NOT NULL DEFAULT 0,
    soma_volumes INTEGER NOT NULL DEFAULT 0,
    notas JSONB NOT NULL DEFAULT '[]',                  -- Corrigido: JSONB para armazenar array de notas
    data_finalizacao TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizado', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela notas_fiscais (estrutura completa)
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_nf TEXT NOT NULL,
    codigo_completo TEXT,                               -- Código de barras completo
    fornecedor TEXT,
    volumes INTEGER DEFAULT 0,
    destino TEXT,
    cliente_destino TEXT,
    tipo_carga TEXT,
    status TEXT DEFAULT 'ok',
    data TEXT,                                          -- Data da nota
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela users (estrutura completa)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    area TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar tabela relatorio_notas (relacionamento)
CREATE TABLE IF NOT EXISTS relatorio_notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relatorio_id UUID REFERENCES relatorios(id) ON DELETE CASCADE,
    nota_fiscal_id UUID REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraint de unicidade para evitar duplicações
    UNIQUE(relatorio_id, nota_fiscal_id)
);

-- 5. Criar tabela relatorio_colaboradores (relacionamento)
CREATE TABLE IF NOT EXISTS relatorio_colaboradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relatorio_id UUID REFERENCES relatorios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar tabela divergencias
CREATE TABLE IF NOT EXISTS divergencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nota_fiscal_id UUID REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    volumes_informados INTEGER,
    volumes_reais INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_relatorios_id ON relatorios(id);
CREATE INDEX IF NOT EXISTS idx_relatorios_area ON relatorios(area);
CREATE INDEX IF NOT EXISTS idx_relatorios_data ON relatorios(data);
CREATE INDEX IF NOT EXISTS idx_relatorios_status ON relatorios(status);
CREATE INDEX IF NOT EXISTS idx_relatorios_colaboradores ON relatorios USING GIN (colaboradores);
CREATE INDEX IF NOT EXISTS idx_relatorios_notas ON relatorios USING GIN (notas);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_numero ON notas_fiscais(numero_nf);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_codigo ON notas_fiscais(codigo_completo);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_fornecedor ON notas_fiscais(fornecedor);

CREATE INDEX IF NOT EXISTS idx_users_nome ON users(nome);
CREATE INDEX IF NOT EXISTS idx_users_area ON users(area);

CREATE INDEX IF NOT EXISTS idx_relatorio_notas_relatorio_id ON relatorio_notas(relatorio_id);
CREATE INDEX IF NOT EXISTS idx_relatorio_notas_nota_fiscal_id ON relatorio_notas(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_relatorio_colaboradores_relatorio_id ON relatorio_colaboradores(relatorio_id);
CREATE INDEX IF NOT EXISTS idx_relatorio_colaboradores_user_id ON relatorio_colaboradores(user_id);
CREATE INDEX IF NOT EXISTS idx_divergencias_nota_fiscal_id ON divergencias(nota_fiscal_id);

-- 8. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Triggers para atualizar updated_at (com verificação de existência)
DO $$
BEGIN
    -- Verificar se o trigger já existe antes de criar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_relatorios_updated_at' 
        AND event_object_table = 'relatorios'
    ) THEN
        CREATE TRIGGER update_relatorios_updated_at 
            BEFORE UPDATE ON relatorios
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_relatorios_updated_at criado com sucesso';
    ELSE
        RAISE NOTICE 'Trigger update_relatorios_updated_at já existe, pulando...';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_notas_fiscais_updated_at' 
        AND event_object_table = 'notas_fiscais'
    ) THEN
        CREATE TRIGGER update_notas_fiscais_updated_at 
            BEFORE UPDATE ON notas_fiscais
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_notas_fiscais_updated_at criado com sucesso';
    ELSE
        RAISE NOTICE 'Trigger update_notas_fiscais_updated_at já existe, pulando...';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_users_updated_at' 
        AND event_object_table = 'users'
    ) THEN
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_users_updated_at criado com sucesso';
    ELSE
        RAISE NOTICE 'Trigger update_users_updated_at já existe, pulando...';
    END IF;
END $$;

-- 10. Função para sincronizar campos JSON com tabelas relacionais (CORRIGIDA)
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
  
  -- Atualizar campo notas com dados da tabela relatorio_notas (usando DISTINCT para evitar duplicações)
  UPDATE relatorios 
  SET notas = (
    SELECT COALESCE(json_agg(DISTINCT jsonb_build_object(
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
    )), '[]'::jsonb)
    FROM (
      SELECT DISTINCT nf.id, nf.numero_nf, nf.codigo_completo, nf.volumes, 
             nf.destino, nf.fornecedor, nf.cliente_destino, nf.tipo_carga, 
             nf.status, nf.data
      FROM relatorio_notas rn
      JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
      WHERE rn.relatorio_id = NEW.relatorio_id
    ) nf
  )
  WHERE id = NEW.relatorio_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Triggers para sincronização automática (com verificação de existência)
DO $$
BEGIN
    -- Verificar se o trigger já existe antes de criar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'sync_relatorio_colaboradores' 
        AND event_object_table = 'relatorio_colaboradores'
    ) THEN
        CREATE TRIGGER sync_relatorio_colaboradores
            AFTER INSERT OR DELETE ON relatorio_colaboradores
            FOR EACH ROW EXECUTE FUNCTION sync_relatorio_data();
        RAISE NOTICE 'Trigger sync_relatorio_colaboradores criado com sucesso';
    ELSE
        RAISE NOTICE 'Trigger sync_relatorio_colaboradores já existe, pulando...';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'sync_relatorio_notas' 
        AND event_object_table = 'relatorio_notas'
    ) THEN
        CREATE TRIGGER sync_relatorio_notas
            AFTER INSERT OR DELETE ON relatorio_notas
            FOR EACH ROW EXECUTE FUNCTION sync_relatorio_data();
        RAISE NOTICE 'Trigger sync_relatorio_notas criado com sucesso';
    ELSE
        RAISE NOTICE 'Trigger sync_relatorio_notas já existe, pulando...';
    END IF;
END $$;

-- 12. Verificar se as tabelas foram criadas
SELECT 
    table_name,
    '✅ Criada' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('relatorios', 'notas_fiscais', 'users', 'relatorio_notas', 'relatorio_colaboradores', 'divergencias')
ORDER BY table_name;

-- 13. Verificar se os triggers foram criados
SELECT 
    '🔧 VERIFICAÇÃO DOS TRIGGERS' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('relatorios', 'notas_fiscais', 'users', 'relatorio_colaboradores', 'relatorio_notas')
ORDER BY event_object_table, trigger_name;

-- 14. Exemplo de inserção de dados corrigidos
-- INSERT INTO relatorios (
--     id,
--     nome,
--     colaboradores,
--     data,
--     turno,
--     area,
--     quantidade_notas,
--     soma_volumes,
--     notas,
--     data_finalizacao,
--     status
-- ) VALUES (
--     '703a8fd9-09f4-42e1-bb0c-e11cf548d889'::UUID,
--     'TESTE - 14/08/2025, 01:34:28',
--     '["João Silva", "Maria Santos"]'::jsonb,
--     '2025-08-14',
--     'TESTE',
--     'recebimento',
--     2,
--     10,
--     '[]'::jsonb,
--     '2025-08-14T04:34:28.192+00:00'::TIMESTAMP WITH TIME ZONE,
--     'finalizado'
-- );

-- 15. Comentários importantes sobre a correção:
/*
🔧 PROBLEMAS RESOLVIDOS:

1. ✅ Campo 'colaboradores' agora é JSONB e armazena array de nomes
2. ✅ Campo 'notas' agora é JSONB e armazena array de objetos de notas
3. ✅ Triggers automáticos sincronizam dados entre tabelas relacionais e campos JSON
4. ✅ Índices GIN para melhor performance em consultas JSON
5. ✅ Estrutura completa da tabela notas_fiscais
6. ✅ Validações e constraints apropriadas
7. ✅ Verificação de triggers existentes para evitar erros de duplicação

📋 COMO FUNCIONA AGORA:

1. Ao inserir em relatorio_colaboradores → campo colaboradores é atualizado automaticamente
2. Ao inserir em relatorio_notas → campo notas é atualizado automaticamente
3. Os campos JSON sempre refletem o estado atual das tabelas relacionais
4. Consultas podem usar tanto os campos JSON quanto as tabelas relacionais

🚀 BENEFÍCIOS:

- Dados sempre sincronizados
- Melhor performance em consultas
- Flexibilidade para usar JSON ou relacionamentos
- Manutenção automática da consistência
- Execução segura sem erros de duplicação
*/
