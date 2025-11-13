#!/usr/bin/env node

/**
 * Script para corrigir notas misturadas entre relatórios
 * Remove duplicatas e mantém cada nota apenas no relatório correto
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

async function corrigirNotasMisturadas() {
  try {
    console.log('🔧 Iniciando correção de notas misturadas entre relatórios...')
    
    // 1. Buscar todas as associações
    console.log('\n📋 1. Buscando todas as associações...')
    const { data: todasRelatorioNotas, error: todasNotasError } = await supabase
      .from('relatorio_notas')
      .select('relatorio_id, nota_fiscal_id')
    
    if (todasNotasError) {
      console.error('❌ Erro ao buscar associações:', todasNotasError)
      return
    }
    
    console.log(`📊 Encontradas ${todasRelatorioNotas.length} associações`)
    
    // 2. Buscar detalhes dos relatórios
    console.log('\n📋 2. Buscando detalhes dos relatórios...')
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome, data, turno, area')
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    const relatoriosMap = new Map(relatorios.map(r => [r.id, r]))
    console.log(`📊 Encontrados ${relatorios.length} relatórios`)
    
    // 3. Buscar detalhes das notas fiscais
    console.log('\n📋 3. Buscando detalhes das notas fiscais...')
    const { data: notasFiscais, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id, numero_nf, data, fornecedor, destino')
    
    if (notasError) {
      console.error('❌ Erro ao buscar notas fiscais:', notasError)
      return
    }
    
    const notasMap = new Map(notasFiscais.map(n => [n.id, n]))
    console.log(`📊 Encontradas ${notasFiscais.length} notas fiscais`)
    
    // 4. Identificar duplicatas
    console.log('\n📋 4. Identificando duplicatas...')
    const notasPorId = {}
    todasRelatorioNotas.forEach(rn => {
      if (!notasPorId[rn.nota_fiscal_id]) {
        notasPorId[rn.nota_fiscal_id] = []
      }
      notasPorId[rn.nota_fiscal_id].push(rn.relatorio_id)
    })
    
    const notasDuplicadas = Object.entries(notasPorId).filter(([notaId, relatorios]) => relatorios.length > 1)
    console.log(`📊 Encontradas ${notasDuplicadas.length} notas duplicadas`)
    
    if (notasDuplicadas.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada. Sistema já está correto!')
      return
    }
    
    // 5. Estratégia de correção: manter nota no relatório mais específico
    console.log('\n🔧 5. Aplicando estratégia de correção...')
    
    let totalCorrigidas = 0
    let totalRemovidas = 0
    
    for (const [notaId, relatoriosIds] of notasDuplicadas) {
      const nota = notasMap.get(notaId)
      if (!nota) continue
      
      console.log(`\n🔍 Processando nota ${nota.numero_nf} (${nota.fornecedor})`)
      console.log(`   Aparece em ${relatoriosIds.length} relatórios`)
      
      // Buscar detalhes dos relatórios
      const relatoriosDetalhes = relatoriosIds.map(id => relatoriosMap.get(id)).filter(Boolean)
      
      // Estratégia: manter no relatório que tem o nome mais específico
      // Prioridade: 1) Nome específico da transportadora, 2) Data mais recente, 3) Primeiro criado
      let relatorioManter = null
      let melhorScore = -1
      
      for (const relatorio of relatoriosDetalhes) {
        let score = 0
        
        // Score baseado na especificidade do nome
        if (relatorio.nome.includes(nota.fornecedor?.toUpperCase() || '')) {
          score += 100 // Nome da transportadora coincide com fornecedor
        }
        
        // Score baseado na data (mais recente = melhor)
        const dataRelatorio = new Date(relatorio.data)
        score += dataRelatorio.getTime() / 1000000 // Normalizar timestamp
        
        // Score baseado no turno (A = melhor que B)
        if (relatorio.turno === 'A') score += 10
        
        if (score > melhorScore) {
          melhorScore = score
          relatorioManter = relatorio
        }
      }
      
      if (relatorioManter) {
        console.log(`   ✅ Mantendo no relatório: ${relatorioManter.nome} (${relatorioManter.data} - ${relatorioManter.turno})`)
        
        // Remover de todos os outros relatórios
        const relatoriosRemover = relatoriosIds.filter(id => id !== relatorioManter.id)
        
        for (const relatorioId of relatoriosRemover) {
          const relatorioRemover = relatoriosMap.get(relatorioId)
          console.log(`   🗑️ Removendo do relatório: ${relatorioRemover?.nome} (${relatorioRemover?.data} - ${relatorioRemover?.turno})`)
          
          const { error: deleteError } = await supabase
            .from('relatorio_notas')
            .delete()
            .eq('relatorio_id', relatorioId)
            .eq('nota_fiscal_id', notaId)
          
          if (deleteError) {
            console.error(`   ❌ Erro ao remover:`, deleteError)
          } else {
            totalRemovidas++
          }
        }
        
        totalCorrigidas++
      }
    }
    
    // 6. Relatório final
    console.log('\n📊 RELATÓRIO FINAL DA CORREÇÃO:')
    console.log('=' .repeat(50))
    console.log(`📋 Notas duplicadas processadas: ${totalCorrigidas}`)
    console.log(`📋 Associações removidas: ${totalRemovidas}`)
    
    if (totalCorrigidas > 0) {
      console.log('\n✅ CORREÇÃO CONCLUÍDA COM SUCESSO!')
      console.log('   - Notas duplicadas foram corrigidas')
      console.log('   - Cada nota agora aparece apenas no relatório correto')
      console.log('   - Execute "npm run investigar-misturadas" para verificar')
    } else {
      console.log('\n⚠️ NENHUMA CORREÇÃO FOI NECESSÁRIA')
      console.log('   - Sistema já estava correto')
    }
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error)
  }
}

async function corrigirPorFornecedor() {
  try {
    console.log('🔧 Aplicando correção por fornecedor...')
    
    // Buscar todas as associações
    const { data: todasRelatorioNotas, error: todasNotasError } = await supabase
      .from('relatorio_notas')
      .select('relatorio_id, nota_fiscal_id')
    
    if (todasNotasError) {
      console.error('❌ Erro ao buscar associações:', todasNotasError)
      return
    }
    
    // Buscar detalhes
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome, data, turno, area')
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    const { data: notasFiscais, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id, numero_nf, data, fornecedor, destino')
    
    if (notasError) {
      console.error('❌ Erro ao buscar notas fiscais:', notasError)
      return
    }
    
    const relatoriosMap = new Map(relatorios.map(r => [r.id, r]))
    const notasMap = new Map(notasFiscais.map(n => [n.id, n]))
    
    // Agrupar por fornecedor
    const notasPorFornecedor = {}
    todasRelatorioNotas.forEach(rn => {
      const nota = notasMap.get(rn.nota_fiscal_id)
      if (nota && nota.fornecedor) {
        const fornecedor = nota.fornecedor.toUpperCase().trim()
        if (!notasPorFornecedor[fornecedor]) {
          notasPorFornecedor[fornecedor] = []
        }
        notasPorFornecedor[fornecedor].push({
          notaId: rn.nota_fiscal_id,
          relatorioId: rn.relatorio_id,
          nota: nota
        })
      }
    })
    
    let totalCorrigidas = 0
    
    for (const [fornecedor, associacoes] of Object.entries(notasPorFornecedor)) {
      console.log(`\n🔍 Processando fornecedor: ${fornecedor}`)
      
      // Agrupar por relatório
      const relatoriosPorFornecedor = {}
      associacoes.forEach(assoc => {
        if (!relatoriosPorFornecedor[assoc.relatorioId]) {
          relatoriosPorFornecedor[assoc.relatorioId] = []
        }
        relatoriosPorFornecedor[assoc.relatorioId].push(assoc)
      })
      
      // Encontrar o relatório que tem o nome mais próximo do fornecedor
      let melhorRelatorio = null
      let melhorScore = -1
      
      for (const [relatorioId, notas] of Object.entries(relatoriosPorFornecedor)) {
        const relatorio = relatoriosMap.get(relatorioId)
        if (!relatorio) continue
        
        let score = 0
        
        // Score baseado na similaridade do nome
        const nomeRelatorio = relatorio.nome.toUpperCase()
        if (nomeRelatorio.includes(fornecedor)) {
          score += 100
        }
        
        // Score baseado na data
        const dataRelatorio = new Date(relatorio.data)
        score += dataRelatorio.getTime() / 1000000
        
        if (score > melhorScore) {
          melhorScore = score
          melhorRelatorio = relatorioId
        }
      }
      
      if (melhorRelatorio) {
        console.log(`   ✅ Melhor relatório: ${relatoriosMap.get(melhorRelatorio)?.nome}`)
        
        // Remover notas de outros relatórios
        for (const [relatorioId, notas] of Object.entries(relatoriosPorFornecedor)) {
          if (relatorioId !== melhorRelatorio) {
            const relatorio = relatoriosMap.get(relatorioId)
            console.log(`   🗑️ Removendo ${notas.length} notas do relatório: ${relatorio?.nome}`)
            
            for (const assoc of notas) {
              const { error: deleteError } = await supabase
                .from('relatorio_notas')
                .delete()
                .eq('relatorio_id', relatorioId)
                .eq('nota_fiscal_id', assoc.notaId)
              
              if (deleteError) {
                console.error(`   ❌ Erro ao remover:`, deleteError)
              }
            }
          }
        }
        
        totalCorrigidas++
      }
    }
    
    console.log(`\n✅ Correção por fornecedor concluída: ${totalCorrigidas} fornecedores processados`)
    
  } catch (error) {
    console.error('❌ Erro na correção por fornecedor:', error)
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2)
  const comando = args[0]
  
  switch (comando) {
    case 'fornecedor':
      await corrigirPorFornecedor()
      break
    default:
      await corrigirNotasMisturadas()
      break
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { corrigirNotasMisturadas, corrigirPorFornecedor }
