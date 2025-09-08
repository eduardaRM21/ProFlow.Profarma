-- =====================================================
-- SCRIPT PARA CONFIGURAR USUÁRIOS COM SENHAS
-- Setores: custos, crdk, admin-embalagem
-- =====================================================

-- Verificar se a tabela auth_users existe
-- Se não existir, criar a tabela
CREATE TABLE IF NOT EXISTS auth_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario VARCHAR(255) NOT NULL UNIQUE,
    area VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    senha_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir usuários de teste para cada setor
-- Senhas padrão: "123456" (hash: 1a2b3c4d5e6f)

-- Usuários para setor CUSTOS
INSERT INTO auth_users (usuario, area, ativo, senha_hash) VALUES
('admin_custos', 'custos', true, '1a2b3c4d5e6f'),
('gerente_custos', 'custos', true, '1a2b3c4d5e6f'),
('analista_custos', 'custos', true, '1a2b3c4d5e6f')
ON CONFLICT (usuario) DO UPDATE SET
    area = EXCLUDED.area,
    ativo = EXCLUDED.ativo,
    senha_hash = EXCLUDED.senha_hash,
    updated_at = NOW();

-- Usuários para setor CRDK
INSERT INTO auth_users (usuario, area, ativo, senha_hash) VALUES
('admin_crdk', 'crdk', true, '1a2b3c4d5e6f'),
('supervisor_crdk', 'crdk', true, '1a2b3c4d5e6f'),
('operador_crdk', 'crdk', true, '1a2b3c4d5e6f')
ON CONFLICT (usuario) DO UPDATE SET
    area = EXCLUDED.area,
    ativo = EXCLUDED.ativo,
    senha_hash = EXCLUDED.senha_hash,
    updated_at = NOW();

-- Usuários para setor ADMIN-EMBALAGEM
INSERT INTO auth_users (usuario, area, ativo, senha_hash) VALUES
('admin_embalagem', 'admin-embalagem', true, '1a2b3c4d5e6f'),
('supervisor_embalagem', 'admin-embalagem', true, '1a2b3c4d5e6f'),
('coordenador_embalagem', 'admin-embalagem', true, '1a2b3c4d5e6f')
ON CONFLICT (usuario) DO UPDATE SET
    area = EXCLUDED.area,
    ativo = EXCLUDED.ativo,
    senha_hash = EXCLUDED.senha_hash,
    updated_at = NOW();

-- Verificar usuários inseridos
SELECT 
    usuario,
    area,
    ativo,
    created_at
FROM auth_users 
ORDER BY area, usuario;

-- Comentários sobre as senhas
-- Senha padrão para todos os usuários: "123456"
-- Hash gerado: "1a2b3c4d5e6f"
-- 
-- Para alterar senhas, use o AuthService.createPasswordHash() no código
-- ou gere novos hashes e atualize diretamente no banco
