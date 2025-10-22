import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { useAudioPermission } from './use-audio-permission'

// Cache em memória para relatórios
interface RelatorioCache {
  [key: string]: {
    data: any[]
    timestamp: number
    promise?: Promise<any[]>
  }
}

const relatoriosCache: RelatorioCache = {}
const CACHE_TTL = 2 * 60 * 1000 // 2 minutos
const MAX_CACHE_SIZE = 50 // Máximo de 50 entradas no cache

// Cache para notas não encontradas (evita logs repetidos)
const notasNaoEncontradasCache = new Set<string>()
const NOTAS_CACHE_TTL = 10 * 60 * 1000 // 10 minutos

// Hook para gerenciar cache de relatórios otimizado
export const useRelatoriosOptimized = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Função para limpar cache expirado
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now()
    const expiredKeys = Object.keys(relatoriosCache).filter(
      key => now - relatoriosCache[key].timestamp > CACHE_TTL
    )
    
    expiredKeys.forEach(key => {
      delete relatoriosCache[key]
    })

    // Se o cache estiver muito grande, remover as entradas mais antigas
    const cacheKeys = Object.keys(relatoriosCache)
    if (cacheKeys.length > MAX_CACHE_SIZE) {
      const sortedKeys = cacheKeys.sort(
        (a, b) => relatoriosCache[a].timestamp - relatoriosCache[b].timestamp
      )
      
      const keysToRemove = sortedKeys.slice(0, cacheKeys.length - MAX_CACHE_SIZE)
      keysToRemove.forEach(key => {
        delete relatoriosCache[key]
      })
    }
  }, [])

  // Função para buscar relatórios com cache e consultas otimizadas
  const getRelatorios = useCallback(async (
    area?: string,
    data?: string,
    turno?: string,
    forceRefresh = false
  ): Promise<any[]> => {
    try {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Criar novo AbortController
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      // Gerar chave de cache baseada nos parâmetros
      const cacheKey = `relatorios_${area || 'all'}_${data || 'all'}_${turno || 'all'}`
      
      // Verificar se já existe no cache e não é forçado refresh
      if (!forceRefresh && relatoriosCache[cacheKey]) {
        const cached = relatoriosCache[cacheKey]
        const now = Date.now()
        
        // Se o cache ainda é válido, retornar os dados
        if (now - cached.timestamp < CACHE_TTL) {
          console.log('📋 Usando cache de relatórios:', cacheKey)
          return cached.data
        }
        
        // Se há uma requisição em andamento, aguardar ela
        if (cached.promise) {
          console.log('⏳ Aguardando requisição de relatórios em andamento:', cacheKey)
          return await cached.promise
        }
      }

      setIsLoading(true)
      setError(null)

      // Criar promise para a requisição otimizada
      const fetchPromise = (async () => {
        const supabase = getSupabase()
        
        // CONSULTA OTIMIZADA: Buscar relatórios básicos primeiro
        // Primeiro, verificar se a tabela relatorios existe
        const { data: tabelaRelatoriosExiste, error: erroTabelaRelatorios } = await supabase
          .from('relatorios')
          .select('id')
          .limit(1)
        
        if (erroTabelaRelatorios) {
          console.error('❌ Tabela relatorios não existe ou erro:', erroTabelaRelatorios)
          console.log('🔍 Detalhes do erro:', {
            message: erroTabelaRelatorios.message,
            details: erroTabelaRelatorios.details,
            hint: erroTabelaRelatorios.hint,
            code: erroTabelaRelatorios.code
          })
          return []
        } else {
          console.log('✅ Tabela relatorios existe')
        }
        
        let relatoriosQuery = supabase
          .from('relatorios')
          .select('*')

        // Aplicar filtros se fornecidos
        if (area) {
          if (area === 'custos') {
            // Para custos, buscar TODOS os relatórios de recebimento (todos os status)
            console.log('🔍 Buscando relatórios de recebimento para área custos')
            relatoriosQuery = relatoriosQuery.eq('area', 'recebimento')
          } else {
            console.log('🔍 Buscando relatórios para área:', area)
            relatoriosQuery = relatoriosQuery.eq('area', area)
          }
        } else {
          console.log('🔍 Buscando todos os relatórios (sem filtro de área)')
        }
        if (data) {
          relatoriosQuery = relatoriosQuery.eq('data', data)
        }
        if (turno) {
          relatoriosQuery = relatoriosQuery.eq('turno', turno)
        }

        const { data: relatorios, error: relatoriosError } = await relatoriosQuery
          .order('created_at', { ascending: false })

        if (relatoriosError) {
          console.error('❌ Erro ao buscar relatórios:', relatoriosError)
          throw relatoriosError
        }

        if (!relatorios || relatorios.length === 0) {
          console.log('⚠️ Nenhum relatório encontrado no banco de dados')
          return []
        }

        console.log(`✅ ${relatorios.length} relatórios básicos encontrados`)
        console.log('🔍 Primeiros relatórios:', relatorios.slice(0, 2))
        console.log('🔍 IDs dos relatórios:', relatorios.map(r => r.id))
        console.log('🔍 Status dos relatórios:', relatorios.map(r => ({ id: r.id, status: r.status })))

        // CONSULTA EM LOTE: Buscar TODOS os colaboradores de uma vez
        const relatorioIds = relatorios.map(r => r.id)
        
        // Primeiro, verificar se a tabela relatorio_colaboradores existe
        const { data: tabelaColaboradoresExiste, error: erroTabelaColaboradores } = await supabase
          .from('relatorio_colaboradores')
          .select('id')
          .limit(1)
        
        if (erroTabelaColaboradores) {
          console.error('❌ Tabela relatorio_colaboradores não existe ou erro:', erroTabelaColaboradores)
          console.log('🔍 Detalhes do erro:', {
            message: erroTabelaColaboradores.message,
            details: erroTabelaColaboradores.details,
            hint: erroTabelaColaboradores.hint,
            code: erroTabelaColaboradores.code
          })
        } else {
          console.log('✅ Tabela relatorio_colaboradores existe')
        }
        
        const { data: todosColaboradores, error: colaboradoresError } = await supabase
          .from('relatorio_colaboradores')
          .select('relatorio_id, user_id')
          .in('relatorio_id', relatorioIds)

        if (colaboradoresError) {
          console.warn('⚠️ Erro ao buscar colaboradores:', colaboradoresError)
          console.log('🔍 Detalhes do erro:', {
            message: colaboradoresError.message,
            details: colaboradoresError.details,
            hint: colaboradoresError.hint,
            code: colaboradoresError.code
          })
        } else {
          console.log('✅ Colaboradores carregados:', todosColaboradores?.length || 0)
        }

        // Buscar nomes dos usuários separadamente
        let nomesUsuarios: { [key: string]: string } = {}
        if (todosColaboradores && todosColaboradores.length > 0) {
          const userIds = [...new Set(todosColaboradores.map(tc => tc.user_id))]
          
          // Primeiro, verificar se a tabela users existe
          const { data: tabelaUsersExiste, error: erroTabelaUsers } = await supabase
            .from('users')
            .select('id')
            .limit(1)
          
          if (erroTabelaUsers) {
            console.error('❌ Tabela users não existe ou erro:', erroTabelaUsers)
            console.log('🔍 Detalhes do erro:', {
              message: erroTabelaUsers.message,
              details: erroTabelaUsers.details,
              hint: erroTabelaUsers.hint,
              code: erroTabelaUsers.code
            })
          } else {
            console.log('✅ Tabela users existe')
          }
          
          const { data: usuarios, error: usuariosError } = await supabase
            .from('users')
            .select('id, nome')
            .in('id', userIds)

          if (usuariosError) {
            console.warn('⚠️ Erro ao buscar usuários:', usuariosError)
            console.log('🔍 Detalhes do erro:', {
              message: usuariosError.message,
              details: usuariosError.details,
              hint: usuariosError.hint,
              code: usuariosError.code
            })
          } else {
            console.log('✅ Usuários carregados:', usuarios?.length || 0)
          }

          if (!usuariosError && usuarios) {
            nomesUsuarios = usuarios.reduce((acc, user: any) => {
              acc[user.id] = user.nome
              return acc
            }, {} as { [key: string]: string })
          }
        }

        // CONSULTA EM LOTE: Buscar TODAS as notas de uma vez
        console.log('🔍 Buscando notas na tabela relatorio_notas para relatórios:', relatorioIds)
        console.log('🔍 Total de relatórios para buscar notas:', relatorioIds.length)
        
        // Primeiro, verificar se a tabela relatorio_notas existe
        const { data: tabelaExiste, error: erroTabela } = await supabase
          .from('relatorio_notas')
          .select('id')
          .limit(1)
        
        if (erroTabela) {
          console.error('❌ Tabela relatorio_notas não existe ou erro:', erroTabela)
          console.log('🔍 Detalhes do erro:', {
            message: erroTabela.message,
            details: erroTabela.details,
            hint: erroTabela.hint,
            code: erroTabela.code
          })
        } else {
          console.log('✅ Tabela relatorio_notas existe')
        }
        
        console.log('🔍 Executando query para buscar notas na tabela relatorio_notas...')
        console.log('🔍 Relatório IDs para buscar:', relatorioIds.slice(0, 5), '...')
        
        const { data: todasNotas, error: notasError } = await supabase
          .from('relatorio_notas')
          .select('relatorio_id, nota_fiscal_id')
          .in('relatorio_id', relatorioIds)

        if (notasError) {
          console.warn('⚠️ Erro ao buscar notas:', notasError)
          console.log('🔍 Detalhes do erro:', {
            message: notasError.message,
            details: notasError.details,
            hint: notasError.hint,
            code: notasError.code
          })
        } else {
          console.log('✅ Notas carregadas da tabela relatorio_notas:', todasNotas?.length || 0)
          console.log('🔍 Primeiras notas:', todasNotas?.slice(0, 3))
          
          if (todasNotas && todasNotas.length > 0) {
            // Agrupar notas por relatório para debug
            const notasPorRelatorio = todasNotas.reduce((acc: any, nota: any) => {
              if (!acc[nota.relatorio_id]) {
                acc[nota.relatorio_id] = []
              }
              acc[nota.relatorio_id].push(nota.nota_fiscal_id)
              return acc
            }, {})
            
            console.log('🔍 Notas agrupadas por relatório:', notasPorRelatorio)
            
            // Verificar se há relatórios sem notas
            const relatoriosSemNotas = relatorioIds.filter(id => !notasPorRelatorio[id])
            if (relatoriosSemNotas.length > 0) {
              console.log('⚠️ Relatórios sem notas na tabela relatorio_notas:', relatoriosSemNotas)
            }
            
            // Verificar estrutura dos dados
            console.log('🔍 Estrutura da primeira nota:', {
              relatorio_id: todasNotas[0]?.relatorio_id,
              nota_fiscal_id: todasNotas[0]?.nota_fiscal_id,
              tipo_relatorio_id: typeof todasNotas[0]?.relatorio_id,
              tipo_nota_fiscal_id: typeof todasNotas[0]?.nota_fiscal_id
            })
          } else {
            console.log('⚠️ NENHUMA NOTA ENCONTRADA na tabela relatorio_notas para os relatórios:', relatorioIds)
            
            // Verificar se há dados na tabela relatorio_notas
            console.log('🔍 Verificando se há dados na tabela relatorio_notas...')
            const { data: verificacaoRelatorioNotas, error: erroVerificacao } = await supabase
              .from('relatorio_notas')
              .select('relatorio_id, nota_fiscal_id')
              .limit(10)
            
            if (erroVerificacao) {
              console.error('❌ Erro ao verificar relatorio_notas:', erroVerificacao)
            } else {
              console.log('✅ Exemplo de dados na tabela relatorio_notas:', verificacaoRelatorioNotas)
            }
          }
        }

        // Buscar dados das notas fiscais separadamente
        let dadosNotas: { [key: string]: any } = {}
        if (todasNotas && todasNotas.length > 0) {
          const notaIds = [...new Set(todasNotas.map(tn => tn.nota_fiscal_id))]
          console.log('🔍 Buscando dados das notas fiscais para IDs:', notaIds)
          console.log('🔍 Total de IDs únicos de notas:', notaIds.length)
          
          // Verificar se há IDs nulos ou inválidos
          const idsInvalidos = notaIds.filter(id => !id || id === null || id === undefined)
          if (idsInvalidos.length > 0) {
            console.log('⚠️ IDs inválidos encontrados:', idsInvalidos)
          }
          
          // Verificar tipos dos IDs
          const tiposIds = [...new Set(notaIds.map(id => typeof id))]
          console.log('🔍 Tipos dos IDs:', tiposIds)
          
          // Primeiro, verificar se a tabela notas_fiscais existe
          const { data: tabelaNotasExiste, error: erroTabelaNotas } = await supabase
            .from('notas_fiscais')
            .select('id')
            .limit(1)
          
          if (erroTabelaNotas) {
            console.error('❌ Tabela notas_fiscais não existe ou erro:', erroTabelaNotas)
            console.log('🔍 Detalhes do erro:', {
              message: erroTabelaNotas.message,
              details: erroTabelaNotas.details,
              hint: erroTabelaNotas.hint,
              code: erroTabelaNotas.code
            })
          } else {
            console.log('✅ Tabela notas_fiscais existe')
          }
          
          console.log('🔍 Executando query para buscar notas fiscais com IDs:', notaIds.slice(0, 5), '...')
          console.log('🔍 Total de IDs únicos de notas:', notaIds.length)
          
          // Filtrar IDs válidos antes da query
          const idsValidos = notaIds.filter(id => id && id !== null && id !== undefined)
          console.log('🔍 IDs válidos para query:', idsValidos.length, 'de', notaIds.length)
          
          if (idsValidos.length === 0) {
            console.log('⚠️ Nenhum ID válido para buscar notas fiscais')
            console.log('🔍 IDs originais:', notaIds.slice(0, 10))
            return []
          }
          
          const { data: notasFiscais, error: notasFiscaisError } = await supabase
            .from('notas_fiscais')
            .select('*')
            .in('id', idsValidos)

          if (notasFiscaisError) {
            console.warn('⚠️ Erro ao buscar notas fiscais:', notasFiscaisError)
            console.log('🔍 Detalhes do erro:', {
              message: notasFiscaisError.message,
              details: notasFiscaisError.details,
              hint: notasFiscaisError.hint,
              code: notasFiscaisError.code
            })
          } else {
            console.log('✅ Notas fiscais carregadas:', notasFiscais?.length || 0)
            console.log('🔍 Primeiras notas fiscais:', notasFiscais?.slice(0, 2))
            
            if (notasFiscais && notasFiscais.length > 0) {
              console.log('🔍 Campos da primeira nota fiscal:', Object.keys(notasFiscais[0]))
              console.log('🔍 IDs das notas fiscais encontradas:', notasFiscais.map(n => n.id))
            } else {
              console.log('⚠️ NENHUMA NOTA FISCAL ENCONTRADA para os IDs:', idsValidos.slice(0, 10))
              
              // Verificar se há notas na tabela notas_fiscais
              const { data: todasNotasFiscais, error: erroTodasNotas } = await supabase
                .from('notas_fiscais')
                .select('id')
                .limit(10)
              
              if (erroTodasNotas) {
                console.error('❌ Erro ao verificar notas fiscais:', erroTodasNotas)
              } else {
                console.log('🔍 Exemplo de IDs na tabela notas_fiscais:', todasNotasFiscais?.map(n => n.id))
                
                // Verificar se há algum ID em comum
                const idsComuns = idsValidos.filter(id => todasNotasFiscais?.some(n => n.id === id))
                console.log('🔍 IDs em comum:', idsComuns.length, 'de', idsValidos.length)
                
                if (idsComuns.length === 0) {
                  console.log('⚠️ NENHUM ID EM COMUM entre relatorio_notas e notas_fiscais!')
                  console.log('🔍 IDs buscados (primeiros 5):', idsValidos.slice(0, 5))
                  console.log('🔍 IDs na tabela (primeiros 5):', todasNotasFiscais?.slice(0, 5))
                  
                  // Verificar se há algum padrão nos IDs
                  console.log('🔍 Padrão dos IDs buscados:', idsValidos.slice(0, 3).map(id => typeof id))
                  console.log('🔍 Padrão dos IDs na tabela:', todasNotasFiscais?.slice(0, 3).map(n => typeof n.id))
                }
              }
            }
          }

          if (!notasFiscaisError && notasFiscais) {
            dadosNotas = notasFiscais.reduce((acc, nota: any) => {
              acc[nota.id] = nota
              return acc
            }, {} as { [key: string]: any })
            console.log('🔍 Dados das notas mapeados:', Object.keys(dadosNotas).length, 'notas')
            
            // Verificar se há IDs de notas que não foram encontrados
            const idsNaoEncontrados = idsValidos.filter(id => !dadosNotas[id])
            if (idsNaoEncontrados.length > 0) {
              console.log('⚠️ IDs de notas não encontrados na tabela notas_fiscais:', idsNaoEncontrados)
            }
          }
        } else {
          console.log('⚠️ Nenhuma nota encontrada na tabela relatorio_notas')
        }

        // CONSULTA EM LOTE: Buscar TODAS as divergências de uma vez
        let todasDivergencias: any[] = []
        if (todasNotas && todasNotas.length > 0) {
          const notaIds = todasNotas.map(tn => tn.nota_fiscal_id).filter(id => id && id !== null && id !== undefined)
          
          // Primeiro, verificar se a tabela divergencias existe
          const { data: tabelaDivergenciasExiste, error: erroTabelaDivergencias } = await supabase
            .from('divergencias')
            .select('id')
            .limit(1)
          
          if (erroTabelaDivergencias) {
            console.error('❌ Tabela divergencias não existe ou erro:', erroTabelaDivergencias)
            console.log('🔍 Detalhes do erro:', {
              message: erroTabelaDivergencias.message,
              details: erroTabelaDivergencias.details,
              hint: erroTabelaDivergencias.hint,
              code: erroTabelaDivergencias.code
            })
          } else {
            console.log('✅ Tabela divergencias existe')
          }
          
          const { data: divergenciasData, error: divergenciasError } = await supabase
            .from('divergencias')
            .select('*')
            .in('nota_fiscal_id', notaIds)

          if (divergenciasError) {
            console.warn('⚠️ Erro ao buscar divergências:', divergenciasError)
            console.log('🔍 Detalhes do erro:', {
              message: divergenciasError.message,
              details: divergenciasError.details,
              hint: divergenciasError.hint,
              code: divergenciasError.code
            })
          } else {
            todasDivergencias = divergenciasData || []
            console.log('✅ Divergências carregadas:', todasDivergencias.length)
          }
        } else {
          console.log('⚠️ Nenhuma nota para buscar divergências')
        }

        console.log(`📊 Dados carregados em lote:`)
        console.log(`   - Relatórios: ${relatorios.length}`)
        console.log(`   - IDs dos relatórios: ${relatorioIds}`)
        console.log(`   - Colaboradores: ${todosColaboradores?.length || 0}`)
        console.log(`   - Notas: ${todasNotas?.length || 0}`)
        console.log(`   - Divergências: ${todasDivergencias.length}`)
        console.log(`   - Dados das notas fiscais: ${Object.keys(dadosNotas).length}`)
        
        // Verificar se há relatórios sem notas
        if (todasNotas && todasNotas.length > 0) {
          const notasPorRelatorio = todasNotas.reduce((acc: any, nota: any) => {
            if (!acc[nota.relatorio_id]) {
              acc[nota.relatorio_id] = []
            }
            acc[nota.relatorio_id].push(nota.nota_fiscal_id)
            return acc
          }, {})
          
          const relatoriosSemNotas = relatorioIds.filter(id => !notasPorRelatorio[id])
          if (relatoriosSemNotas.length > 0) {
            console.log('⚠️ Relatórios sem notas na tabela relatorio_notas:', relatoriosSemNotas)
          }
        } else {
          console.log('⚠️ Nenhuma nota encontrada na tabela relatorio_notas')
        }

        // PROCESSAR DADOS EM MEMÓRIA (muito mais rápido)
        const relatoriosCompletos = relatorios.map(relatorio => {
          console.log('🔍 Processando relatório:', relatorio.nome, 'Status original:', relatorio.status)
          // Buscar colaboradores deste relatório
          const colaboradores = todosColaboradores
            ?.filter(tc => tc.relatorio_id === relatorio.id)
            ?.map((tc: any) => nomesUsuarios[tc.user_id] || `Usuário ${tc.user_id}`)
            || []

          // Buscar notas deste relatório
          const notasRelatorio = todasNotas?.filter(tn => tn.relatorio_id === relatorio.id) || []
          console.log(`🔍 Relatório ${relatorio.id} tem ${notasRelatorio.length} notas na tabela relatorio_notas`)
          
          if (notasRelatorio.length === 0) {
            console.log(`⚠️ Relatório ${relatorio.id} não tem notas na tabela relatorio_notas`)
          }
          
          const notasProcessadas = notasRelatorio.map((tn: any) => {
            const nota = dadosNotas[tn.nota_fiscal_id]
            const divergencia = todasDivergencias?.find(d => d.nota_fiscal_id === nota?.id)

            if (!nota) {
              // Verificar se já logamos esta nota para evitar spam
              if (!notasNaoEncontradasCache.has(tn.nota_fiscal_id)) {
                notasNaoEncontradasCache.add(tn.nota_fiscal_id)
                
                // Log apenas uma vez por nota
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`⚠️ Nota fiscal ${tn.nota_fiscal_id} não encontrada no relatório ${relatorio.nome}`)
                }
                
                // Limpar cache após TTL
                setTimeout(() => {
                  notasNaoEncontradasCache.delete(tn.nota_fiscal_id)
                }, NOTAS_CACHE_TTL)
              }
              
              // Retornar uma nota "fantasma" com dados básicos para manter a integridade do relatório
              return {
                id: tn.nota_fiscal_id,
                codigoCompleto: `NF-${tn.nota_fiscal_id.slice(0, 8)}`,
                data: new Date().toISOString(),
                numeroNF: `NF-${tn.nota_fiscal_id.slice(0, 8)}`,
                volumes: 0,
                destino: 'Não encontrado',
                fornecedor: 'Nota não encontrada',
                clienteDestino: 'Não encontrado',
                tipoCarga: 'Não encontrado',
                timestamp: new Date().toISOString(),
                status: 'erro',
                divergencia: null,
                observacoes: 'Nota fiscal não encontrada no banco de dados',
                volumesInformados: 0,
                isNotFound: true // Flag para identificar notas não encontradas
              }
            }

            return {
              id: nota.id,
              codigoCompleto: nota.codigo_completo,
              data: nota.data,
              numeroNF: nota.numero_nf || nota.codigo_completo,
              volumes: nota.volumes || 0,
              destino: nota.destino || 'Não informado',
              fornecedor: nota.fornecedor || 'Não informado',
              clienteDestino: nota.cliente_destino || 'Não informado',
              tipoCarga: nota.tipo_carga || 'Não informado',
              timestamp: nota.timestamp || nota.created_at || '',
              status: nota.status === 'devolvida' ? 'devolvida' : (divergencia ? 'divergencia' : 'ok'),
              divergencia: divergencia ? {
                volumesInformados: divergencia.volumes_informados,
                observacoes: divergencia.observacoes
              } : null,
              isNotFound: false
            }
          })

          // Separar notas válidas das não encontradas
          const notasValidas = notasProcessadas.filter(nota => !nota.isNotFound)
          const notasNaoEncontradas = notasProcessadas.filter(nota => nota.isNotFound)
          
          if (notasNaoEncontradas.length > 0) {
            console.warn(`⚠️ Relatório ${relatorio.nome}: ${notasNaoEncontradas.length} notas não encontradas de ${notasProcessadas.length} total`)
            
            // Limpar referências órfãs automaticamente (apenas em desenvolvimento)
            if (process.env.NODE_ENV === 'development' && notasNaoEncontradas.length > 0) {
              console.log(`🧹 Limpando ${notasNaoEncontradas.length} referências órfãs automaticamente...`)
              // Executar limpeza de forma assíncrona sem bloquear o processamento
              limparReferenciasOrfas(notasNaoEncontradas.map(n => n.id)).catch(error => {
                console.error('❌ Erro ao limpar referências órfãs:', error)
              })
            }
          }
          
          const notas = notasValidas // Usar apenas notas válidas
          const notasPuladas = notasProcessadas.length - notas.length
          
          if (notasPuladas > 0) {
            console.log(`⚠️ Relatório ${relatorio.id}: ${notasPuladas} notas puladas (não encontradas)`)
          }
          
          console.log(`✅ Relatório ${relatorio.id} processado com ${notas.length} notas válidas`)

          const relatorioProcessado = {
            id: relatorio.id,
            nome: relatorio.nome || 'Relatório sem nome',
            colaboradores,
            data: relatorio.data,
            turno: relatorio.turno || 'Não informado',
            area: relatorio.area || 'custos',
            quantidadeNotas: relatorio.quantidade_notas || 0,
            somaVolumes: relatorio.soma_volumes || 0,
            totalDivergencias: relatorio.total_divergencias || 0,
            notas,
            dataFinalizacao: relatorio.data_finalizacao || new Date().toISOString(),
            status: relatorio.status || 'liberado',
          }
          
          console.log('🔍 Relatório processado:', relatorio.nome, 'Status final:', relatorio.status || 'liberado', 'Notas:', notas.length)
          return relatorioProcessado
        })

        console.log(`✅ ${relatoriosCompletos.length} relatórios processados com sucesso`)
        
        // Verificar quantos relatórios têm notas
        const relatoriosComNotas = relatoriosCompletos.filter(r => r.notas && r.notas.length > 0)
        console.log(`📊 Relatórios com notas: ${relatoriosComNotas.length} de ${relatoriosCompletos.length}`)
        
        if (relatoriosComNotas.length === 0) {
          console.log('⚠️ NENHUM RELATÓRIO TEM NOTAS CARREGADAS!')
          console.log('🔍 Estrutura do primeiro relatório:', {
            id: relatoriosCompletos[0]?.id,
            nome: relatoriosCompletos[0]?.nome,
            notas: relatoriosCompletos[0]?.notas,
            totalNotas: relatoriosCompletos[0]?.notas?.length || 0
          })
          
          // Verificar se há dados na tabela notas_fiscais
          console.log('🔍 Verificando se há dados na tabela notas_fiscais...')
          const { data: verificacaoNotas, error: erroVerificacao } = await supabase
            .from('notas_fiscais')
            .select('id, numero_nf, created_at')
            .limit(10)
          
          if (erroVerificacao) {
            console.error('❌ Erro ao verificar notas fiscais:', erroVerificacao)
          } else {
            console.log('✅ Exemplo de notas na tabela notas_fiscais:', verificacaoNotas)
          }
          
          // Verificar se há dados na tabela relatorio_notas
          console.log('🔍 Verificando se há dados na tabela relatorio_notas...')
          const { data: verificacaoRelatorioNotas, error: erroVerificacaoRelatorio } = await supabase
            .from('relatorio_notas')
            .select('relatorio_id, nota_fiscal_id')
            .limit(10)
          
          if (erroVerificacaoRelatorio) {
            console.error('❌ Erro ao verificar relatorio_notas:', erroVerificacaoRelatorio)
          } else {
            console.log('✅ Exemplo de dados na tabela relatorio_notas:', verificacaoRelatorioNotas)
          }
        } else {
          console.log('✅ Relatórios com notas encontrados:', relatoriosComNotas.map(r => ({
            id: r.id,
            nome: r.nome,
            totalNotas: r.notas.length
          })))
        }
        
        return relatoriosCompletos

      })()

      // Armazenar promise no cache para evitar requisições duplicadas
      relatoriosCache[cacheKey] = {
        data: [],
        timestamp: Date.now(),
        promise: fetchPromise
      }

      // Aguardar resultado
      const result = await fetchPromise

      // Atualizar cache com o resultado
      relatoriosCache[cacheKey] = {
        data: result,
        timestamp: Date.now()
      }

      return result

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('🚫 Requisição de relatórios cancelada')
        return []
      }

      console.error('❌ Erro ao buscar relatórios:', err)
      setError(err.message || 'Erro ao buscar relatórios')
      return []
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [])

  // Função para buscar relatórios por área
  const getRelatoriosByArea = useCallback(async (
    area: string,
    forceRefresh = false
  ): Promise<any[]> => {
    return await getRelatorios(area, undefined, undefined, forceRefresh)
  }, [getRelatorios])

  // Função para buscar relatórios de custos (otimizado)
  const getRelatoriosCustos = useCallback(async (
    forceRefresh = false
  ): Promise<any[]> => {
    return await getRelatorios('custos', undefined, undefined, forceRefresh)
  }, [getRelatorios])

  // Função para buscar relatórios de recebimento (otimizado)
  const getRelatoriosRecebimento = useCallback(async (
    forceRefresh = false
  ): Promise<any[]> => {
    return await getRelatorios('recebimento', undefined, undefined, forceRefresh)
  }, [getRelatorios])

  // Função para invalidar cache
  const invalidateCache = useCallback((pattern?: string) => {
    if (pattern) {
      // Invalidar cache específico
      const keysToInvalidate = Object.keys(relatoriosCache).filter(key => 
        key.includes(pattern)
      )
      keysToInvalidate.forEach(key => {
        delete relatoriosCache[key]
      })
      console.log('🗑️ Cache de relatórios invalidado para padrão:', pattern)
    } else {
      // Invalidar todo o cache
      Object.keys(relatoriosCache).forEach(key => {
        delete relatoriosCache[key]
      })
      console.log('🗑️ Todo o cache de relatórios invalidado')
    }
  }, [])

  // Função para limpar cache
  const clearCache = useCallback(() => {
    Object.keys(relatoriosCache).forEach(key => {
      delete relatoriosCache[key]
    })
    console.log('🧹 Cache de relatórios limpo')
  }, [])

  // Função para obter estatísticas do cache
  const getCacheStats = useCallback(() => {
    const now = Date.now()
    const entries = Object.keys(relatoriosCache)
    const validEntries = entries.filter(
      key => now - relatoriosCache[key].timestamp < CACHE_TTL
    )
    const expiredEntries = entries.length - validEntries.length

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries,
      cacheSize: JSON.stringify(relatoriosCache).length
    }
  }, [])

  // Limpar cache expirado periodicamente
  useEffect(() => {
    const interval = setInterval(cleanExpiredCache, 120000) // A cada 2 minutos
    return () => clearInterval(interval)
  }, [cleanExpiredCache])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    getRelatorios,
    getRelatoriosByArea,
    getRelatoriosCustos,
    getRelatoriosRecebimento,
    invalidateCache,
    clearCache,
    getCacheStats,
    isLoading,
    error
  }
}

// Hook para usar relatórios com cache automático
export const useRelatorios = (
  area?: string,
  options: {
    refreshInterval?: number
    revalidateOnFocus?: boolean
    revalidateOnReconnect?: boolean
  } = {}
) => {
  const {
    getRelatoriosByArea,
    getRelatoriosCustos,
    getRelatoriosRecebimento,
    invalidateCache,
    isLoading,
    error
  } = useRelatoriosOptimized()

  const [data, setData] = useState<any[]>([])
  const [lastFetch, setLastFetch] = useState<number>(0)
  
  // Referência para controlar IDs de relatórios já notificados
  const relatoriosNotificadosRef = useRef<Set<string>>(new Set())
  
  // Hook para gerenciar permissões de áudio
  const { playAudio, requestPermission, isGranted } = useAudioPermission()

  // Função para reproduzir áudio de notificação para custos
  const reproduzirNotificacaoCustos = useCallback(async () => {
    const sucesso = await playAudio('/new-notification-Custos.mp3', 0.7)
    if (sucesso) {
      console.log('🔊 Notificação de áudio reproduzida com sucesso')
    } else {
      console.log('🔇 Áudio não reproduzido - permissão não concedida')
    }
  }, [playAudio])

  // Função para solicitar permissão de áudio (alias para compatibilidade)
  const solicitarPermissaoAudio = useCallback(async () => {
    return await requestPermission()
  }, [requestPermission])


  const {
    refreshInterval = 0,
    revalidateOnFocus = true,
    revalidateOnReconnect = true
  } = options

  // Função para buscar dados
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      let result: any[] = []

      if (area === 'custos') {
        result = await getRelatoriosCustos(forceRefresh)
      } else if (area === 'recebimento') {
        result = await getRelatoriosRecebimento(forceRefresh)
      } else if (area) {
        result = await getRelatoriosByArea(area, forceRefresh)
      }

      // Detectar novos relatórios para área de custos
      if (area === 'custos' && result.length > 0) {
        const relatoriosAtuais = result.map(relatorio => relatorio.id)
        const relatoriosNovos = relatoriosAtuais.filter(id => !relatoriosNotificadosRef.current.has(id))
        
        // Se há novos relatórios, reproduzir notificação
        if (relatoriosNovos.length > 0) {
          console.log('🆕 Novos relatórios de custos detectados:', relatoriosNovos)
          reproduzirNotificacaoCustos()
          
          // Adicionar novos relatórios à lista de notificados
          relatoriosNovos.forEach(id => {
            relatoriosNotificadosRef.current.add(id)
          })
        }
      }

      setData(result)
      setLastFetch(Date.now())
    } catch (err) {
      console.error('❌ Erro ao buscar relatórios:', err)
    }
  }, [area, getRelatoriosByArea, getRelatoriosCustos, getRelatoriosRecebimento, reproduzirNotificacaoCustos])

  // Buscar dados iniciais
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh automático
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchData(true) // Forçar refresh
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchData])

  // Revalidar ao focar na janela
  useEffect(() => {
    if (!revalidateOnFocus) return

    const handleFocus = () => {
      fetchData(true)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [revalidateOnFocus, fetchData])

  // Revalidar ao reconectar
  useEffect(() => {
    if (!revalidateOnReconnect) return

    const handleOnline = () => {
      fetchData(true)
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [revalidateOnReconnect, fetchData])

  return {
    data,
    isLoading,
    error,
    lastFetch,
    refresh: () => fetchData(true),
    invalidateCache,
    reproduzirNotificacaoCustos,
    solicitarPermissaoAudio,
    audioPermissionGranted: isGranted
  }
}

// Função para limpar referências órfãs na tabela relatorio_notas
export const limparReferenciasOrfas = async (notaIds: string[]) => {
  try {
    const { getSupabase } = await import('@/lib/supabase-client')
    const supabase = getSupabase()
    
    console.log(`🧹 Limpando ${notaIds.length} referências órfãs...`)
    
    const { error } = await supabase
      .from('relatorio_notas')
      .delete()
      .in('nota_fiscal_id', notaIds)
    
    if (error) {
      console.error('❌ Erro ao limpar referências órfãs:', error)
    } else {
      console.log(`✅ ${notaIds.length} referências órfãs removidas`)
    }
  } catch (error) {
    console.error('❌ Erro ao limpar referências órfãs:', error)
  }
}

// Função para detectar e limpar automaticamente notas órfãs
export const detectarELimparNotasOrfas = async (relatorioId: string) => {
  try {
    const { getSupabase } = await import('@/lib/supabase-client')
    const supabase = getSupabase()
    
    // Buscar todas as notas do relatório
    const { data: relatorioNotas, error: relatorioError } = await supabase
      .from('relatorio_notas')
      .select('nota_fiscal_id')
      .eq('relatorio_id', relatorioId)
    
    if (relatorioError) {
      console.error('❌ Erro ao buscar notas do relatório:', relatorioError)
      return
    }
    
    if (!relatorioNotas || relatorioNotas.length === 0) {
      return
    }
    
    const notaIds = relatorioNotas.map(rn => rn.nota_fiscal_id)
    
    // Verificar quais notas existem na tabela notas_fiscais
    const { data: notasExistentes, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id')
      .in('id', notaIds)
    
    if (notasError) {
      console.error('❌ Erro ao verificar notas existentes:', notasError)
      return
    }
    
    const idsExistentes = new Set(notasExistentes?.map(n => n.id) || [])
    const idsOrfas = notaIds.filter(id => !idsExistentes.has(id))
    
    if (idsOrfas.length > 0) {
      console.log(`🔍 Detectadas ${idsOrfas.length} notas órfãs no relatório ${relatorioId}`)
      await limparReferenciasOrfas(idsOrfas)
    }
    
  } catch (error) {
    console.error('❌ Erro ao detectar notas órfãs:', error)
  }
}
