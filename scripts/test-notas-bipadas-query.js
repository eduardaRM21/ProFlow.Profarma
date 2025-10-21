#!/usr/bin/env node

/**
 * Script para testar consultas na tabela notas_bipadas
 * 
 * Este script testa as consultas que estão causando erro 406
 * para identificar e corrigir o problema
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração direta do Supabase (baseada no .env do projeto)
const supabaseUrl = 'https://ehqxboqxtubeumaupjeq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXhib3F4dHViZXVtYXVwamVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzcyODQsImV4cCI6MjA3NDMxMzI4NH0.Er0IuDQeEtJ6AzFua_BAPFkcG_rmgg35QgdF0gpfwWw'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configuração do Supabase não encontrada')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarConsultasNotasBipadas() {
  try {
    console.log('🔍 Iniciando testes de consultas na tabela notas_bipadas...')
    
    // Teste 1: Consulta simples
    console.log('\n📋 Teste 1: Consulta simples (COUNT)')
    const { data: countData, error: countError } = await supabase
      .from('notas_bipadas')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Erro na consulta simples:', countError)
    } else {
      console.log('✅ Consulta simples funcionou. Total de registros:', countData?.length || 0)
    }
    
    // Teste 2: Consulta com filtro de área
    console.log('\n📋 Teste 2: Consulta com filtro de área')
    const { data: areaData, error: areaError } = await supabase
      .from('notas_bipadas')
      .select('id, numero_nf, area_origem')
      .eq('area_origem', 'recebimento')
      .limit(5)
    
    if (areaError) {
      console.error('❌ Erro na consulta com filtro de área:', areaError)
    } else {
      console.log('✅ Consulta com filtro de área funcionou. Registros encontrados:', areaData?.length || 0)
      if (areaData && areaData.length > 0) {
        console.log('📄 Exemplos:', areaData.slice(0, 3))
      }
    }
    
    // Teste 3: Consulta com session_id (que está causando o erro 406)
    console.log('\n📋 Teste 3: Consulta com session_id (problema original)')
    const sessionId = 'recebimento_Alexsandro_2025-10-20_A'
    
    const { data: sessionData, error: sessionError } = await supabase
      .from('notas_bipadas')
      .select('id, numero_nf, session_id, area_origem')
      .eq('session_id', sessionId)
      .eq('area_origem', 'recebimento')
    
    if (sessionError) {
      console.error('❌ Erro na consulta com session_id:', sessionError)
      console.error('🔍 Detalhes do erro:', {
        message: sessionError.message,
        details: sessionError.details,
        hint: sessionError.hint,
        code: sessionError.code
      })
    } else {
      console.log('✅ Consulta com session_id funcionou. Registros encontrados:', sessionData?.length || 0)
      if (sessionData && sessionData.length > 0) {
        console.log('📄 Exemplos:', sessionData.slice(0, 3))
      }
    }
    
    // Teste 4: Consulta com IN (usado em outras partes do código)
    console.log('\n📋 Teste 4: Consulta com IN')
    const { data: inData, error: inError } = await supabase
      .from('notas_bipadas')
      .select('numero_nf')
      .eq('area_origem', 'recebimento')
      .in('numero_nf', ['NF001', 'NF002', 'NF003'])
    
    if (inError) {
      console.error('❌ Erro na consulta com IN:', inError)
    } else {
      console.log('✅ Consulta com IN funcionou. Registros encontrados:', inData?.length || 0)
    }
    
    // Teste 5: Verificar estrutura da tabela
    console.log('\n📋 Teste 5: Verificar estrutura da tabela')
    const { data: structureData, error: structureError } = await supabase
      .from('notas_bipadas')
      .select('*')
      .limit(1)
    
    if (structureError) {
      console.error('❌ Erro ao verificar estrutura:', structureError)
    } else {
      console.log('✅ Estrutura da tabela verificada')
      if (structureData && structureData.length > 0) {
        console.log('📄 Campos disponíveis:', Object.keys(structureData[0]))
      }
    }
    
    // Teste 6: Verificar session_ids existentes
    console.log('\n📋 Teste 6: Verificar session_ids existentes')
    const { data: sessionIdsData, error: sessionIdsError } = await supabase
      .from('notas_bipadas')
      .select('session_id')
      .eq('area_origem', 'recebimento')
      .limit(10)
    
    if (sessionIdsError) {
      console.error('❌ Erro ao verificar session_ids:', sessionIdsError)
    } else {
      console.log('✅ Session IDs encontrados:', sessionIdsData?.length || 0)
      if (sessionIdsData && sessionIdsData.length > 0) {
        const uniqueSessionIds = [...new Set(sessionIdsData.map(item => item.session_id))]
        console.log('📄 Session IDs únicos:', uniqueSessionIds.slice(0, 5))
      }
    }
    
    // Resumo dos testes
    console.log('\n📊 RESUMO DOS TESTES:')
    console.log('✅ Consulta simples:', countError ? 'FALHOU' : 'PASSOU')
    console.log('✅ Consulta com área:', areaError ? 'FALHOU' : 'PASSOU')
    console.log('✅ Consulta com session_id:', sessionError ? 'FALHOU' : 'PASSOU')
    console.log('✅ Consulta com IN:', inError ? 'FALHOU' : 'PASSOU')
    console.log('✅ Verificação de estrutura:', structureError ? 'FALHOU' : 'PASSOU')
    console.log('✅ Verificação de session_ids:', sessionIdsError ? 'FALHOU' : 'PASSOU')
    
    // Diagnóstico
    if (sessionError) {
      console.log('\n🔍 DIAGNÓSTICO DO ERRO 406:')
      console.log('O erro 406 está ocorrendo na consulta com session_id')
      console.log('Possíveis causas:')
      console.log('1. Políticas RLS muito restritivas')
      console.log('2. Problema com o formato do session_id')
      console.log('3. Problema com índices ou constraints')
      console.log('4. Problema com permissões de acesso')
      
      console.log('\n💡 SOLUÇÕES RECOMENDADAS:')
      console.log('1. Execute o script fix-notas-bipadas-406-error.sql')
      console.log('2. Desabilite RLS temporariamente: ALTER TABLE notas_bipadas DISABLE ROW LEVEL SECURITY;')
      console.log('3. Verifique se o session_id está no formato correto')
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado durante os testes:', error)
  }
}

// Executar os testes
testarConsultasNotasBipadas()
