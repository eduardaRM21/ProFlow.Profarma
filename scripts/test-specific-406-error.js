#!/usr/bin/env node

/**
 * Script para testar o erro 406 específico
 * 
 * Este script testa a URL específica que está causando o erro 406
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração direta do Supabase
const supabaseUrl = 'https://ehqxboqxtubeumaupjeq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXhib3F4dHViZXVtYXVwamVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzcyODQsImV4cCI6MjA3NDMxMzI4NH0.Er0IuDQeEtJ6AzFua_BAPFkcG_rmgg35QgdF0gpfwWw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarErro406Especifico() {
  try {
    console.log('🔍 Testando o erro 406 específico...')
    
    // URL que está causando o erro 406
    const sessionId = 'recebimento_Alexsandro_2025-10-20_A'
    
    console.log(`\n📋 Testando consulta com session_id: ${sessionId}`)
    
    // Teste 1: Consulta exata como no erro
    console.log('\n🔍 Teste 1: Consulta exata (como no erro 406)')
    const { data: data1, error: error1 } = await supabase
      .from('notas_bipadas')
      .select('id, numero_nf, session_id, area_origem, timestamp_bipagem')
      .eq('session_id', sessionId)
      .eq('area_origem', 'recebimento')
    
    if (error1) {
      console.error('❌ Erro 1:', error1)
      console.error('🔍 Detalhes:', {
        message: error1.message,
        details: error1.details,
        hint: error1.hint,
        code: error1.code,
        status: error1.status,
        statusText: error1.statusText
      })
    } else {
      console.log('✅ Consulta 1 funcionou. Registros:', data1?.length || 0)
      if (data1 && data1.length > 0) {
        console.log('📄 Dados:', data1.slice(0, 2))
      }
    }
    
    // Teste 2: Consulta com select específico (como no erro)
    console.log('\n🔍 Teste 2: Consulta com select específico')
    const { data: data2, error: error2 } = await supabase
      .from('notas_bipadas')
      .select('id, numero_nf, session_id, area_origem, timestamp_bipagem, status, volumes, destino, fornecedor, cliente_destino, tipo_carga, observacoes, divergencia, created_at, updated_at')
      .eq('session_id', sessionId)
      .eq('area_origem', 'recebimento')
    
    if (error2) {
      console.error('❌ Erro 2:', error2)
      console.error('🔍 Detalhes:', {
        message: error2.message,
        details: error2.details,
        hint: error2.hint,
        code: error2.code,
        status: error2.status,
        statusText: error2.statusText
      })
    } else {
      console.log('✅ Consulta 2 funcionou. Registros:', data2?.length || 0)
    }
    
    // Teste 3: Consulta com filtros adicionais
    console.log('\n🔍 Teste 3: Consulta com filtros adicionais')
    const { data: data3, error: error3 } = await supabase
      .from('notas_bipadas')
      .select('*')
      .eq('session_id', sessionId)
      .eq('area_origem', 'recebimento')
      .order('timestamp_bipagem', { ascending: false })
    
    if (error3) {
      console.error('❌ Erro 3:', error3)
      console.error('🔍 Detalhes:', {
        message: error3.message,
        details: error3.details,
        hint: error3.hint,
        code: error3.code,
        status: error3.status,
        statusText: error3.statusText
      })
    } else {
      console.log('✅ Consulta 3 funcionou. Registros:', data3?.length || 0)
    }
    
    // Teste 4: Verificar se há problemas com caracteres especiais
    console.log('\n🔍 Teste 4: Verificar caracteres especiais no session_id')
    const sessionIdEncoded = encodeURIComponent(sessionId)
    console.log(`Session ID original: ${sessionId}`)
    console.log(`Session ID codificado: ${sessionIdEncoded}`)
    
    // Teste 5: Consulta com session_id codificado
    console.log('\n🔍 Teste 5: Consulta com session_id codificado')
    const { data: data5, error: error5 } = await supabase
      .from('notas_bipadas')
      .select('id, numero_nf, session_id')
      .eq('session_id', sessionIdEncoded)
      .eq('area_origem', 'recebimento')
    
    if (error5) {
      console.error('❌ Erro 5:', error5)
    } else {
      console.log('✅ Consulta 5 funcionou. Registros:', data5?.length || 0)
    }
    
    // Teste 6: Verificar se há problemas com a tabela
    console.log('\n🔍 Teste 6: Verificar estrutura da tabela')
    const { data: data6, error: error6 } = await supabase
      .from('notas_bipadas')
      .select('*')
      .limit(1)
    
    if (error6) {
      console.error('❌ Erro 6:', error6)
    } else {
      console.log('✅ Estrutura da tabela OK')
      if (data6 && data6.length > 0) {
        console.log('📄 Campos disponíveis:', Object.keys(data6[0]))
      }
    }
    
    // Teste 7: Verificar se há problemas com RLS
    console.log('\n🔍 Teste 7: Verificar RLS')
    const { data: data7, error: error7 } = await supabase
      .from('notas_bipadas')
      .select('count', { count: 'exact', head: true })
    
    if (error7) {
      console.error('❌ Erro 7 (RLS):', error7)
    } else {
      console.log('✅ RLS OK. Total de registros:', data7?.length || 0)
    }
    
    // Resumo
    console.log('\n📊 RESUMO DOS TESTES:')
    console.log('✅ Consulta exata:', error1 ? 'FALHOU' : 'PASSOU')
    console.log('✅ Consulta com select específico:', error2 ? 'FALHOU' : 'PASSOU')
    console.log('✅ Consulta com filtros adicionais:', error3 ? 'FALHOU' : 'PASSOU')
    console.log('✅ Consulta com session_id codificado:', error5 ? 'FALHOU' : 'PASSOU')
    console.log('✅ Estrutura da tabela:', error6 ? 'FALHOU' : 'PASSOU')
    console.log('✅ RLS:', error7 ? 'FALHOU' : 'PASSOU')
    
    // Diagnóstico
    if (error1 || error2 || error3) {
      console.log('\n🔍 DIAGNÓSTICO:')
      console.log('O erro 406 está ocorrendo em consultas específicas')
      console.log('Possíveis causas:')
      console.log('1. Problema com caracteres especiais no session_id')
      console.log('2. Problema com a estrutura da consulta')
      console.log('3. Problema com RLS ou permissões')
      console.log('4. Problema com índices ou constraints')
      
      console.log('\n💡 SOLUÇÕES:')
      console.log('1. Verificar se o session_id está sendo codificado corretamente')
      console.log('2. Simplificar a consulta')
      console.log('3. Verificar políticas RLS')
      console.log('4. Executar o script fix-notas-bipadas-406-error.sql')
    } else {
      console.log('\n✅ TODOS OS TESTES PASSARAM!')
      console.log('O erro 406 pode estar relacionado a:')
      console.log('1. Timing da aplicação')
      console.log('2. Múltiplas requisições simultâneas')
      console.log('3. Problema específico do contexto da aplicação')
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Executar os testes
testarErro406Especifico()
