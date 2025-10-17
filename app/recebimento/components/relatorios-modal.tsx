"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FileText, Search, CalendarIcon, Eye, Package, CheckCircle, AlertTriangle, Filter, Loader2, Plus, RefreshCw } from "lucide-react"
import { useRelatorios } from "@/hooks/use-database"
import type { NotaFiscal, Relatorio } from "@/lib/database-service"
import { useTheme } from "@/contexts/theme-context"

interface RelatoriosModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RelatoriosModal({ isOpen, onClose }: RelatoriosModalProps) {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [relatoriosFiltrados, setRelatoriosFiltrados] = useState<Relatorio[]>([])
  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroNF, setFiltroNF] = useState("")
  const [dataInicio, setDataInicio] = useState<string>("")
  const [dataFim, setDataFim] = useState<string>("")
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<Relatorio | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [carregandoNotas, setCarregandoNotas] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [notasCarregadas, setNotasCarregadas] = useState<Set<string>>(new Set())

  // Hook do banco de dados
  const { getRelatoriosRecebimento } = useRelatorios()
  
  // Hook do tema
  const { theme } = useTheme()

  // Função para carregar apenas dados básicos dos relatórios
  const carregarRelatorios = useCallback(async (forcarRecarregamento = false) => {
    if (carregando) return
    
    // Evitar recarregar se já temos dados (exceto se forçar)
    if (!forcarRecarregamento && relatorios.length > 0) {
      console.log('ℹ️ Relatórios já carregados, pulando carregamento')
      return
    }
    
    setCarregando(true)
    setErro(null)

    try {
      console.log('🔍 Carregando dados básicos dos relatórios...')
      
      // Timeout de 60 segundos para carregamento inicial
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Carregamento dos relatórios demorou mais de 60 segundos')), 60000)
      })

      const loadPromise = (async () => {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
        // Buscar apenas dados básicos dos relatórios
      const { data: relatoriosData, error: relatoriosError } = await supabase
        .from('relatorios')
          .select(`
            id,
            nome,
            data,
            turno,
            area,
            quantidade_notas,
            soma_volumes,
            total_divergencias,
            data_finalizacao,
            status,
            created_at
          `)
        .eq('area', 'recebimento')
        .order('created_at', { ascending: false })

      if (relatoriosError) {
        console.error('❌ Erro ao buscar relatórios:', relatoriosError)
          throw new Error(`Erro ao carregar relatórios: ${relatoriosError.message}`)
      }

      if (relatoriosData) {
          console.log('✅ Dados básicos dos relatórios carregados:', relatoriosData.length)
        
          // Para cada relatório, buscar apenas colaboradores (sem notas)
          const relatoriosComColaboradores = await Promise.all(
          relatoriosData.map(async (relatorio: any) => {
            let colaboradores: string[] = []
              
              try {
                // Timeout de 15 segundos para busca de colaboradores
                const colaboradoresPromise = (async () => {
                  // Buscar colaboradores do relatório (sem join para evitar erro 400)
              const { data: colaboradoresData, error: colaboradoresError } = await supabase
                  .from('relatorio_colaboradores')
                  .select('user_id')
                  .eq('relatorio_id', relatorio.id)
                  
                  if (!colaboradoresError && colaboradoresData && colaboradoresData.length > 0) {
                  // Buscar nomes dos usuários individualmente
                  const nomesColaboradores = await Promise.all(
                      colaboradoresData.map(async (col: any) => {
                        try {
                      const { data: userData, error: userError } = await supabase
                        .from('users')
                        .select('nome')
                        .eq('id', col.user_id)
                        .single()
                      
                          return !userError && userData ? userData.nome : 'Colaborador sem nome'
                        } catch (error) {
                          console.warn(`⚠️ Erro ao buscar nome do usuário ${col.user_id}:`, error)
                        return 'Colaborador sem nome'
                      }
                    })
                  )
                  
                    return nomesColaboradores.filter((nome): nome is string => typeof nome === 'string')
                  }
                  return []
                })()

                const colaboradoresTimeout = new Promise<string[]>((_, reject) => {
                  setTimeout(() => reject(new Error('Timeout: Busca de colaboradores demorou mais de 15 segundos')), 15000)
                })

                colaboradores = await Promise.race([colaboradoresPromise, colaboradoresTimeout])
              } catch (error) {
                console.error(`❌ Erro ao buscar colaboradores do relatório ${relatorio.id}:`, error)
                colaboradores = []
              }

              return {
                id: relatorio.id,
                nome: relatorio.nome || 'Relatório sem nome',
                colaboradores: colaboradores,
                data: relatorio.data,
                turno: relatorio.turno || 'Não informado',
                area: relatorio.area || 'recebimento',
                quantidadeNotas: relatorio.quantidade_notas || 0,
                somaVolumes: relatorio.soma_volumes || 0,
                totalDivergencias: relatorio.total_divergencias || 0,
                notas: [], // Notas serão carregadas sob demanda
                dataFinalizacao: relatorio.data_finalizacao || new Date().toISOString(),
                status: relatorio.status || 'liberado',
              }
            })
          )

          console.log('✅ Relatórios com colaboradores carregados:', relatoriosComColaboradores.length)
          setRelatorios(relatoriosComColaboradores)
          setRelatoriosFiltrados(relatoriosComColaboradores)
        } else {
          console.log('ℹ️ Nenhum relatório encontrado no banco')
          setRelatorios([])
          setRelatoriosFiltrados([])
        }
      })()

      // Executar com timeout
      await Promise.race([loadPromise, timeoutPromise])
    } catch (error) {
      console.error('❌ Erro geral ao carregar relatórios:', error)
      setErro(`Erro ao carregar relatórios: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setCarregando(false)
    }
  }, [carregando])

  // Função para carregar notas de um relatório específico
  const carregarNotasRelatorio = useCallback(async (relatorioId: string) => {
    if (carregandoNotas || notasCarregadas.has(relatorioId)) return
    
    setCarregandoNotas(true)
    
    try {
      console.log(`🔍 Carregando notas do relatório ${relatorioId}...`)
      
      // Timeout de 45 segundos para carregamento de notas
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Carregamento das notas demorou mais de 45 segundos')), 45000)
      })

      const loadNotasPromise = (async () => {
        const { getSupabase } = await import('@/lib/supabase-client')
        const supabase = getSupabase()
        
        // Buscar IDs das notas relacionadas ao relatório
              const { data: relatorioNotasData, error: relatorioNotasError } = await supabase
                .from('relatorio_notas')
                .select('nota_fiscal_id')
          .eq('relatorio_id', relatorioId)

        if (relatorioNotasError || !relatorioNotasData || relatorioNotasData.length === 0) {
          console.log(`⚠️ Nenhuma nota encontrada para o relatório ${relatorioId}`)
          return
        }

                const notaIds = relatorioNotasData.map((rn: any) => rn.nota_fiscal_id)
        console.log(`✅ Relatório ${relatorioId} tem ${notaIds.length} notas relacionadas`)

        // Buscar detalhes das notas fiscais
                  const { data: notasData, error: notasError } = await supabase
                    .from('notas_fiscais')
                    .select('*')
                    .in('id', notaIds)

        if (notasError || !notasData) {
          console.error('❌ Erro ao buscar notas fiscais:', notasError)
          return
        }

        // Para cada nota, buscar divergências se houver
                    const notasComDivergencias: NotaFiscal[] = await Promise.all(
                      notasData.map(async (nota: any) => {
                        let divergencia = null

                        const { data: divergenciaData, error: divergenciaError } = await supabase
                          .from('divergencias')
                          .select('*')
                          .eq('nota_fiscal_id', nota.id)
                          .single()

                        if (!divergenciaError && divergenciaData) {
                          divergencia = {
                            volumesInformados: divergenciaData.volumes_informados,
                            observacoes: divergenciaData.observacoes
                          }
                        }

                        return {
                          id: nota.id,
                          codigoCompleto: nota.codigo_completo || '',
                          numeroNF: nota.numero_nf || nota.codigo_completo,
                          volumes: nota.volumes || 0,
                          data: nota.data || new Date().toISOString(),
                          tipoCarga: nota.tipo_carga || 'normal',
                          timestamp: nota.timestamp || new Date().toISOString(),
                          destino: nota.destino || 'Não informado',
                          fornecedor: nota.fornecedor || 'Não informado',
                          clienteDestino: nota.cliente_destino || 'Não informado',
                          status: nota.status === 'devolvida' ? 'devolvida' : (divergencia ? 'divergencia' : 'ok'),
                          divergencia: divergencia
                        } as NotaFiscal
                      })
                    )

        // Atualizar o relatório com as notas carregadas
        const relatorioAtualizado = { ...relatorios.find(rel => rel.id === relatorioId), notas: notasComDivergencias }
        
        setRelatorios(prev => prev.map(rel => 
          rel.id === relatorioId 
            ? { ...rel, notas: notasComDivergencias }
            : rel
        ))

        setRelatoriosFiltrados(prev => prev.map(rel => 
          rel.id === relatorioId 
            ? { ...rel, notas: notasComDivergencias }
            : rel
        ))

        // Atualizar o relatório selecionado se for o mesmo
        setRelatorioSelecionado(prev => 
          prev && prev.id === relatorioId 
            ? { ...prev, notas: notasComDivergencias }
            : prev
        )

        // Marcar como carregado
        setNotasCarregadas(prev => new Set([...prev, relatorioId]))
        
        console.log(`✅ Notas carregadas para relatório ${relatorioId}:`, notasComDivergencias.length)
      })()

      // Executar com timeout
      await Promise.race([loadNotasPromise, timeoutPromise])
    } catch (error) {
      console.error(`❌ Erro ao carregar notas do relatório ${relatorioId}:`, error)
    } finally {
      setCarregandoNotas(false)
    }
  }, [carregandoNotas, notasCarregadas])

  const aplicarFiltros = useCallback(() => {
    // Usar useMemo seria melhor, mas mantendo compatibilidade
    let relatoriosFiltrados = [...relatorios]

    // Filtro por texto (otimizado)
    if (filtroTexto.trim()) {
      const termo = filtroTexto.toLowerCase().trim()
      relatoriosFiltrados = relatoriosFiltrados.filter((rel) => {
        const nomeMatch = rel.nome.toLowerCase().includes(termo)
        const colabMatch = Array.isArray(rel.colaboradores) && 
          rel.colaboradores.length > 0 &&
          rel.colaboradores.some(colab => colab && colab.toLowerCase().includes(termo))
        
        // Verificar se é um número (possivelmente NF)
        const isNumero = /^\d+$/.test(termo)
        let nfMatch = false
        
        if (isNumero && Array.isArray(rel.notas) && rel.notas.length > 0) {
          nfMatch = rel.notas.some(nota => 
            nota.numeroNF && nota.numeroNF.includes(termo)
          )
        }
        
        return nomeMatch || colabMatch || nfMatch
      })
    }

    // Filtro por intervalo de datas
    if (dataInicio || dataFim) {
      relatoriosFiltrados = relatoriosFiltrados.filter((rel) => {
        try {
          const dataRelatorio = new Date(rel.data.split('/').reverse().join('-'))
          const dataInicioObj = dataInicio ? new Date(dataInicio) : null
          const dataFimObj = dataFim ? new Date(dataFim) : null
          
          if (dataInicioObj && dataFimObj) {
            return dataRelatorio >= dataInicioObj && dataRelatorio <= dataFimObj
          } else if (dataInicioObj) {
            return dataRelatorio >= dataInicioObj
          } else if (dataFimObj) {
            return dataRelatorio <= dataFimObj
          }
        } catch (error) {
          console.error("❌ Erro ao processar data do relatório:", error)
          return true // Em caso de erro, incluir o relatório
        }
        
        return true
      })
    }

    // Ordenar (otimizado - evitar recálculos desnecessários)
    if (relatoriosFiltrados.length > 1) {
      relatoriosFiltrados.sort((a, b) => {
        const timeA = new Date(a.dataFinalizacao).getTime()
        const timeB = new Date(b.dataFinalizacao).getTime()
        return timeB - timeA
      })
    }

    setRelatoriosFiltrados(relatoriosFiltrados)
  }, [relatorios, filtroTexto, dataInicio, dataFim])

  // Carregar relatórios quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      // Usar setTimeout para não bloquear a renderização inicial do modal
      const timer = setTimeout(() => {
        carregarRelatorios()
      }, 500) // Aumentado para 500ms para melhor estabilidade
      return () => clearTimeout(timer)
    } else {
      // Limpar dados quando o modal fechar para permitir recarregamento
      setRelatorios([])
      setRelatoriosFiltrados([])
      setNotasCarregadas(new Set())
    }
  }, [isOpen]) // Removido carregarRelatorios da dependência para evitar loop

  // Aplicar filtros quando dados mudarem
  useEffect(() => {
    // Debounce para evitar re-renderizações excessivas
    const timer = setTimeout(() => {
      aplicarFiltros()
    }, 500) // Aumentado para 500ms para melhor performance
    return () => clearTimeout(timer)
  }, [relatorios, filtroTexto, dataInicio, dataFim, aplicarFiltros])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lancado":
        return "bg-green-100 text-green-800"
      case "em_lancamento":
        return "bg-blue-100 text-blue-800"
      case "liberado":
        return "bg-purple-100 text-purple-800"
      case "liberado_parcialmente":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-purple-100 text-purple-800"
    }
  }

  // Função para calcular o percentual de progresso do relatório
  const calcularPercentualProgresso = (relatorio: Relatorio): number => {
    // Só calcular se o status é 'liberado' ou 'liberado_parcialmente'
    if (relatorio.status !== 'liberado' && relatorio.status !== 'liberado_parcialmente') {
      return 100
    }

    // Se há notas carregadas, calcular baseado no status das notas
    if (relatorio.notas && relatorio.notas.length > 0) {
      const totalNotas = relatorio.notas.length
      const notasProcessadas = relatorio.notas.filter(nota => 
        nota.status === 'ok' || nota.status === 'devolvida' || nota.status === 'divergencia'
      ).length
      
      return totalNotas > 0 ? Math.round((notasProcessadas / totalNotas) * 100) : 100
    }

    // Se não há notas carregadas, mas há totalDivergencias, calcular baseado nisso
    if (relatorio.totalDivergencias !== undefined && relatorio.totalDivergencias !== null) {
      // Se há divergências, mas todas as notas foram processadas (incluindo divergências)
      // Considerar 100% pois divergências são parte do processamento normal
      return 100
    }
    
    // Por padrão, se está liberado sem problemas aparentes, considerar 100%
    return 100
  }

  // Função para verificar se o relatório foi liberado parcialmente
  const isRelatorioLiberadoParcialmente = (relatorio: Relatorio) => {
    return relatorio.status === 'liberado_parcialmente'
  }

  // Função para formatar o nome do relatório com percentual
  const formatarNomeRelatorio = (relatorio: Relatorio): string => {
    const percentual = calcularPercentualProgresso(relatorio)
    
    if (relatorio.status === 'liberado' && percentual < 100) {
      return `${relatorio.nome} (${percentual}%)`
    }
    
    return relatorio.nome
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "lancado":
        return "Lançado"
      case "em_lancamento":
        return "Em Lançamento"
      case "liberado":
        return "Liberado"
      case "liberado_parcialmente":
        return "Liberado Parcialmente"
      default:
        return "Liberado"
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-700" aria-describedby="relatorios-description">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-200">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Relatórios de Recebimento</span>
              {carregando && relatoriosFiltrados.length > 0 && (
                <span className="ml-2 inline-flex items-center text-xs text-gray-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin dark:text-blue-300" />
                    Atualizando...
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div id="relatorios-description" className="sr-only">
            Modal para visualizar e gerenciar relatórios de recebimento, incluindo filtros por nome, colaboradores e data.
          </div>

          <div className="space-y-6">
            {/* Botões de Ação */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                onClick={() => {
                  setRelatorios([])
                  setRelatoriosFiltrados([])
                  setNotasCarregadas(new Set())
                  carregarRelatorios(true) // Forçar recarregamento
                }}
                variant="outline"
                size="sm"
                disabled={carregando}
                className="flex items-center gap-2"
              >
                {carregando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {carregando ? 'Carregando...' : 'Recarregar'}
              </Button>
            </div>

            {/* Filtros */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-4 dark:bg-blue-900/20">
              <div className="flex items-center space-x-2 mb-3">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-700 dark:text-gray-200">Filtros de Busca</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-2 text-sm text-gray-900 dark:text-gray-200">Buscar por transportadora, colaboradores ou NF</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      placeholder="Nome da transportadora, colaboradores ou número da NF..."
                      value={filtroTexto}
                      onChange={(e) => setFiltroTexto(e.target.value)}
                      className="pl-8 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 text-sm text-gray-900 dark:text-gray-200">Data Início</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => {
                          setDataInicio(e.target.value)
                          // Se data fim for anterior à data início, limpar data fim
                          if (dataFim && e.target.value > dataFim) {
                            setDataFim("")
                          }
                        }}
                        className="pl-8 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>  
                </div>

                <div>
                  <Label className="mb-2 text-sm text-gray-900 dark:text-gray-200">Data Fim</Label> 
                  <div className="space-y-2">
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="pl-8 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                        max={new Date().toISOString().split('T')[0]}
                        min={dataInicio || undefined}
                      />
                    </div>
                  </div>  
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => {
                    setFiltroTexto("")
                    setDataInicio("")
                    setDataFim("")
                  }}
                  variant="outline"
                  size="sm"
                  className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                >
                  Limpar Filtros
                </Button>
                <Button
                  onClick={() => carregarRelatorios()}
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                  disabled={carregando}
                >
                  <Loader2 className={`mr-2 h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
                  Recarregar
                </Button>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Mostrando {relatoriosFiltrados.length} de {relatorios.length} relatórios
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
              <Card className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">{relatoriosFiltrados.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 leading-tight">Relatórios</div>
                </CardContent>
              </Card>
              <Card className="border-green-200 dark:bg-gray-900 dark:border-green-500/50">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">
                    {relatoriosFiltrados.reduce((sum, rel) => sum + rel.quantidadeNotas, 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 leading-tight">Total Notas</div>
                </CardContent>
              </Card>
              <Card className="border-purple-200 dark:bg-gray-900 dark:border-purple-500/50">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {relatoriosFiltrados.reduce((sum, rel) => sum + (rel.somaVolumes || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 leading-tight">Total Volumes</div>
                </CardContent>
              </Card>
              <Card className="border-orange-200 dark:bg-gray-900 dark:border-orange-500/50">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {relatoriosFiltrados.reduce(
                      (sum, rel) => sum + (rel.totalDivergencias || 0),
                      0,
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 leading-tight">Divergências</div>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:bg-gray-900 dark:border-red-500/50">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">
                    {relatoriosFiltrados.reduce((sum, rel) => sum + (rel.notas ? rel.notas.filter((n) => n.status === "devolvida").length : 0), 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 leading-tight">Devolvidas</div>
                </CardContent>
              </Card>
             
            </div>

            {/* Lista de Relatórios */}
            <div className="overflow-y-auto max-h-[60vh] min-h-0">
              {carregando && relatoriosFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400 mt-2">Carregando relatórios...</p>
                </div>
              ) : erro ? (
                <div className="text-center py-8 text-red-500 dark:text-red-400">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-300 dark:text-red-500" />
                  <h3 className="text-lg font-medium mb-2">Erro ao carregar relatórios</h3>
                  <p>{erro}</p>
                </div>
              ) : relatoriosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium mb-2">Nenhum relatório encontrado</h3>
                  <p>Tente ajustar os filtros de busca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 pb-4">
                  {relatoriosFiltrados.map((relatorio) => (
                    <Card key={relatorio.id} className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900 dark:text-gray-200 text-sm">{formatarNomeRelatorio(relatorio)}</span>
                              {isRelatorioLiberadoParcialmente(relatorio) && (
                                <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-600/50 font-medium">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Parcialmente
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(relatorio.status)}`}>
                            {getStatusLabel(relatorio.status)}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600 dark:text-gray-400 text-xs">Colaboradores</div>
                            <div className="font-medium text-gray-900 dark:text-gray-200">
                              {Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0
                                ? relatorio.colaboradores.join(', ')
                                : 'Não informado'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 dark:text-gray-400 text-xs">Data/Turno</div>
                            <div className="font-medium text-gray-900 dark:text-gray-200">
                              {relatorio.data} - {relatorio.turno}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 py-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{relatorio.quantidadeNotas}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Notas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {relatorio.somaVolumes || 0}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Volumes</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600 dark:text-red-400">
                              {relatorio.totalDivergencias || 0}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Divergências</div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Liberado em: {new Date(relatorio.dataFinalizacao).toLocaleString("pt-BR")}
                        </div>

                        <Button
                          onClick={async () => {
                            setRelatorioSelecionado(relatorio)
                            // Carregar notas se ainda não foram carregadas
                            if (relatorio.id && !notasCarregadas.has(relatorio.id)) {
                              await carregarNotasRelatorio(relatorio.id)
                            }
                          }}
                          variant="outline"
                          className="w-full bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                          size="sm"
                          disabled={carregandoNotas}
                        >
                          {carregandoNotas ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                          <Eye className="h-3 w-3" />
                          )}
                          {carregandoNotas ? 'Carregando...' : 'Ver Detalhes'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Relatório */}
      {relatorioSelecionado && (
        <Dialog open={!!relatorioSelecionado} onOpenChange={() => setRelatorioSelecionado(null)}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-700" aria-describedby="relatorio-detalhes-description">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-200">
                <Package className="h-5 w-5 text-blue-600" />
                <div className="flex items-center space-x-2">
                  <span>{formatarNomeRelatorio(relatorioSelecionado)} - Detalhes</span>
                  {isRelatorioLiberadoParcialmente(relatorioSelecionado) && (
                    <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-600/50 font-medium">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Liberado Parcialmente
                    </Badge>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            <div id="relatorio-detalhes-description" className="sr-only">
              Detalhes do relatório de recebimento, incluindo informações sobre colaboradores, notas fiscais e divergências.
            </div>

            <div className="space-y-4">
              {/* Alerta de Liberação Parcial */}
              {isRelatorioLiberadoParcialmente(relatorioSelecionado) && (
                <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600/50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-700 dark:text-orange-300 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-200">⚠️ Liberação Parcial</h4>
                      <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">
                        Este relatório foi liberado parcialmente. Algumas notas podem ter divergências ou não foram completamente processadas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo do Relatório */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Transportadora</div>
                  <div className="font-medium text-gray-900 dark:text-gray-200">{formatarNomeRelatorio(relatorioSelecionado)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Colaboradores</div>
                  <div className="font-medium text-gray-900 dark:text-gray-200">
                    {Array.isArray(relatorioSelecionado.colaboradores) && relatorioSelecionado.colaboradores.length > 0
                      ? relatorioSelecionado.colaboradores.join(', ')
                      : 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Data/Turno</div>
                  <div className="font-medium text-gray-900 dark:text-gray-200">
                    {relatorioSelecionado.data} - {relatorioSelecionado.turno}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                  <Badge className={getStatusColor(relatorioSelecionado.status)}>
                    {getStatusLabel(relatorioSelecionado.status)}
                  </Badge>
                </div>
              </div>

              {/* Tabela de Notas */}
              {carregandoNotas ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400"> </span>
                  </div>
                </div>
              ) : relatorioSelecionado.notas && relatorioSelecionado.notas.length > 0 ? (
                <ScrollArea className="h-[50vh] min-h-0">
                  <div className="border dark:border-gray-600 rounded-lg overflow-x-auto">
                    <div className="min-w-max">
                      <div className="bg-gray-50 dark:bg-gray-800 px-2 sm:px-4 py-2 grid grid-cols-6 sm:grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200">
                        <div>NF</div>
                        <div>Volumes</div>
                        <div className="hidden sm:block">Destino</div>
                        <div className="hidden lg:block">Fornecedor</div>
                        <div className="hidden lg:block">Cliente</div>
                        <div>Status</div>
                        <div>Divergência</div>
                      </div>
                      {relatorioSelecionado.notas.map((nota: any, index: any) => (
                        <div
                          key={nota.id}
                          className={`px-2 sm:px-4 py-2 grid grid-cols-6 sm:grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm ${
                            index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"
                          }`}
                        >
                          <div className="font-medium truncate text-gray-900 dark:text-gray-200" title={nota.numeroNF}>{nota.numeroNF}</div>
                          <div className="font-mono text-gray-900 dark:text-gray-200">
                            {nota.divergencia?.volumesInformados || nota.volumes}
                            {nota.divergencia?.volumesInformados !== nota.volumes && (
                              <span className="text-orange-600 dark:text-orange-400 text-xs ml-1">(era {nota.volumes})</span>
                            )}
                          </div>
                          <div className="hidden sm:block text-xs truncate text-gray-900 dark:text-gray-200" title={nota.destino}>{nota.destino}</div>
                          <div className="hidden lg:block text-xs truncate text-gray-900 dark:text-gray-200" title={nota.fornecedor}>{nota.fornecedor}</div>
                          <div className="hidden lg:block text-xs truncate text-gray-900 dark:text-gray-200" title={nota.clienteDestino}>{nota.clienteDestino}</div>
                          <div className="flex items-center">
                            {nota.status === "ok" ? (
                              <div className="flex items-center text-green-600 dark:text-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <span className="text-xs">OK</span>
                              </div>
                            ) : nota.status === "devolvida" ? (
                              <div className="flex items-center text-red-600 dark:text-red-400">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                <span className="text-xs">Devolvida</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                <span className="text-xs">Div.</span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs truncate text-gray-900 dark:text-gray-200" title={nota.divergencia ? `${nota.divergencia.volumesInformados} vol. - ${nota.divergencia.observacoes}` : ''}>
                            {nota.divergencia ? (
                              <div className="text-orange-600 dark:text-orange-400">
                                <div className="font-medium">{nota.divergencia.volumesInformados} vol.</div>
                                {nota.divergencia.observacoes && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {nota.divergencia.observacoes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="bg-blue-50 dark:bg-blue-900/20 px-2 sm:px-4 py-2 grid grid-cols-6 sm:grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300">
                        <div className="col-span-3 sm:col-span-4">Total:</div>
                        <div className="text-center">
                          {relatorioSelecionado.notas.reduce(
                            (sum: any, nota: any) => sum + (nota.divergencia?.volumesInformados || nota.volumes),
                            0,
                          )}
                        </div>
                        <div className="col-span-2 sm:col-span-2"></div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma nota disponível</h3>
                  <p>Este relatório não possui notas detalhadas.</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setRelatorioSelecionado(null)} variant="outline" className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
  