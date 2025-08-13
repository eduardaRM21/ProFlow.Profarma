-- =====================================================
-- SCRIPT DE CORREÇÃO PARA INCOMPATIBILIDADE DE SCHEMA
-- =====================================================
-- Este script resolve o problema de tipos incompatíveis entre
-- database-schema.sql (TEXT) e database-schema-complete.sql (UUID)

-- 1. Primeiro, vamos verificar se as tabelas existem e seus tipos
DO $$
BEGIN
    RAISE NOTICE 'Verificando estrutura atual das tabelas...';
END $$;

-- Verificar estrutura da tabela sessions
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'sessions'
    AND column_name = 'id';

-- Verificar se existem foreign keys que referenciam sessions.id
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'sessions'
    AND ccu.column_name = 'id';

-- 2. Se a tabela sessions existir com id TEXT, vamos convertê-la para UUID
DO $$
DECLARE
    col_type text;
BEGIN
    -- Verificar o tipo da coluna id na tabela sessions
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
        AND table_name = 'sessions'
        AND column_name = 'id';
    
    IF col_type = 'text' THEN
        RAISE NOTICE 'Convertendo tabela sessions de TEXT para UUID...';
        
        -- Criar tabela temporária com estrutura UUID
        CREATE TABLE sessions_new (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID,
            area VARCHAR(100) NOT NULL,
            data DATE NOT NULL,
            turno VARCHAR(50) NOT NULL,
            login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            logout_time TIMESTAMP WITH TIME ZONE,
            status VARCHAR(50) DEFAULT 'ativa',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Copiar dados existentes (se houver)
        INSERT INTO sessions_new (area, data, turno, login_time, created_at, updated_at)
        SELECT 
            area,
            TO_DATE(data, 'DD-MM-YYYY'),
            turno,
            login_time,
            created_at,
            updated_at
        FROM sessions;
        
        -- Remover tabela antiga
        DROP TABLE sessions;
        
        -- Renomear nova tabela
        ALTER TABLE sessions_new RENAME TO sessions;
        
        RAISE NOTICE 'Tabela sessions convertida com sucesso para UUID';
    ELSE
        RAISE NOTICE 'Tabela sessions já está com tipo UUID ou não existe';
    END IF;
END $$;

-- 3. Verificar se a tabela notas_fiscais existe e tem a estrutura correta
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notas_fiscais') THEN
        RAISE NOTICE 'Criando tabela notas_fiscais...';
        
        CREATE TABLE notas_fiscais (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            codigo_completo VARCHAR(255) NOT NULL,
            numero_nf VARCHAR(100) NOT NULL,
            data DATE NOT NULL,
            volumes INTEGER NOT NULL,
            destino VARCHAR(255),
            fornecedor VARCHAR(255),
            cliente_destino VARCHAR(255),
            tipo_carga VARCHAR(100),
            status VARCHAR(50) DEFAULT 'recebida',
            session_id UUID REFERENCES sessions(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabela notas_fiscais criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela notas_fiscais já existe';
    END IF;
END $$;

-- 4. Verificar se a tabela divergencias existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'divergencias') THEN
        RAISE NOTICE 'Criando tabela divergencias...';
        
        CREATE TABLE divergencias (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nota_fiscal_id UUID REFERENCES notas_fiscais(id),
            tipo VARCHAR(100) NOT NULL,
            descricao TEXT,
            volumes_informados INTEGER,
            volumes_reais INTEGER,
            observacoes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabela divergencias criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela divergencias já existe';
    END IF;
END $$;

-- 5. Verificar se a tabela carros_embalagem existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carros_embalagem') THEN
        RAISE NOTICE 'Criando tabela carros_embalagem...';
        
        CREATE TABLE carros_embalagem (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nome VARCHAR(255) NOT NULL,
            destino_final VARCHAR(255),
            status VARCHAR(50) DEFAULT 'aguardando_colagem',
            session_id UUID REFERENCES sessions(id),
            data_inicio DATE NOT NULL,
            ativo BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabela carros_embalagem criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela carros_embalagem já existe';
    END IF;
END $$;

-- 6. Verificar se a tabela inventario existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventario') THEN
        RAISE NOTICE 'Criando tabela inventario...';
        
        CREATE TABLE inventario (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nota_fiscal_id UUID REFERENCES notas_fiscais(id),
            rua VARCHAR(100) NOT NULL,
            quantidade INTEGER DEFAULT 1,
            session_id UUID REFERENCES sessions(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabela inventario criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela inventario já existe';
    END IF;
END $$;

-- 7. Verificar se a tabela users existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Criando tabela users...';
        
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            area VARCHAR(100) NOT NULL,
            ativo BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabela users criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela users já existe';
    END IF;
END $$;

-- 8. Verificar se a tabela relatorios existe com estrutura correta
DO $$
DECLARE
    col_type text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relatorios') THEN
        -- Verificar se a coluna id é TEXT
        SELECT data_type INTO col_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'relatorios'
            AND column_name = 'id';
        
        IF col_type = 'text' THEN
            RAISE NOTICE 'Convertendo tabela relatorios de TEXT para UUID...';
            
            -- Criar tabela temporária
            CREATE TABLE relatorios_new (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                nome VARCHAR(255) NOT NULL,
                area VARCHAR(100) NOT NULL,
                data DATE NOT NULL,
                turno VARCHAR(50) NOT NULL,
                quantidade_notas INTEGER DEFAULT 0,
                soma_volumes INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'aguardando_lancamento',
                observacoes TEXT,
                data_finalizacao TIMESTAMP WITH TIME ZONE,
                data_lancamento TIMESTAMP WITH TIME ZONE,
                numero_lancamento VARCHAR(100),
                responsavel_lancamento UUID REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Copiar dados existentes
            INSERT INTO relatorios_new (nome, area, data, turno, quantidade_notas, soma_volumes, status, data_finalizacao, created_at)
            SELECT 
                nome,
                area,
                TO_DATE(data, 'DD-MM-YYYY'),
                turno,
                quantidade_notas,
                soma_volumes,
                status,
                data_finalizacao,
                created_at
            FROM relatorios;
            
            -- Remover tabela antiga
            DROP TABLE relatorios;
            
            -- Renomear nova tabela
            ALTER TABLE relatorios_new RENAME TO relatorios;
            
            RAISE NOTICE 'Tabela relatorios convertida com sucesso para UUID';
        END IF;
    ELSE
        RAISE NOTICE 'Criando tabela relatorios...';
        
        CREATE TABLE relatorios (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nome VARCHAR(255) NOT NULL,
            area VARCHAR(100) NOT NULL,
            data DATE NOT NULL,
            turno VARCHAR(50) NOT NULL,
            quantidade_notas INTEGER DEFAULT 0,
            soma_volumes INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'aguardando_lancamento',
            observacoes TEXT,
            data_finalizacao TIMESTAMP WITH TIME ZONE,
            data_lancamento TIMESTAMP WITH TIME ZONE,
            numero_lancamento VARCHAR(100),
            responsavel_lancamento UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabela relatorios criada com sucesso';
    END IF;
END $$;

-- 9. Criar tabelas auxiliares se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carro_itens') THEN
        CREATE TABLE carro_itens (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            carro_id UUID REFERENCES carros_embalagem(id),
            nota_fiscal_id UUID REFERENCES notas_fiscais(id),
            quantidade INTEGER DEFAULT 1,
            status VARCHAR(50) DEFAULT 'valida',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela carro_itens criada com sucesso';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relatorio_colaboradores') THEN
        CREATE TABLE relatorio_colaboradores (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            relatorio_id UUID REFERENCES relatorios(id),
            user_id UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela relatorio_colaboradores criada com sucesso';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relatorio_notas') THEN
        CREATE TABLE relatorio_notas (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            relatorio_id UUID REFERENCES relatorios(id),
            nota_fiscal_id UUID REFERENCES notas_fiscais(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela relatorio_notas criada com sucesso';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        CREATE TABLE activity_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id),
            action VARCHAR(100) NOT NULL,
            table_name VARCHAR(100),
            record_id UUID,
            details JSONB,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela activity_logs criada com sucesso';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') THEN
        CREATE TABLE system_config (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            key VARCHAR(255) UNIQUE NOT NULL,
            value TEXT,
            description TEXT,
            updated_by UUID REFERENCES users(id),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela system_config criada com sucesso';
    END IF;
END $$;

-- 10. Verificar estrutura final
DO $$
BEGIN
    RAISE NOTICE 'Verificando estrutura final das tabelas...';
END $$;

-- Listar todas as tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'users', 'sessions', 'notas_fiscais', 'divergencias', 
        'carros_embalagem', 'carro_itens', 'inventario', 
        'relatorios', 'relatorio_colaboradores', 'relatorio_notas',
        'activity_logs', 'system_config'
    )
ORDER BY table_name;

-- Verificar tipos das colunas principais
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
    AND t.table_name IN ('sessions', 'notas_fiscais')
    AND c.column_name IN ('id', 'session_id')
ORDER BY t.table_name, c.column_name;

-- Finalizar com mensagens de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Script de correção executado com sucesso!';
    RAISE NOTICE 'Agora você pode executar o database-schema-complete.sql sem problemas.';
END $$;
