-- Adicionar novas colunas nas tabelas embalagem_notas_bipadas e carros_status
-- para armazenar posições, palletes, gaiolas e caixas_mangas

-- 1. Adicionar colunas na tabela embalagem_notas_bipadas
ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS posicoes INTEGER;

ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS palletes INTEGER;

ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS gaiolas INTEGER;

ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS caixas_mangas INTEGER;

-- 2. Adicionar colunas na tabela carros_status
ALTER TABLE carros_status 
ADD COLUMN IF NOT EXISTS posicoes INTEGER;

ALTER TABLE carros_status 
ADD COLUMN IF NOT EXISTS palletes INTEGER;

ALTER TABLE carros_status 
ADD COLUMN IF NOT EXISTS gaiolas INTEGER;

ALTER TABLE carros_status 
ADD COLUMN IF NOT EXISTS caixas_mangas INTEGER;

-- 3. Verificar se as colunas foram criadas na tabela embalagem_notas_bipadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'embalagem_notas_bipadas' 
AND column_name IN ('posicoes', 'palletes', 'gaiolas', 'caixas_mangas')
ORDER BY column_name;

-- 4. Verificar se as colunas foram criadas na tabela carros_status
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'carros_status' 
AND column_name IN ('posicoes', 'palletes', 'gaiolas', 'caixas_mangas')
ORDER BY column_name;

-- 5. Comentários das novas colunas na tabela embalagem_notas_bipadas
COMMENT ON COLUMN embalagem_notas_bipadas.posicoes IS 'Quantidade de posições utilizadas no carro';
COMMENT ON COLUMN embalagem_notas_bipadas.palletes IS 'Quantidade de palletes utilizados no carro';
COMMENT ON COLUMN embalagem_notas_bipadas.gaiolas IS 'Quantidade de gaiolas utilizadas no carro';
COMMENT ON COLUMN embalagem_notas_bipadas.caixas_mangas IS 'Quantidade de caixas manga utilizadas no carro';

-- 6. Comentários das novas colunas na tabela carros_status
COMMENT ON COLUMN carros_status.posicoes IS 'Quantidade de posições utilizadas no carro';
COMMENT ON COLUMN carros_status.palletes IS 'Quantidade de palletes utilizados no carro';
COMMENT ON COLUMN carros_status.gaiolas IS 'Quantidade de gaiolas utilizadas no carro';
COMMENT ON COLUMN carros_status.caixas_mangas IS 'Quantidade de caixas manga utilizadas no carro';
