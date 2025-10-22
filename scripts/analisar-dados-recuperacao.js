#!/usr/bin/env node

/**
 * Script para analisar dados disponíveis para recuperação
 * Verifica se as notas fiscais ainda existem e podem ser recuperadas
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ehqxboqxtubeumaupjeq.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXhib3F4dHViZXVtYXVwamVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzcyODQsImV4cCI6MjA3NDMxMzI4NH0.Er0IuDQeEtJ6AzFua_BAPFkcG_rmgg35QgdF0gpfwWw'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configuração do Supabase não encontrada')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function analisarDadosRecuperacao() {
  try {
    console.log('🔍 Analisando dados disponíveis para recuperação...')
    
    // 1. Verificar relatórios existentes
    console.log('\n📋 1. ANALISANDO RELATÓRIOS...')
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome, data, turno, area, quantidade_notas, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    console.log(`📊 Total de relatórios encontrados: ${relatorios.length}`)
    
    // 2. Verificar notas fiscais existentes
    console.log('\n📋 2. ANALISANDO NOTAS FISCAIS...')
    const { data: notasFiscais, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id, numero_nf, data, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (notasError) {
      console.error('❌ Erro ao buscar notas fiscais:', notasError)
      return
    }
    
    console.log(`📊 Total de notas fiscais encontradas: ${notasFiscais.length}`)
    
    // 3. Verificar tabela relatorio_notas (deve estar vazia)
    console.log('\n📋 3. ANALISANDO TABELA RELATORIO_NOTAS...')
    const { data: relatorioNotas, error: relatorioNotasError } = await supabase
      .from('relatorio_notas')
      .select('*')
      .limit(10)
    
    if (relatorioNotasError) {
      console.error('❌ Erro ao buscar relatorio_notas:', relatorioNotasError)
      return
    }
    
    console.log(`📊 Registros na tabela relatorio_notas: ${relatorioNotas?.length || 0}`)
    
    // 4. Verificar notas_bipadas (histórico de bipagem)
    console.log('\n📋 4. ANALISANDO HISTÓRICO DE BIPAGEM...')
    const { data: notasBipadas, error: notasBipadasError } = await supabase
      .from('notas_bipadas')
      .select('numero_nf, data, area_origem, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (notasBipadasError) {
      console.error('❌ Erro ao buscar notas_bipadas:', notasBipadasError)
    } else {
      console.log(`📊 Total de notas bipadas no histórico: ${notasBipadas?.length || 0}`)
    }
    
    // 5. Análise de compatibilidade de datas
    console.log('\n📋 5. ANÁLISE DE COMPATIBILIDADE...')
    
    if (relatorios.length > 0 && notasFiscais.length > 0) {
      // Agrupar relatórios por data
      const relatoriosPorData = {}
      relatorios.forEach(rel => {
        if (!relatoriosPorData[rel.data]) {
          relatoriosPorData[rel.data] = []
        }
        relatoriosPorData[rel.data].push(rel)
      })
      
      // Agrupar notas por data
      const notasPorData = {}
      notasFiscais.forEach(nota => {
        if (!notasPorData[nota.data]) {
          notasPorData[nota.data] = []
        }
        notasPorData[nota.data].push(nota)
      })
      
      console.log('📊 Relatórios por data:')
      Object.entries(relatoriosPorData).forEach(([data, rels]) => {
        const notasNaData = notasPorData[data]?.length || 0
        const totalNotasEsperadas = rels.reduce((sum, r) => sum + (r.quantidade_notas || 0), 0)
        console.log(`   ${data}: ${rels.length} relatórios, ${notasNaData} notas disponíveis, ${totalNotasEsperadas} notas esperadas`)
      })
    }
    
    // 6. Verificar se há dados no campo 'notas' dos relatórios
    console.log('\n📋 6. VERIFICANDO DADOS EM MEMÓRIA DOS RELATÓRIOS...')
    let relatoriosComNotasEmMemoria = 0
    let totalNotasEmMemoria = 0
    
    for (const relatorio of relatorios.slice(0, 10)) { // Verificar apenas os primeiros 10
      if (relatorio.notas && Array.isArray(relatorio.notas) && relatorio.notas.length > 0) {
        relatoriosComNotasEmMemoria++
        totalNotasEmMemoria += relatorio.notas.length
        console.log(`   ✅ Relatório ${relatorio.nome}: ${relatorio.notas.length} notas em memória`)
      }
    }
    
    console.log(`📊 Relatórios com notas em memória: ${relatoriosComNotasEmMemoria}`)
    console.log(`📊 Total de notas em memória: ${totalNotasEmMemoria}`)
    
    // 7. Relatório final de viabilidade
    console.log('\n📊 RELATÓRIO DE VIABILIDADE DE RECUPERAÇÃO:')
    console.log('=' .repeat(60))
    
    const totalRelatorios = relatorios.length
    const totalNotasFiscais = notasFiscais.length
    const totalNotasBipadas = notasBipadas?.length || 0
    const totalNotasEsperadas = relatorios.reduce((sum, r) => sum + (r.quantidade_notas || 0), 0)
    
    console.log(`📋 Relatórios afetados: ${totalRelatorios}`)
    console.log(`📋 Notas fiscais disponíveis: ${totalNotasFiscais}`)
    console.log(`📋 Notas no histórico de bipagem: ${totalNotasBipadas}`)
    console.log(`📋 Total de notas esperadas: ${totalNotasEsperadas}`)
    console.log(`📋 Notas em memória dos relatórios: ${totalNotasEmMemoria}`)
    
    // Determinar viabilidade
    let viabilidade = 'BAIXA'
    let estrategia = 'Recuperação limitada'
    
    if (totalNotasFiscais > 0 && totalNotasFiscais >= totalNotasEsperadas * 0.8) {
      viabilidade = 'ALTA'
      estrategia = 'Recuperação completa via notas_fiscais'
    } else if (totalNotasBipadas > 0 && totalNotasBipadas >= totalNotasEsperadas * 0.8) {
      viabilidade = 'MÉDIA'
      estrategia = 'Recuperação via histórico de bipagem'
    } else if (totalNotasEmMemoria > 0) {
      viabilidade = 'MÉDIA'
      estrategia = 'Recuperação via dados em memória dos relatórios'
    }
    
    console.log(`\n🎯 VIABILIDADE: ${viabilidade}`)
    console.log(`🎯 ESTRATÉGIA RECOMENDADA: ${estrategia}`)
    
    if (viabilidade === 'ALTA') {
      console.log('\n✅ RECUPERAÇÃO RECOMENDADA:')
      console.log('   - As notas fiscais estão disponíveis')
      console.log('   - Pode-se recriar os relacionamentos na tabela relatorio_notas')
      console.log('   - Alta probabilidade de sucesso')
    } else if (viabilidade === 'MÉDIA') {
      console.log('\n⚠️ RECUPERAÇÃO PARCIAL POSSÍVEL:')
      console.log('   - Alguns dados estão disponíveis')
      console.log('   - Recuperação parcial pode ser realizada')
      console.log('   - Recomenda-se análise mais detalhada')
    } else {
      console.log('\n❌ RECUPERAÇÃO LIMITADA:')
      console.log('   - Poucos dados disponíveis para recuperação')
      console.log('   - Recomenda-se verificar backups externos')
      console.log('   - Foco em prevenção de futuras perdas')
    }
    
  } catch (error) {
    console.error('❌ Erro durante a análise:', error)
  }
}

// Função principal
async function main() {
  await analisarDadosRecuperacao()
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { analisarDadosRecuperacao }
