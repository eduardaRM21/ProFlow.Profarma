#!/usr/bin/env node

/**
 * Script para recuperar dados dos relatórios
 * Tenta recriar os relacionamentos na tabela relatorio_notas usando dados disponíveis
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

async function recuperarDadosRelatorios() {
  try {
    console.log('🔄 Iniciando recuperação de dados dos relatórios...')
    
    // 1. Buscar todos os relatórios
    console.log('\n📋 1. Buscando relatórios...')
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome, data, turno, area, quantidade_notas')
      .order('created_at', { ascending: false })
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    console.log(`📊 Encontrados ${relatorios.length} relatórios`)
    
    // 2. Buscar todas as notas fiscais disponíveis
    console.log('\n📋 2. Buscando notas fiscais...')
    const { data: notasFiscais, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id, numero_nf, data, status')
      .order('created_at', { ascending: false })
    
    if (notasError) {
      console.error('❌ Erro ao buscar notas fiscais:', notasError)
      return
    }
    
    console.log(`📊 Encontradas ${notasFiscais.length} notas fiscais`)
    
    // 3. Buscar histórico de bipagem
    console.log('\n📋 3. Buscando histórico de bipagem...')
    const { data: notasBipadas, error: notasBipadasError } = await supabase
      .from('notas_bipadas')
      .select('numero_nf, data, area_origem, created_at')
      .order('created_at', { ascending: false })
    
    if (notasBipadasError) {
      console.error('❌ Erro ao buscar notas_bipadas:', notasBipadasError)
    } else {
      console.log(`📊 Encontradas ${notasBipadas?.length || 0} notas no histórico de bipagem`)
    }
    
    // 4. Estratégia de recuperação por data
    console.log('\n🔄 4. Iniciando recuperação por data...')
    
    let totalRecuperadas = 0
    let totalRelatoriosProcessados = 0
    let totalRelatoriosRecuperados = 0
    
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
    
    // Processar cada data
    for (const [data, relatoriosDaData] of Object.entries(relatoriosPorData)) {
      console.log(`\n📅 Processando data: ${data}`)
      console.log(`   Relatórios: ${relatoriosDaData.length}`)
      
      const notasDaData = notasPorData[data] || []
      console.log(`   Notas disponíveis: ${notasDaData.length}`)
      
      if (notasDaData.length === 0) {
        console.log(`   ⚠️ Nenhuma nota disponível para esta data`)
        continue
      }
      
      // Processar cada relatório da data
      for (const relatorio of relatoriosDaData) {
        totalRelatoriosProcessados++
        console.log(`\n   🔍 Processando relatório: ${relatorio.nome}`)
        console.log(`      Quantidade esperada: ${relatorio.quantidade_notas}`)
        
        // Estratégia 1: Tentar associar notas por data e área
        let notasAssociadas = []
        
        // Filtrar notas que podem pertencer a este relatório
        const notasCandidatas = notasDaData.filter(nota => {
          // Verificar se a nota não está já associada a outro relatório
          return nota.data === relatorio.data
        })
        
        console.log(`      Notas candidatas: ${notasCandidatas.length}`)
        
        // Limitar ao número esperado de notas
        const notasParaAssociar = notasCandidatas.slice(0, relatorio.quantidade_notas)
        
        if (notasParaAssociar.length > 0) {
          console.log(`      Associando ${notasParaAssociar.length} notas...`)
          
          // Criar relacionamentos na tabela relatorio_notas
          const relacionamentos = notasParaAssociar.map(nota => ({
            relatorio_id: relatorio.id,
            nota_fiscal_id: nota.id
          }))
          
          try {
            // Inserir relacionamentos individualmente para evitar erros
            let inseridos = 0
            for (const relacionamento of relacionamentos) {
              const { error: insertError } = await supabase
                .from('relatorio_notas')
                .insert(relacionamento)
              
              if (insertError) {
                console.log(`         ⚠️ Erro ao inserir relacionamento: ${insertError.message}`)
              } else {
                inseridos++
              }
            }
            
            if (inseridos > 0) {
              totalRecuperadas += inseridos
              totalRelatoriosRecuperados++
              console.log(`      ✅ ${inseridos} notas associadas com sucesso`)
            } else {
              console.log(`      ❌ Nenhuma nota foi associada`)
            }
            
          } catch (error) {
            console.log(`      ❌ Erro ao associar notas: ${error.message}`)
          }
        } else {
          console.log(`      ⚠️ Nenhuma nota candidata encontrada`)
        }
      }
    }
    
    // 5. Relatório final
    console.log('\n📊 RELATÓRIO FINAL DE RECUPERAÇÃO:')
    console.log('=' .repeat(50))
    console.log(`📋 Relatórios processados: ${totalRelatoriosProcessados}`)
    console.log(`📋 Relatórios recuperados: ${totalRelatoriosRecuperados}`)
    console.log(`📋 Total de notas recuperadas: ${totalRecuperadas}`)
    console.log(`📋 Taxa de sucesso: ${totalRelatoriosProcessados > 0 ? Math.round((totalRelatoriosRecuperados / totalRelatoriosProcessados) * 100) : 0}%`)
    
    if (totalRecuperadas > 0) {
      console.log('\n✅ RECUPERAÇÃO CONCLUÍDA COM SUCESSO!')
      console.log('   - Alguns dados foram recuperados')
      console.log('   - Execute "npm run verificar-notas:completo" para verificar')
    } else {
      console.log('\n⚠️ RECUPERAÇÃO LIMITADA')
      console.log('   - Poucos dados puderam ser recuperados')
      console.log('   - Recomenda-se verificar outras fontes de backup')
    }
    
  } catch (error) {
    console.error('❌ Erro durante a recuperação:', error)
  }
}

async function recuperarPorHistoricoBipagem() {
  try {
    console.log('🔄 Tentando recuperação via histórico de bipagem...')
    
    // Buscar histórico de bipagem
    const { data: notasBipadas, error: notasBipadasError } = await supabase
      .from('notas_bipadas')
      .select('numero_nf, data, area_origem, created_at')
      .order('created_at', { ascending: false })
    
    if (notasBipadasError) {
      console.error('❌ Erro ao buscar histórico de bipagem:', notasBipadasError)
      return
    }
    
    console.log(`📊 Encontradas ${notasBipadas?.length || 0} notas no histórico`)
    
    if (!notasBipadas || notasBipadas.length === 0) {
      console.log('⚠️ Nenhuma nota encontrada no histórico de bipagem')
      return
    }
    
    // Buscar relatórios
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome, data, turno, area, quantidade_notas')
      .order('created_at', { ascending: false })
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    // Agrupar por data
    const relatoriosPorData = {}
    relatorios.forEach(rel => {
      if (!relatoriosPorData[rel.data]) {
        relatoriosPorData[rel.data] = []
      }
      relatoriosPorData[rel.data].push(rel)
    })
    
    const notasBipadasPorData = {}
    notasBipadas.forEach(nota => {
      if (!notasBipadasPorData[nota.data]) {
        notasBipadasPorData[nota.data] = []
      }
      notasBipadasPorData[nota.data].push(nota)
    })
    
    let totalRecuperadas = 0
    
    // Processar cada data
    for (const [data, relatoriosDaData] of Object.entries(relatoriosPorData)) {
      const notasBipadasDaData = notasBipadasPorData[data] || []
      
      if (notasBipadasDaData.length === 0) continue
      
      console.log(`\n📅 Data ${data}: ${relatoriosDaData.length} relatórios, ${notasBipadasDaData.length} notas bipadas`)
      
      // Para cada relatório, tentar associar notas bipadas
      for (const relatorio of relatoriosDaData) {
        const notasParaRelatorio = notasBipadasDaData.slice(0, relatorio.quantidade_notas)
        
        if (notasParaRelatorio.length > 0) {
          console.log(`   📋 Relatório ${relatorio.nome}: associando ${notasParaRelatorio.length} notas`)
          
          // Buscar IDs das notas fiscais correspondentes
          const numeroNfs = notasParaRelatorio.map(n => n.numero_nf)
          const { data: notasFiscais, error: notasError } = await supabase
            .from('notas_fiscais')
            .select('id, numero_nf')
            .in('numero_nf', numeroNfs)
          
          if (notasError) {
            console.log(`      ❌ Erro ao buscar notas fiscais: ${notasError.message}`)
            continue
          }
          
          if (notasFiscais && notasFiscais.length > 0) {
            // Criar relacionamentos
            const relacionamentos = notasFiscais.map(nota => ({
              relatorio_id: relatorio.id,
              nota_fiscal_id: nota.id
            }))
            
            let inseridos = 0
            for (const relacionamento of relacionamentos) {
              const { error: insertError } = await supabase
                .from('relatorio_notas')
                .insert(relacionamento)
              
              if (!insertError) {
                inseridos++
              }
            }
            
            totalRecuperadas += inseridos
            console.log(`      ✅ ${inseridos} notas associadas`)
          }
        }
      }
    }
    
    console.log(`\n📊 Total recuperado via histórico: ${totalRecuperadas} notas`)
    
  } catch (error) {
    console.error('❌ Erro na recuperação via histórico:', error)
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2)
  const comando = args[0]
  
  switch (comando) {
    case 'historico':
    case 'bipagem':
      await recuperarPorHistoricoBipagem()
      break
    case 'completo':
    case 'full':
      await recuperarDadosRelatorios()
      console.log('\n' + '='.repeat(50) + '\n')
      await recuperarPorHistoricoBipagem()
      break
    default:
      await recuperarDadosRelatorios()
      break
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { recuperarDadosRelatorios, recuperarPorHistoricoBipagem }
