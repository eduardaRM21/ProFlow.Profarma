#!/usr/bin/env node

/**
 * Script para limpar referências órfãs na tabela relatorio_notas
 * 
 * Este script identifica e remove registros na tabela relatorio_notas
 * que referenciam notas fiscais que não existem mais na tabela notas_fiscais
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function limparReferenciasOrfas() {
  try {
    console.log('🔍 Iniciando limpeza de referências órfãs...')
    
    // 1. Buscar todas as referências na tabela relatorio_notas
    const { data: relatorioNotas, error: errorRelatorioNotas } = await supabase
      .from('relatorio_notas')
      .select('nota_fiscal_id')
    
    if (errorRelatorioNotas) {
      console.error('❌ Erro ao buscar relatorio_notas:', errorRelatorioNotas)
      return
    }
    
    console.log(`📊 Total de referências em relatorio_notas: ${relatorioNotas.length}`)
    
    // 2. Buscar todas as notas fiscais existentes
    const { data: notasFiscais, error: errorNotasFiscais } = await supabase
      .from('notas_fiscais')
      .select('id')
    
    if (errorNotasFiscais) {
      console.error('❌ Erro ao buscar notas_fiscais:', errorNotasFiscais)
      return
    }
    
    console.log(`📊 Total de notas fiscais existentes: ${notasFiscais.length}`)
    
    // 3. Identificar referências órfãs
    const idsNotasExistentes = new Set(notasFiscais.map(n => n.id))
    const referenciasOrfas = relatorioNotas.filter(rn => !idsNotasExistentes.has(rn.nota_fiscal_id))
    
    console.log(`⚠️ Referências órfãs encontradas: ${referenciasOrfas.length}`)
    
    if (referenciasOrfas.length === 0) {
      console.log('✅ Nenhuma referência órfã encontrada!')
      return
    }
    
    // 4. Mostrar algumas referências órfãs como exemplo
    console.log('🔍 Exemplos de referências órfãs:')
    referenciasOrfas.slice(0, 5).forEach((ref, index) => {
      console.log(`   ${index + 1}. ${ref.nota_fiscal_id}`)
    })
    
    // 5. Confirmar limpeza
    console.log('\n⚠️ ATENÇÃO: Esta operação irá remover as referências órfãs permanentemente!')
    console.log('Para confirmar, execute: node scripts/limpar-referencias-orfas.js --confirm')
    
    if (process.argv.includes('--confirm')) {
      // 6. Remover referências órfãs
      const idsOrfas = referenciasOrfas.map(ref => ref.nota_fiscal_id)
      
      const { error: errorDelete } = await supabase
        .from('relatorio_notas')
        .delete()
        .in('nota_fiscal_id', idsOrfas)
      
      if (errorDelete) {
        console.error('❌ Erro ao remover referências órfãs:', errorDelete)
        return
      }
      
      console.log(`✅ ${referenciasOrfas.length} referências órfãs removidas com sucesso!`)
    } else {
      console.log('💡 Execute com --confirm para realizar a limpeza')
    }
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error)
  }
}

// Executar o script
limparReferenciasOrfas()
