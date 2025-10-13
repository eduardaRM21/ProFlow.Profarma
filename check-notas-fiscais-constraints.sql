-- Script para verificar constraints da tabela notas_fiscais
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela existe
SELECT 'Tabela notas_fiscais existe' as status, COUNT(*) as total_registros
FROM notas_fiscais;

-- 2. Verificar constraints únicos na tabela
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notas_fiscais'::regclass 
AND contype IN ('u', 'p'); -- 'u' = unique, 'p' = primary key

-- 3. Verificar índices únicos
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'notas_fiscais' 
AND indexdef LIKE '%UNIQUE%';

-- 4. Verificar se numero_nf tem constraint único
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'notas_fiscais' 
AND column_name = 'numero_nf';
