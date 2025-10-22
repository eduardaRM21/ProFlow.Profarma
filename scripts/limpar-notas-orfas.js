#!/usr/bin/env node

/**
 * Script para limpar notas órfãs da tabela relatorio_notas
 * Remove referências para notas fiscais que não existem mais
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase (usar variáveis de ambiente ou fallback)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ehqxboqxtubeumaupjeq.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXhib3F4dHViZXVtYXVwamVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzcyODQsImV4cCI6MjA3NDMxMzI4NH0.Er0IuDQeEtJ6AzFua_BAPFkcG_rmgg35QgdF0gpfwWw'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configuração do Supabase não encontrada')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function limparNotasOrfas() {
  try {
    console.log('🔍 Iniciando limpeza de notas órfãs...')
    
    // 1. Buscar todas as referências na tabela relatorio_notas
    console.log('📋 Buscando referências na tabela relatorio_notas...')
    const { data: relatorioNotas, error: relatorioError } = await supabase
      .from('relatorio_notas')
      .select('nota_fiscal_id, relatorio_id')
    
    if (relatorioError) {
      console.error('❌ Erro ao buscar relatorio_notas:', relatorioError)
      return
    }
    
    if (!relatorioNotas || relatorioNotas.length === 0) {
      console.log('✅ Nenhuma referência encontrada na tabela relatorio_notas')
      return
    }
    
    console.log(`📊 Encontradas ${relatorioNotas.length} referências`)
    
    // 2. Buscar todas as notas fiscais existentes
    console.log('📋 Buscando notas fiscais existentes...')
    const { data: notasFiscais, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id')
    
    if (notasError) {
      console.error('❌ Erro ao buscar notas_fiscais:', notasError)
      return
    }
    
    const idsExistentes = new Set(notasFiscais?.map(n => n.id) || [])
    console.log(`📊 Encontradas ${idsExistentes.size} notas fiscais existentes`)
    
    // 3. Identificar referências órfãs
    const referenciasOrfas = relatorioNotas.filter(rn => !idsExistentes.has(rn.nota_fiscal_id))
    
    if (referenciasOrfas.length === 0) {
      console.log('✅ Nenhuma referência órfã encontrada')
      return
    }
    
    console.log(`⚠️ Encontradas ${referenciasOrfas.length} referências órfãs`)
    
    // 4. Agrupar por relatório para relatório
    const orfasPorRelatorio = {}
    referenciasOrfas.forEach(ref => {
      if (!orfasPorRelatorio[ref.relatorio_id]) {
        orfasPorRelatorio[ref.relatorio_id] = []
      }
      orfasPorRelatorio[ref.relatorio_id].push(ref.nota_fiscal_id)
    })
    
    console.log('📊 Referências órfãs por relatório:')
    Object.entries(orfasPorRelatorio).forEach(([relatorioId, notas]) => {
      console.log(`   Relatório ${relatorioId}: ${notas.length} notas órfãs`)
    })
    
    // 5. Confirmar limpeza
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const resposta = await new Promise((resolve) => {
      rl.question(`\n🗑️ Deseja remover ${referenciasOrfas.length} referências órfãs? (s/N): `, resolve)
    })
    
    rl.close()
    
    if (resposta.toLowerCase() !== 's' && resposta.toLowerCase() !== 'sim') {
      console.log('❌ Operação cancelada pelo usuário')
      return
    }
    
    // 6. Remover referências órfãs
    console.log('🧹 Removendo referências órfãs...')
    
    const notaIdsOrfas = referenciasOrfas.map(ref => ref.nota_fiscal_id)
    
    const { error: deleteError } = await supabase
      .from('relatorio_notas')
      .delete()
      .in('nota_fiscal_id', notaIdsOrfas)
    
    if (deleteError) {
      console.error('❌ Erro ao remover referências órfãs:', deleteError)
      return
    }
    
    console.log(`✅ ${referenciasOrfas.length} referências órfãs removidas com sucesso!`)
    
    // 7. Relatório final
    console.log('\n📊 Relatório final:')
    console.log(`   Referências removidas: ${referenciasOrfas.length}`)
    console.log(`   Relatórios afetados: ${Object.keys(orfasPorRelatorio).length}`)
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error)
  }
}

async function verificarIntegridade() {
  try {
    console.log('🔍 Verificando integridade dos dados...')
    
    // Buscar relatórios com referências órfãs
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome')
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    console.log(`📊 Verificando ${relatorios.length} relatórios...`)
    
    let totalOrfas = 0
    
    for (const relatorio of relatorios) {
      // Buscar referências do relatório
      const { data: refs, error: refsError } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', relatorio.id)
      
      if (refsError) continue
      
      if (!refs || refs.length === 0) continue
      
      // Verificar quais existem
      const notaIds = refs.map(r => r.nota_fiscal_id)
      const { data: notasExistentes, error: notasError } = await supabase
        .from('notas_fiscais')
        .select('id')
        .in('id', notaIds)
      
      if (notasError) continue
      
      const idsExistentes = new Set(notasExistentes?.map(n => n.id) || [])
      const orfas = notaIds.filter(id => !idsExistentes.has(id))
      
      if (orfas.length > 0) {
        console.log(`⚠️ Relatório ${relatorio.nome} (${relatorio.id}): ${orfas.length} referências órfãs`)
        totalOrfas += orfas.length
      }
    }
    
    if (totalOrfas === 0) {
      console.log('✅ Nenhuma referência órfã encontrada')
    } else {
      console.log(`⚠️ Total de referências órfãs: ${totalOrfas}`)
    }
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error)
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2)
  const comando = args[0]
  
  switch (comando) {
    case 'verificar':
    case 'check':
      await verificarIntegridade()
      break
    case 'limpar':
    case 'clean':
      await limparNotasOrfas()
      break
    default:
      console.log('🔧 Script de limpeza de notas órfãs')
      console.log('')
      console.log('Uso:')
      console.log('  node scripts/limpar-notas-orfas.js verificar  - Verificar integridade')
      console.log('  node scripts/limpar-notas-orfas.js limpar    - Limpar referências órfãs')
      console.log('')
      console.log('Exemplos:')
      console.log('  npm run limpar-orfas:check')
      console.log('  npm run limpar-orfas:clean')
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { limparNotasOrfas, verificarIntegridade }
