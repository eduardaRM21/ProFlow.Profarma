#!/usr/bin/env node

/**
 * Script para migrar dados do localStorage para o banco de dados centralizado
 * 
 * Este script:
 * 1. Conecta ao banco centralizado
 * 2. Lê dados do localStorage
 * 3. Migra para as tabelas apropriadas
 * 4. Valida a migração
 */

const { createClient } = require('@supabase/supabase-js')

// Configurações do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ehqxboqxtubeumaupjeq.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXhib3F4dHViZXVtYXVwamVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzcyODQsImV4cCI6MjA3NDMxMzI4NH0.Er0IuDQeEtJ6AzFua_BAPFkcG_rmgg35QgdF0gpfwWw'

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function migrateData() {
  console.log('🚀 Iniciando migração de dados do localStorage para banco centralizado...')
  
  try {
    // 1. Testar conexão com o banco
    console.log('📡 Testando conexão com banco centralizado...')
    const { data: testData, error: testError } = await supabase
      .from('system_config')
      .select('key')
      .limit(1)
    
    if (testError) {
      throw new Error(`Erro de conexão: ${testError.message}`)
    }
    
    console.log('✅ Conexão estabelecida com sucesso')

    // 2. Verificar se há dados no localStorage
    console.log('🔍 Verificando dados no localStorage...')
    
    if (typeof window === 'undefined') {
      console.log('⚠️ Este script deve ser executado no navegador')
      console.log('💡 Use a função migrateFromLocalStorage() do serviço CentralizedDatabaseService')
      return
    }

    // 3. Migrar dados
    console.log('📦 Iniciando migração de dados...')
    
    let totalMigrated = 0
    const migrationResults = []

    // Migrar sessão atual
    const sessionData = localStorage.getItem('sistema_session')
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData)
        console.log(`  📝 Migrando sessão: ${session.area} - ${session.data} - ${session.turno}`)
        
        // Criar sessão no banco
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
          .insert([{
            area: session.area,
            data: session.data,
            turno: session.turno,
            login_time: session.loginTime || new Date().toISOString(),
            status: 'ativa'
          }])
          .select()
          .single()
        
        if (sessionError) {
          console.log(`  ⚠️ Erro ao migrar sessão: ${sessionError.message}`)
        } else {
          console.log(`  ✅ Sessão migrada com ID: ${newSession.id}`)
          totalMigrated++
          migrationResults.push({
            type: 'session',
            success: true,
            id: newSession.id
          })
        }
      } catch (error) {
        console.log(`  ❌ Erro ao processar sessão: ${error.message}`)
        migrationResults.push({
          type: 'session',
          success: false,
          error: error.message
        })
      }
    }

    // Migrar notas de recebimento
    console.log('  📋 Migrando notas de recebimento...')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('recebimento_')) {
        try {
          const notas = JSON.parse(localStorage.getItem(key) || '[]')
          if (notas.length > 0) {
            console.log(`    📦 Processando ${notas.length} notas de ${key}`)
            
            // Extrair data e turno da chave
            const sessionKey = key.replace('recebimento_', '')
            const [data, turno] = sessionKey.split('_')
            
            // Buscar ou criar sessão
            let session = await getOrCreateSession('recebimento', data, turno)
            
            if (session) {
              // Migrar cada nota
              for (const nota of notas) {
                try {
                  const { data: newNota, error: notaError } = await supabase
                    .from('notas_fiscais')
                    .insert([{
                      codigo_completo: nota.codigoCompleto || '',
                      numero_nf: nota.numeroNF || '',
                      data: nota.data || data,
                      volumes: nota.volumes || 0,
                      destino: nota.destino || '',
                      fornecedor: nota.fornecedor || '',
                      cliente_destino: nota.clienteDestino || '',
                      tipo_carga: nota.tipoCarga || '',
                      status: nota.status || 'recebida',
                      session_id: session.id
                    }])
                    .select()
                    .single()
                  
                  if (notaError) {
                    console.log(`      ⚠️ Erro ao migrar nota ${nota.numeroNF}: ${notaError.message}`)
                  } else {
                    console.log(`      ✅ Nota ${nota.numeroNF} migrada`)
                    totalMigrated++
                  }
                } catch (error) {
                  console.log(`      ❌ Erro ao processar nota ${nota.numeroNF}: ${error.message}`)
                }
              }
            }
          }
        } catch (error) {
          console.log(`  ❌ Erro ao processar chave ${key}: ${error.message}`)
        }
      }
    }

    // Migrar carros de embalagem
    console.log('  🚛 Migrando carros de embalagem...')
    const carrosData = localStorage.getItem('profarma_carros_embalagem')
    if (carrosData) {
      try {
        const carros = JSON.parse(carrosData)
        if (carros.length > 0) {
          console.log(`    📦 Processando ${carros.length} carros`)
          
          for (const carro of carros) {
            try {
              // Extrair data da data de início
              const dataInicio = new Date(carro.dataInicio)
              const data = dataInicio.toLocaleDateString('pt-BR')
              const turno = 'manhã' // Assumir turno padrão
              
              // Buscar ou criar sessão
              let session = await getOrCreateSession('embalagem', data, turno)
              
              if (session) {
                // Criar carro
                const { data: newCarro, error: carroError } = await supabase
                  .from('carros_embalagem')
                  .insert([{
                    nome: carro.nome || '',
                    destino_final: carro.destinoFinal || '',
                    status: carro.statusCarro || 'aguardando_colagem',
                    session_id: session.id,
                    data_inicio: carro.dataInicio || new Date().toISOString(),
                    ativo: carro.ativo !== false
                  }])
                  .select()
                  .single()
                
                if (carroError) {
                  console.log(`      ⚠️ Erro ao migrar carro ${carro.nome}: ${carroError.message}`)
                } else {
                  console.log(`      ✅ Carro ${carro.nome} migrado`)
                  totalMigrated++
                  
                  // Migrar itens do carro se existirem
                  if (carro.nfs && Array.isArray(carro.nfs)) {
                    for (const nf of carro.nfs) {
                      try {
                        await supabase
                          .from('carro_itens')
                          .insert([{
                            carro_id: newCarro.id,
                            nota_fiscal_id: nf.id || '',
                            quantidade: nf.quantidade || 1,
                            status: nf.status || 'valida'
                          }])
                        
                        console.log(`        ✅ Item ${nf.numeroNF || nf.id} adicionado ao carro`)
                      } catch (error) {
                        console.log(`        ⚠️ Erro ao adicionar item ao carro: ${error.message}`)
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.log(`    ❌ Erro ao processar carro ${carro.nome}: ${error.message}`)
            }
          }
        }
      } catch (error) {
        console.log(`  ❌ Erro ao processar carros: ${error.message}`)
      }
    }

    // Migrar relatórios
    console.log('  📊 Migrando relatórios...')
    const relatoriosData = localStorage.getItem('relatorios_custos')
    if (relatoriosData) {
      try {
        const relatorios = JSON.parse(relatoriosData)
        if (relatorios.length > 0) {
          console.log(`    📦 Processando ${relatorios.length} relatórios`)
          
          for (const relatorio of relatorios) {
            try {
              const { data: newRelatorio, error: relatorioError } = await supabase
                .from('relatorios')
                .insert([{
                  nome: relatorio.nome || '',
                  area: relatorio.area || '',
                  data: relatorio.data || new Date().toLocaleDateString('pt-BR'),
                  turno: relatorio.turno || 'manhã',
                  quantidade_notas: relatorio.quantidadeNotas || 0,
                  soma_volumes: relatorio.somaVolumes || 0,
                  status: relatorio.status || 'aguardando_lancamento',
                  observacoes: relatorio.observacoes || '',
                  data_finalizacao: relatorio.dataFinalizacao || null,
                  data_lancamento: relatorio.dataLancamento || null,
                  numero_lancamento: relatorio.numeroLancamento || null,
                  responsavel_lancamento: relatorio.responsavelLancamento || null
                }])
                .select()
                .single()
              
              if (relatorioError) {
                console.log(`      ⚠️ Erro ao migrar relatório ${relatorio.nome}: ${relatorioError.message}`)
              } else {
                console.log(`      ✅ Relatório ${relatorio.nome} migrado`)
                totalMigrated++
              }
            } catch (error) {
              console.log(`    ❌ Erro ao processar relatório ${relatorio.nome}: ${error.message}`)
            }
          }
        }
      } catch (error) {
        console.log(`  ❌ Erro ao processar relatórios: ${error.message}`)
      }
    }

    // Migrar inventário
    console.log('  📦 Migrando inventário...')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('inventario_')) {
        try {
          const itens = JSON.parse(localStorage.getItem(key) || '[]')
          if (itens.length > 0) {
            console.log(`    📦 Processando ${itens.length} itens de inventário de ${key}`)
            
            // Extrair data da chave
            const sessionKey = key.replace('inventario_', '')
            const [data, turno] = sessionKey.split('_')
            
            // Buscar ou criar sessão
            let session = await getOrCreateSession('inventario', data, turno)
            
            if (session) {
              for (const item of itens) {
                try {
                  await supabase
                    .from('inventario')
                    .insert([{
                      nota_fiscal_id: item.id || '',
                      rua: item.rua || '',
                      quantidade: item.quantidade || 1,
                      session_id: session.id
                    }])
                  
                  console.log(`      ✅ Item de inventário migrado para rua ${item.rua}`)
                  totalMigrated++
                } catch (error) {
                  console.log(`      ⚠️ Erro ao migrar item de inventário: ${error.message}`)
                }
              }
            }
          }
        } catch (error) {
          console.log(`  ❌ Erro ao processar chave ${key}: ${error.message}`)
        }
      }
    }

    // 4. Resumo da migração
    console.log('\n📊 RESUMO DA MIGRAÇÃO:')
    console.log(`✅ Total de itens migrados: ${totalMigrated}`)
    console.log(`📋 Resultados detalhados: ${migrationResults.length} operações`)
    
    const successCount = migrationResults.filter(r => r.success).length
    const errorCount = migrationResults.filter(r => !r.success).length
    
    console.log(`✅ Sucessos: ${successCount}`)
    console.log(`❌ Erros: ${errorCount}`)
    
    if (errorCount > 0) {
      console.log('\n⚠️ ALGUNS ERROS OCORRERAM DURANTE A MIGRAÇÃO:')
      migrationResults
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.type}: ${r.error}`))
    }

    console.log('\n🎉 Migração concluída!')
    console.log('\n📋 Próximos passos:')
    console.log('1. Verifique se todos os dados foram migrados corretamente')
    console.log('2. Teste as funcionalidades do sistema com o banco centralizado')
    console.log('3. Configure backups automáticos no Supabase')
    console.log('4. Considere limpar o localStorage após validação completa')

  } catch (error) {
    console.error('❌ Erro durante migração:', error)
    process.exit(1)
  }
}

async function getOrCreateSession(area, data, turno) {
  try {
    // Tentar buscar sessão existente
    const { data: existingSession, error: searchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('area', area)
      .eq('data', data)
      .eq('turno', turno)
      .eq('status', 'ativa')
      .single()
    
    if (existingSession) {
      return existingSession
    }
    
    // Criar nova sessão se não existir
    const { data: newSession, error: createError } = await supabase
      .from('sessions')
      .insert([{
        area,
        data,
        turno,
        login_time: new Date().toISOString(),
        status: 'ativa'
      }])
      .select()
      .single()
    
    if (createError) {
      console.log(`    ⚠️ Erro ao criar sessão: ${createError.message}`)
      return null
    }
    
    console.log(`    ✅ Nova sessão criada para ${area} - ${data} - ${turno}`)
    return newSession
    
  } catch (error) {
    console.log(`    ❌ Erro ao buscar/criar sessão: ${error.message}`)
    return null
  }
}

// Função para ser chamada pelo serviço
async function migrateFromLocalStorage() {
  if (typeof window === 'undefined') {
    console.log('⚠️ Esta função deve ser executada no navegador')
    return {
      success: false,
      message: 'Função deve ser executada no navegador',
      migratedItems: 0
    }
  }
  
  return await migrateData()
}

// Executar se chamado diretamente
if (require.main === module) {
  migrateData()
}

module.exports = { migrateData, migrateFromLocalStorage }
