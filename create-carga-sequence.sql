-- Criar sequência para códigos de carga únicos e curtos
CREATE SEQUENCE IF NOT EXISTS wms_carga_codigo_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Função para gerar código de carga único e curto
-- Formato: CAR-XXXXX (onde XXXXX é um número sequencial)
-- Exemplo: CAR-00001, CAR-00002, CAR-00010, etc.
CREATE OR REPLACE FUNCTION gerar_codigo_carga()
RETURNS TEXT AS $$
DECLARE
  proximo_numero BIGINT;
  codigo TEXT;
  codigo_existe BOOLEAN;
BEGIN
  LOOP
    -- Obter próximo número da sequência
    proximo_numero := nextval('wms_carga_codigo_seq');
    
    -- Gerar código no formato CAR-XXXXX (5 dígitos, preenchido com zeros à esquerda)
    codigo := 'CAR-' || LPAD(proximo_numero::TEXT, 5, '0');
    
    -- Verificar se o código já existe (caso raro, mas possível)
    SELECT EXISTS(SELECT 1 FROM wms_cargas WHERE codigo_carga = codigo) INTO codigo_existe;
    
    -- Se o código não existe, retornar
    EXIT WHEN NOT codigo_existe;
    
    -- Se existir, tentar novamente com o próximo número
  END LOOP;
  
  RETURN codigo;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON SEQUENCE wms_carga_codigo_seq IS 'Sequência para gerar códigos únicos de cargas';
COMMENT ON FUNCTION gerar_codigo_carga() IS 'Gera código único de carga no formato CAR-XXXXX';

-- Exemplo de uso:
-- SELECT gerar_codigo_carga(); -- Retorna: CAR-00001, CAR-00002, etc.

