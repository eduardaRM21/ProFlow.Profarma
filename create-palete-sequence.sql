-- Criar sequência para códigos de palete únicos e curtos
CREATE SEQUENCE IF NOT EXISTS wms_palete_codigo_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Função para gerar código de palete único e curto
-- Formato: PAL-XXXXX (onde XXXXX é um número sequencial)
-- Exemplo: PAL-00001, PAL-00002, PAL-00010, etc.
CREATE OR REPLACE FUNCTION gerar_codigo_palete()
RETURNS TEXT AS $$
DECLARE
  proximo_numero BIGINT;
  codigo TEXT;
  codigo_existe BOOLEAN;
BEGIN
  LOOP
    -- Obter próximo número da sequência
    proximo_numero := nextval('wms_palete_codigo_seq');
    
    -- Gerar código no formato PAL-XXXXX (5 dígitos, preenchido com zeros à esquerda)
    codigo := 'PAL-' || LPAD(proximo_numero::TEXT, 5, '0');
    
    -- Verificar se o código já existe (caso raro, mas possível)
    SELECT EXISTS(SELECT 1 FROM wms_paletes WHERE codigo_palete = codigo) INTO codigo_existe;
    
    -- Se o código não existe, retornar
    EXIT WHEN NOT codigo_existe;
    
    -- Se existir, tentar novamente com o próximo número
  END LOOP;
  
  RETURN codigo;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON SEQUENCE wms_palete_codigo_seq IS 'Sequência para gerar códigos únicos de paletes';
COMMENT ON FUNCTION gerar_codigo_palete() IS 'Gera código único de palete no formato PAL-XXXXX';

-- Exemplo de uso:
-- SELECT gerar_codigo_palete(); -- Retorna: PAL-00001, PAL-00002, etc.

