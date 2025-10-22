#!/usr/bin/env node

/**
 * Script para verificar e recuperar notas perdidas da tabela relatorio_notas
 * Este script ajuda a identificar e corrigir problemas de perda de dados
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

async function verificarNotasPerdidas() {
  try {
    console.log('🔍 Verificando notas perdidas na tabela relatorio_notas...')
    
    // 1. Buscar todos os relatórios
    console.log('📋 Buscando relatórios...')
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome, data, turno, area, quantidade_notas')
      .order('created_at', { ascending: false })
      .limit(50) // Últimos 50 relatórios
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    console.log(`📊 Encontrados ${relatorios.length} relatórios`)
    
    // 2. Verificar cada relatório
    let relatoriosComProblemas = 0
    let totalNotasPerdidas = 0
    
    for (const relatorio of relatorios) {
      console.log(`\n🔍 Verificando relatório: ${relatorio.nome} (${relatorio.data} - ${relatorio.turno})`)
      
      // Buscar notas associadas ao relatório
      const { data: relatorioNotas, error: relatorioNotasError } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', relatorio.id)
      
      if (relatorioNotasError) {
        console.error(`❌ Erro ao buscar notas do relatório ${relatorio.id}:`, relatorioNotasError)
        continue
      }
      
      const notasAssociadas = relatorioNotas?.length || 0
      const quantidadeEsperada = relatorio.quantidade_notas || 0
      
      console.log(`   📊 Notas associadas: ${notasAssociadas}`)
      console.log(`   📊 Quantidade esperada: ${quantidadeEsperada}`)
      
      if (notasAssociadas === 0 && quantidadeEsperada > 0) {
        console.log(`   ⚠️ PROBLEMA: Relatório sem notas associadas!`)
        relatoriosComProblemas++
        totalNotasPerdidas += quantidadeEsperada
      } else if (notasAssociadas < quantidadeEsperada) {
        console.log(`   ⚠️ PROBLEMA: Relatório com menos notas do que esperado!`)
        relatoriosComProblemas++
        totalNotasPerdidas += (quantidadeEsperada - notasAssociadas)
      } else {
        console.log(`   ✅ Relatório OK`)
      }
    }
    
    // 3. Relatório final
    console.log('\n📊 RELATÓRIO FINAL:')
    console.log(`   Relatórios verificados: ${relatorios.length}`)
    console.log(`   Relatórios com problemas: ${relatoriosComProblemas}`)
    console.log(`   Total de notas perdidas estimadas: ${totalNotasPerdidas}`)
    
    if (relatoriosComProblemas > 0) {
      console.log('\n⚠️ PROBLEMAS DETECTADOS:')
      console.log('   - Alguns relatórios não têm notas associadas na tabela relatorio_notas')
      console.log('   - Isso pode indicar que as notas foram removidas incorretamente')
      console.log('   - Recomenda-se verificar os logs do sistema para identificar a causa')
    } else {
      console.log('\n✅ NENHUM PROBLEMA DETECTADO')
      console.log('   - Todos os relatórios têm suas notas associadas corretamente')
    }
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error)
  }
}

async function verificarNotasOrfas() {
  try {
    console.log('🔍 Verificando referências órfãs na tabela relatorio_notas...')
    
    // Buscar todas as referências na tabela relatorio_notas
    const { data: relatorioNotas, error: relatorioNotasError } = await supabase
      .from('relatorio_notas')
      .select('nota_fiscal_id, relatorio_id')
    
    if (relatorioNotasError) {
      console.error('❌ Erro ao buscar relatorio_notas:', relatorioNotasError)
      return
    }
    
    if (!relatorioNotas || relatorioNotas.length === 0) {
      console.log('✅ Nenhuma referência encontrada na tabela relatorio_notas')
      return
    }
    
    console.log(`📊 Encontradas ${relatorioNotas.length} referências`)
    
    // Buscar todas as notas fiscais existentes
    const { data: notasFiscais, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id')
    
    if (notasError) {
      console.error('❌ Erro ao buscar notas_fiscais:', notasError)
      return
    }
    
    const idsExistentes = new Set(notasFiscais?.map(n => n.id) || [])
    console.log(`📊 Encontradas ${idsExistentes.size} notas fiscais existentes`)
    
    // Identificar referências órfãs
    const referenciasOrfas = relatorioNotas.filter(rn => !idsExistentes.has(rn.nota_fiscal_id))
    
    if (referenciasOrfas.length === 0) {
      console.log('✅ Nenhuma referência órfã encontrada')
    } else {
      console.log(`⚠️ Encontradas ${referenciasOrfas.length} referências órfãs`)
      
      // Agrupar por relatório
      const orfasPorRelatorio = {}
      referenciasOrfas.forEach(ref => {
        if (!orfasPorRelatorio[ref.relatorio_id]) {
          orfasPorRelatorio[ref.relatorio_id] = []
        }
        orfasPorRelatorio[ref.relatorio_id].push(ref.nota_fiscal_id)
      })
      
      console.log('📊 Referências órfãs por relatório:')
      Object.entries(orfasPorRelatorio).forEach(([relatorioId, notas]) => {
        console.log(`   Relatório ${relatorioId}: ${notas.length} referências órfãs`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro durante a verificação de órfãs:', error)
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2)
  const comando = args[0]
  
  switch (comando) {
    case 'verificar':
    case 'check':
      await verificarNotasPerdidas()
      break
    case 'orfas':
    case 'orphans':
      await verificarNotasOrfas()
      break
    case 'completo':
    case 'full':
      await verificarNotasPerdidas()
      console.log('\n' + '='.repeat(50) + '\n')
      await verificarNotasOrfas()
      break
    default:
      console.log('🔧 Script de verificação de notas perdidas')
      console.log('')
      console.log('Uso:')
      console.log('  node scripts/verificar-notas-perdidas.js verificar  - Verificar relatórios sem notas')
      console.log('  node scripts/verificar-notas-perdidas.js orfas     - Verificar referências órfãs')
      console.log('  node scripts/verificar-notas-perdidas.js completo  - Verificação completa')
      console.log('')
      console.log('Exemplos:')
      console.log('  npm run verificar-notas:check')
      console.log('  npm run verificar-notas:orfas')
      console.log('  npm run verificar-notas:completo')
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { verificarNotasPerdidas, verificarNotasOrfas }
