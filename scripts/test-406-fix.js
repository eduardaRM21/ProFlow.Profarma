#!/usr/bin/env node

/**
 * Script para testar a correção do erro 406
 * Simula a consulta que estava falhando
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ehqxboqxtubeumaupjeq.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXhib3F4dHViZXVtYXVwamVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzcyODQsImV4cCI6MjA3NDMxMzI4NH0.Er0IuDQeEtJ6AzFua_BAPFkcG_rmgg35QgdF0gpfwWw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarConsultaOriginal() {
  console.log('🧪 Testando consulta original (que causava erro 406)...')
  
  try {
    const { data, error } = await supabase
      .from('notas_bipadas')
      .select('id, numero_nf, timestamp_bipagem, session_id')
      .eq('numero_nf', '000025237')
      .eq('session_id', 'recebimento_Jennefer_2025-10-21_A')
      .eq('area_origem', 'recebimento')
      .single()
    
    if (error) {
      console.log('❌ Erro (esperado):', error.message, '- Status:', error.status)
      return false
    } else {
      console.log('✅ Sucesso (inesperado):', data)
      return true
    }
  } catch (err) {
    console.log('❌ Exceção:', err.message)
    return false
  }
}

async function testarConsultaCorrigida() {
  console.log('🧪 Testando consulta corrigida (sem .single())...')
  
  try {
    const { data, error } = await supabase
      .from('notas_bipadas')
      .select('id, numero_nf, timestamp_bipagem, session_id')
      .eq('numero_nf', '000025237')
      .eq('session_id', 'recebimento_Jennefer_2025-10-21_A')
      .eq('area_origem', 'recebimento')
      .limit(1)
    
    if (error) {
      console.log('❌ Erro:', error.message, '- Status:', error.status)
      return false
    } else {
      console.log('✅ Sucesso:', data?.[0] || 'Nenhum resultado encontrado')
      return true
    }
  } catch (err) {
    console.log('❌ Exceção:', err.message)
    return false
  }
}

async function testarConsultaGenerica() {
  console.log('🧪 Testando consulta genérica (verificar se tabela existe)...')
  
  try {
    const { data, error } = await supabase
      .from('notas_bipadas')
      .select('id, numero_nf, timestamp_bipagem, session_id')
      .limit(5)
    
    if (error) {
      console.log('❌ Erro:', error.message, '- Status:', error.status)
      return false
    } else {
      console.log('✅ Sucesso:', data?.length || 0, 'registros encontrados')
      if (data && data.length > 0) {
        console.log('📋 Exemplo de dados:', data[0])
      }
      return true
    }
  } catch (err) {
    console.log('❌ Exceção:', err.message)
    return false
  }
}

async function testarRetrySimulado() {
  console.log('🧪 Testando retry simulado...')
  
  let tentativas = 0
  const maxTentativas = 3
  
  while (tentativas < maxTentativas) {
    tentativas++
    console.log(`🔄 Tentativa ${tentativas}/${maxTentativas}`)
    
    try {
      const { data, error } = await supabase
        .from('notas_bipadas')
        .select('id, numero_nf, timestamp_bipagem, session_id')
        .eq('numero_nf', '000025237')
        .eq('session_id', 'recebimento_Jennefer_2025-10-21_A')
        .eq('area_origem', 'recebimento')
        .limit(1)
      
      if (error) {
        if (error.status === 406 && tentativas < maxTentativas) {
          console.log(`⚠️ Erro 406 na tentativa ${tentativas}, tentando novamente...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * tentativas))
          continue
        } else {
          console.log('❌ Erro final:', error.message, '- Status:', error.status)
          return false
        }
      } else {
        console.log('✅ Sucesso na tentativa', tentativas, ':', data?.[0] || 'Nenhum resultado')
        return true
      }
    } catch (err) {
      console.log('❌ Exceção na tentativa', tentativas, ':', err.message)
      if (tentativas < maxTentativas) {
        await new Promise(resolve => setTimeout(resolve, 1000 * tentativas))
      }
    }
  }
  
  return false
}

async function main() {
  console.log('🔧 Teste de Correção do Erro 406')
  console.log('=====================================')
  
  const resultados = {
    original: await testarConsultaOriginal(),
    corrigida: await testarConsultaCorrigida(),
    generica: await testarConsultaGenerica(),
    retry: await testarRetrySimulado()
  }
  
  console.log('\n📊 Resultados dos Testes:')
  console.log('========================')
  console.log('Consulta Original (.single()):', resultados.original ? '✅' : '❌')
  console.log('Consulta Corrigida (.limit(1)):', resultados.corrigida ? '✅' : '❌')
  console.log('Consulta Genérica:', resultados.generica ? '✅' : '❌')
  console.log('Retry Simulado:', resultados.retry ? '✅' : '❌')
  
  console.log('\n🎯 Conclusão:')
  if (resultados.corrigida && resultados.generica) {
    console.log('✅ Correção implementada com sucesso!')
    console.log('✅ Tabela notas_bipadas está acessível')
    console.log('✅ Consulta sem .single() funciona corretamente')
  } else {
    console.log('❌ Ainda há problemas com a consulta')
    console.log('❌ Verificar configuração do banco de dados')
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { testarConsultaOriginal, testarConsultaCorrigida, testarConsultaGenerica, testarRetrySimulado }
