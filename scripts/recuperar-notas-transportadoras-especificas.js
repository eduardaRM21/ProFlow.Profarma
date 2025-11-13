#!/usr/bin/env node

/**
 * Script para recuperar notas de transportadoras específicas que ficaram sem notas
 * após a correção de duplicatas
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

// Transportadoras específicas que precisam ser analisadas
const TRANSPORTADORAS_PROBLEMA = [
  '21/10/2025 - FAT LOG',
  '22/10/2025 - ANDREANI*',
  '22/10/2025 - ANDREANI',
  '22/10/2025 - DHL PERECIVEL',
  '22/10/2025 - SOLISTICA 2',
  '22/10/2025 - ATIVA',
  '22/10/2025 - SHUTTLE',
  '22/10/2025 - DHL',
  '22/10/2025 - AGIFLEX',
  '22/10/2025 - JOMED',
  '22/10/2025 - LUFT'
]

async function analisarTransportadorasProblema() {
  try {
    console.log('🔍 Analisando transportadoras com problemas...')
    
    // 1. Buscar relatórios específicos
    console.log('\n📋 1. Buscando relatórios específicos...')
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome, data, turno, area, quantidade_notas')
      .in('nome', TRANSPORTADORAS_PROBLEMA)
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    console.log(`📊 Encontrados ${relatorios.length} relatórios com problemas`)
    
    // 2. Para cada relatório, verificar situação atual
    console.log('\n📋 2. Analisando situação atual de cada relatório...')
    
    for (const relatorio of relatorios) {
      console.log(`\n🔍 Relatório: ${relatorio.nome}`)
      console.log(`   Quantidade esperada: ${relatorio.quantidade_notas}`)
      
      // Buscar notas atuais
      const { data: relatorioNotas, error: relatorioNotasError } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', relatorio.id)
      
      if (relatorioNotasError) {
        console.error(`   ❌ Erro ao buscar notas:`, relatorioNotasError)
        continue
      }
      
      const notasAtuais = relatorioNotas?.length || 0
      console.log(`   Notas atuais: ${notasAtuais}`)
      
      if (notasAtuais === 0) {
        console.log(`   ⚠️ RELATÓRIO VAZIO - precisa de recuperação`)
      } else if (notasAtuais < relatorio.quantidade_notas) {
        console.log(`   ⚠️ RELATÓRIO INCOMPLETO - faltam ${relatorio.quantidade_notas - notasAtuais} notas`)
      } else {
        console.log(`   ✅ Relatório OK`)
        continue
      }
      
      // 3. Buscar notas fiscais da mesma data para recuperação
      console.log(`   🔍 Buscando notas fiscais da data ${relatorio.data}...`)
      
      const { data: notasFiscais, error: notasError } = await supabase
        .from('notas_fiscais')
        .select('id, numero_nf, data, fornecedor, destino, volumes')
        .eq('data', relatorio.data)
        .limit(50)
      
      if (notasError) {
        console.error(`   ❌ Erro ao buscar notas fiscais:`, notasError)
        continue
      }
      
      console.log(`   📊 Encontradas ${notasFiscais.length} notas fiscais da data ${relatorio.data}`)
      
      // 4. Buscar notas bipadas da mesma data
      const { data: notasBipadas, error: notasBipadasError } = await supabase
        .from('notas_bipadas')
        .select('id, numero_nf, data, fornecedor, destino, volumes')
        .eq('data', relatorio.data)
        .limit(50)
      
      if (notasBipadasError) {
        console.error(`   ❌ Erro ao buscar notas bipadas:`, notasBipadasError)
        continue
      }
      
      console.log(`   📊 Encontradas ${notasBipadas.length} notas bipadas da data ${relatorio.data}`)
      
      // 5. Tentar encontrar notas que podem pertencer a este relatório
      const notasCandidatas = []
      
      // Buscar em notas bipadas por padrões
      const notasBipadasCandidatas = notasBipadas.filter(nb => {
        const fornecedor = nb.fornecedor?.toLowerCase() || ''
        const nomeRelatorio = relatorio.nome.toLowerCase()
        
        // Lógica de correspondência baseada no nome da transportadora
        if (nomeRelatorio.includes('fat log') && fornecedor.includes('procter')) return true
        if (nomeRelatorio.includes('andreani') && fornecedor.includes('abbott')) return true
        if (nomeRelatorio.includes('dhl') && (fornecedor.includes('ems') || fornecedor.includes('prati'))) return true
        if (nomeRelatorio.includes('solistica') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('ativa') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('shuttle') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('agiflex') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('jomed') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('luft') && fornecedor.includes('prati')) return true
        
        return false
      })
      
      if (notasBipadasCandidatas.length > 0) {
        console.log(`   🎯 Encontradas ${notasBipadasCandidatas.length} notas bipadas candidatas`)
        notasCandidatas.push(...notasBipadasCandidatas)
      }
      
      // Buscar em notas fiscais por padrões do nome da transportadora
      const nomeRelatorio = relatorio.nome.toLowerCase()
      const notasFiscaisCandidatas = notasFiscais.filter(nf => {
        const fornecedor = nf.fornecedor?.toLowerCase() || ''
        const destino = nf.destino?.toLowerCase() || ''
        
        // Lógica de correspondência baseada no nome da transportadora
        if (nomeRelatorio.includes('fat log') && fornecedor.includes('procter')) return true
        if (nomeRelatorio.includes('andreani') && fornecedor.includes('abbott')) return true
        if (nomeRelatorio.includes('dhl') && (fornecedor.includes('ems') || fornecedor.includes('prati'))) return true
        if (nomeRelatorio.includes('solistica') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('ativa') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('shuttle') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('agiflex') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('jomed') && fornecedor.includes('prati')) return true
        if (nomeRelatorio.includes('luft') && fornecedor.includes('prati')) return true
        
        return false
      })
      
      if (notasFiscaisCandidatas.length > 0) {
        console.log(`   🎯 Encontradas ${notasFiscaisCandidatas.length} notas fiscais candidatas`)
        notasCandidatas.push(...notasFiscaisCandidatas)
      }
      
      // 6. Mostrar candidatas encontradas
      if (notasCandidatas.length > 0) {
        console.log(`   📋 Notas candidatas encontradas:`)
        notasCandidatas.slice(0, 5).forEach((nota, index) => {
          console.log(`      ${index + 1}. NF: ${nota.numero_nf} | Fornecedor: ${nota.fornecedor} | Destino: ${nota.destino}`)
        })
        
        if (notasCandidatas.length > 5) {
          console.log(`      ... e mais ${notasCandidatas.length - 5} notas`)
        }
      } else {
        console.log(`   ❌ Nenhuma nota candidata encontrada`)
      }
    }
    
    // 7. Relatório final
    console.log('\n📊 RELATÓRIO FINAL:')
    console.log('=' .repeat(50))
    
    let relatoriosVazios = 0
    let relatoriosIncompletos = 0
    
    for (const relatorio of relatorios) {
      const { data: relatorioNotas } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', relatorio.id)
      
      const notasAtuais = relatorioNotas?.length || 0
      
      if (notasAtuais === 0) {
        relatoriosVazios++
      } else if (notasAtuais < relatorio.quantidade_notas) {
        relatoriosIncompletos++
      }
    }
    
    console.log(`📋 Relatórios analisados: ${relatorios.length}`)
    console.log(`📋 Relatórios vazios: ${relatoriosVazios}`)
    console.log(`📋 Relatórios incompletos: ${relatoriosIncompletos}`)
    console.log(`📋 Relatórios OK: ${relatorios.length - relatoriosVazios - relatoriosIncompletos}`)
    
    if (relatoriosVazios > 0 || relatoriosIncompletos > 0) {
      console.log('\n⚠️ AÇÃO NECESSÁRIA:')
      console.log('   - Alguns relatórios precisam de recuperação de notas')
      console.log('   - Execute o script de recuperação específica')
    } else {
      console.log('\n✅ TODOS OS RELATÓRIOS ESTÃO OK')
    }
    
  } catch (error) {
    console.error('❌ Erro durante a análise:', error)
  }
}

async function recuperarNotasTransportadoras() {
  try {
    console.log('🔧 Iniciando recuperação de notas para transportadoras específicas...')
    
    // Buscar relatórios vazios
    const { data: relatorios, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('id, nome, data, turno, area, quantidade_notas')
      .in('nome', TRANSPORTADORAS_PROBLEMA)
    
    if (relatoriosError) {
      console.error('❌ Erro ao buscar relatórios:', relatoriosError)
      return
    }
    
    let totalRecuperadas = 0
    
    for (const relatorio of relatorios) {
      console.log(`\n🔍 Processando: ${relatorio.nome}`)
      
      // Verificar se está vazio
      const { data: relatorioNotas } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', relatorio.id)
      
      const notasAtuais = relatorioNotas?.length || 0
      
      if (notasAtuais > 0) {
        console.log(`   ✅ Já tem ${notasAtuais} notas - pulando`)
        continue
      }
      
      // Buscar notas bipadas da mesma data
      const { data: notasBipadas, error: notasBipadasError } = await supabase
        .from('notas_bipadas')
        .select('id, numero_nf, data, fornecedor, destino, volumes')
        .eq('data', relatorio.data)
        .limit(50)
      
      if (notasBipadasError) {
        console.error(`   ❌ Erro ao buscar notas bipadas:`, notasBipadasError)
        continue
      }
      
      if (notasBipadas && notasBipadas.length > 0) {
        console.log(`   🎯 Encontradas ${notasBipadas.length} notas bipadas da data`)
        
        // Filtrar notas bipadas candidatas baseado no nome da transportadora
        const nomeRelatorio = relatorio.nome.toLowerCase()
        const notasBipadasCandidatas = notasBipadas.filter(nb => {
          const fornecedor = nb.fornecedor?.toLowerCase() || ''
          
          // Lógica de correspondência baseada no nome da transportadora
          if (nomeRelatorio.includes('fat log') && fornecedor.includes('procter')) return true
          if (nomeRelatorio.includes('andreani') && fornecedor.includes('abbott')) return true
          if (nomeRelatorio.includes('dhl') && (fornecedor.includes('ems') || fornecedor.includes('prati'))) return true
          if (nomeRelatorio.includes('solistica') && fornecedor.includes('prati')) return true
          if (nomeRelatorio.includes('ativa') && fornecedor.includes('prati')) return true
          if (nomeRelatorio.includes('shuttle') && fornecedor.includes('prati')) return true
          if (nomeRelatorio.includes('agiflex') && fornecedor.includes('prati')) return true
          if (nomeRelatorio.includes('jomed') && fornecedor.includes('prati')) return true
          if (nomeRelatorio.includes('luft') && fornecedor.includes('prati')) return true
          
          return false
        })
        
        if (notasBipadasCandidatas.length > 0) {
          console.log(`   🎯 ${notasBipadasCandidatas.length} notas bipadas candidatas encontradas`)
          
          // Buscar notas fiscais correspondentes
          const numeroNfs = notasBipadasCandidatas.map(nb => nb.numero_nf)
          const { data: notasFiscais, error: notasFiscaisError } = await supabase
            .from('notas_fiscais')
            .select('id, numero_nf')
            .in('numero_nf', numeroNfs)
          
          if (notasFiscaisError) {
            console.error(`   ❌ Erro ao buscar notas fiscais:`, notasFiscaisError)
            continue
          }
          
          // Associar notas fiscais ao relatório
          if (notasFiscais && notasFiscais.length > 0) {
            const associacoes = notasFiscais.map(nf => ({
              relatorio_id: relatorio.id,
              nota_fiscal_id: nf.id
            }))
            
            const { error: insertError } = await supabase
              .from('relatorio_notas')
              .insert(associacoes)
            
            if (insertError) {
              console.error(`   ❌ Erro ao inserir associações:`, insertError)
            } else {
              console.log(`   ✅ ${notasFiscais.length} notas recuperadas com sucesso`)
              totalRecuperadas += notasFiscais.length
            }
          }
        } else {
          console.log(`   ❌ Nenhuma nota bipada candidata encontrada para este relatório`)
        }
      } else {
        console.log(`   ❌ Nenhuma nota bipada encontrada para a data`)
      }
    }
    
    console.log(`\n📊 RECUPERAÇÃO CONCLUÍDA:`)
    console.log(`   Total de notas recuperadas: ${totalRecuperadas}`)
    
    if (totalRecuperadas > 0) {
      console.log(`\n✅ RECUPERAÇÃO BEM-SUCEDIDA!`)
      console.log(`   - Execute "npm run investigar-misturadas" para verificar`)
    } else {
      console.log(`\n⚠️ NENHUMA NOTA FOI RECUPERADA`)
      console.log(`   - Pode ser necessário análise manual`)
    }
    
  } catch (error) {
    console.error('❌ Erro durante a recuperação:', error)
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2)
  const comando = args[0]
  
  switch (comando) {
    case 'recuperar':
      await recuperarNotasTransportadoras()
      break
    default:
      await analisarTransportadorasProblema()
      break
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { analisarTransportadorasProblema, recuperarNotasTransportadoras }
