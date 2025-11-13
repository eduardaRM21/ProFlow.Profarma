#!/usr/bin/env node

/**
 * Script para investigar notas misturadas entre relatórios
 * Verifica se as notas estão associadas aos relatórios corretos
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

async function investigarNotasMisturadas() {
  try {
    console.log('🔍 Investigando notas misturadas entre relatórios...')
    
    // 1. Buscar relatórios específicos mencionados
    console.log('\n📋 1. Buscando relatórios específicos...')
    
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome, data, turno, area, quantidade_notas')
      .order('created_at', { ascending: false })
      .limit(20) // Últimos 20 relatórios
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    console.log(`📊 Encontrados ${relatorios.length} relatórios`)
    
    // 2. Para cada relatório, verificar as notas associadas
    console.log('\n📋 2. Verificando notas associadas a cada relatório...')
    
    for (const relatorio of relatorios) {
      console.log(`\n🔍 Relatório: ${relatorio.nome} (${relatorio.data} - ${relatorio.turno})`)
      console.log(`   Quantidade esperada: ${relatorio.quantidade_notas}`)
      
      // Buscar notas associadas a este relatório
      const { data: relatorioNotas, error: relatorioNotasError } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', relatorio.id)
      
      if (relatorioNotasError) {
        console.error(`   ❌ Erro ao buscar notas:`, relatorioNotasError)
        continue
      }
      
      const notasAssociadas = relatorioNotas?.length || 0
      console.log(`   Notas associadas: ${notasAssociadas}`)
      
      if (notasAssociadas > 0) {
        // Buscar detalhes das notas fiscais
        const notaIds = relatorioNotas.map(rn => rn.nota_fiscal_id)
        const { data: notasFiscais, error: notasError } = await supabase
          .from('notas_fiscais')
          .select('id, numero_nf, data, fornecedor, destino')
          .in('id', notaIds)
          .limit(5) // Apenas as primeiras 5 para análise
        
        if (notasError) {
          console.error(`   ❌ Erro ao buscar detalhes das notas:`, notasError)
          continue
        }
        
        if (notasFiscais && notasFiscais.length > 0) {
          console.log(`   📋 Primeiras notas encontradas:`)
          notasFiscais.forEach((nota, index) => {
            console.log(`      ${index + 1}. NF: ${nota.numero_nf} | Data: ${nota.data} | Fornecedor: ${nota.fornecedor} | Destino: ${nota.destino}`)
          })
          
          // Verificar se as datas das notas coincidem com a data do relatório
          const notasComDataDiferente = notasFiscais.filter(nota => nota.data !== relatorio.data)
          if (notasComDataDiferente.length > 0) {
            console.log(`   ⚠️ ATENÇÃO: ${notasComDataDiferente.length} notas com data diferente do relatório!`)
            notasComDataDiferente.forEach(nota => {
              console.log(`      ❌ NF ${nota.numero_nf}: Data da nota (${nota.data}) ≠ Data do relatório (${relatorio.data})`)
            })
          } else {
            console.log(`   ✅ Todas as notas têm a mesma data do relatório`)
          }
        }
      }
    }
    
    // 3. Verificar se há notas duplicadas entre relatórios
    console.log('\n📋 3. Verificando notas duplicadas entre relatórios...')
    
    const { data: todasRelatorioNotas, error: todasNotasError } = await supabase
      .from('relatorio_notas')
      .select('relatorio_id, nota_fiscal_id')
    
    if (todasNotasError) {
      console.error('❌ Erro ao buscar todas as notas:', todasNotasError)
      return
    }
    
    // Agrupar por nota_fiscal_id para encontrar duplicatas
    const notasPorId = {}
    todasRelatorioNotas.forEach(rn => {
      if (!notasPorId[rn.nota_fiscal_id]) {
        notasPorId[rn.nota_fiscal_id] = []
      }
      notasPorId[rn.nota_fiscal_id].push(rn.relatorio_id)
    })
    
    // Encontrar notas que aparecem em múltiplos relatórios
    const notasDuplicadas = Object.entries(notasPorId).filter(([notaId, relatorios]) => relatorios.length > 1)
    
    if (notasDuplicadas.length > 0) {
      console.log(`⚠️ Encontradas ${notasDuplicadas.length} notas duplicadas entre relatórios:`)
      
      for (const [notaId, relatorios] of notasDuplicadas.slice(0, 10)) { // Mostrar apenas as primeiras 10
        console.log(`\n   📋 Nota ${notaId} aparece em ${relatorios.length} relatórios:`)
        
        // Buscar detalhes da nota
        const { data: notaDetalhes, error: notaError } = await supabase
          .from('notas_fiscais')
          .select('numero_nf, data, fornecedor')
          .eq('id', notaId)
          .single()
        
        if (notaDetalhes) {
          console.log(`      NF: ${notaDetalhes.numero_nf} | Data: ${notaDetalhes.data} | Fornecedor: ${notaDetalhes.fornecedor}`)
        }
        
        // Buscar detalhes dos relatórios
        const { data: relatoriosDetalhes, error: relatoriosError } = await supabase
          .from('relatorios')
          .select('id, nome, data, turno')
          .in('id', relatorios)
        
        if (relatoriosDetalhes) {
          relatoriosDetalhes.forEach(rel => {
            console.log(`      📊 Relatório: ${rel.nome} (${rel.data} - ${rel.turno})`)
          })
        }
      }
      
      if (notasDuplicadas.length > 10) {
        console.log(`\n   ... e mais ${notasDuplicadas.length - 10} notas duplicadas`)
      }
    } else {
      console.log(`✅ Nenhuma nota duplicada encontrada entre relatórios`)
    }
    
    // 4. Verificar se há notas órfãs (notas fiscais sem relatório)
    console.log('\n📋 4. Verificando notas órfãs...')
    
    const { data: todasNotasFiscais, error: todasNotasFiscaisError } = await supabase
      .from('notas_fiscais')
      .select('id, numero_nf, data')
      .limit(100)
    
    if (todasNotasFiscaisError) {
      console.error('❌ Erro ao buscar notas fiscais:', todasNotasFiscaisError)
      return
    }
    
    const notasComRelatorio = new Set(todasRelatorioNotas.map(rn => rn.nota_fiscal_id))
    const notasOrfas = todasNotasFiscais.filter(nota => !notasComRelatorio.has(nota.id))
    
    if (notasOrfas.length > 0) {
      console.log(`⚠️ Encontradas ${notasOrfas.length} notas órfãs (sem relatório):`)
      notasOrfas.slice(0, 10).forEach(nota => {
        console.log(`   📋 NF: ${nota.numero_nf} | Data: ${nota.data}`)
      })
      
      if (notasOrfas.length > 10) {
        console.log(`   ... e mais ${notasOrfas.length - 10} notas órfãs`)
      }
    } else {
      console.log(`✅ Nenhuma nota órfã encontrada`)
    }
    
    // 5. Relatório final
    console.log('\n📊 RELATÓRIO FINAL:')
    console.log('=' .repeat(50))
    console.log(`📋 Relatórios analisados: ${relatorios.length}`)
    console.log(`📋 Total de associações: ${todasRelatorioNotas.length}`)
    console.log(`📋 Notas duplicadas: ${notasDuplicadas.length}`)
    console.log(`📋 Notas órfãs: ${notasOrfas.length}`)
    
    if (notasDuplicadas.length > 0) {
      console.log('\n⚠️ PROBLEMA DETECTADO:')
      console.log('   - Notas aparecem em múltiplos relatórios')
      console.log('   - Isso pode causar confusão e dados incorretos')
      console.log('   - Recomenda-se limpar as duplicatas')
    } else {
      console.log('\n✅ NENHUM PROBLEMA DE MISTURA DETECTADO')
      console.log('   - Todas as notas estão associadas corretamente')
      console.log('   - Não há duplicatas entre relatórios')
    }
    
  } catch (error) {
    console.error('❌ Erro durante a investigação:', error)
  }
}

// Função principal
async function main() {
  await investigarNotasMisturadas()
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { investigarNotasMisturadas }
