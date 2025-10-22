"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FileText, Search, CalendarIcon, Eye, Package, CheckCircle, AlertTriangle, Filter, Loader2, Plus, RefreshCw, Database } from "lucide-react"
import { useRelatorios } from "@/hooks/use-database"
import { useRelatoriosCache } from "@/hooks/use-relatorios-cache"
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
  
  // Hook do cache de relatórios
  const {
    isRelatorioCached,
    getRelatorioFromCache,
    saveRelatorioToCache,
    updateRelatorioInCache,
    getCacheStats
  } = useRelatoriosCache()
  
  // Hook do tema
  const { theme } = useTheme()

  // Refs para evitar reflows forçados
  const modalRef = useRef<HTMLDivElement>(null)
  const focusTimeoutRef = useRef<NodeJS.Timeout>()

  // Otimizar foco do modal sem causar reflows
  useEffect(() => {
    if (isOpen) {
      // Usar requestAnimationFrame para evitar reflows forçados
      const focusElement = () => {
        requestAnimationFrame(() => {
          if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          
          // Focar no primeiro elemento focável do modal
          if (modalRef.current) {
            const firstFocusable = modalRef.current.querySelector('input, button, [tabindex]:not([tabindex="-1"])') as HTMLElement
            if (firstFocusable) {
              firstFocusable.focus()
            }
          }
        })
      }

      // Limpar timeout anterior se existir
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current)
      }
      
      // Usar setTimeout com requestAnimationFrame para melhor performance
      focusTimeoutRef.current = setTimeout(focusElement, 100)
    }

    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current)
      }
    }
  }, [isOpen])

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

  // Função para carregar notas de um relatório específico (com cache)
  const carregarNotasRelatorio = useCallback(async (relatorioId: string) => {
    if (carregandoNotas || notasCarregadas.has(relatorioId)) return
    
    // Verificar se o relatório está em cache
    if (isRelatorioCached(relatorioId)) {
      console.log(`📦 Relatório ${relatorioId} encontrado no cache, carregando...`)
      
      const relatorioCached = getRelatorioFromCache(relatorioId)
      if (relatorioCached && relatorioCached.notas) {
        // Atualizar estados com dados do cache
        setRelatorios(prev => prev.map(rel => 
          rel.id === relatorioId 
            ? { ...rel, notas: relatorioCached.notas }
            : rel
        ))

        setRelatoriosFiltrados(prev => prev.map(rel => 
          rel.id === relatorioId 
            ? { ...rel, notas: relatorioCached.notas }
            : rel
        ))

        setRelatorioSelecionado(prev => 
          prev && prev.id === relatorioId 
            ? { ...prev, notas: relatorioCached.notas }
            : prev
        )

        setNotasCarregadas(prev => new Set([...prev, relatorioId]))
        
        console.log(`✅ Notas carregadas do cache para relatório ${relatorioId}:`, relatorioCached.notas.length)
        return
      }
    }
    
    setCarregandoNotas(true)
    
    try {
      console.log(`🔍 Carregando notas do relatório ${relatorioId} do banco de dados...`)
      
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
        console.log(`🔍 Buscando detalhes das notas fiscais com IDs:`, notaIds)
        const { data: notasData, error: notasError } = await supabase
          .from('notas_fiscais')
          .select('*')
          .in('id', notaIds)

        if (notasError || !notasData) {
          console.error('❌ Erro ao buscar notas fiscais:', notasError)
          return
        }
        
        console.log(`🔍 Notas fiscais encontradas:`, notasData.length)
        if (notasData.length > 0) {
          console.log(`🔍 Primeira nota fiscal:`, {
            id: notasData[0].id,
            numero_nf: notasData[0].numero_nf,
            status: notasData[0].status,
            volumes: notasData[0].volumes
          })
        }

        // Buscar todas as divergências de uma vez para melhor performance
        const notasIdsParaDivergencias = notasData.map(nota => nota.id)
        console.log(`🔍 IDs das notas para buscar divergências:`, notasIdsParaDivergencias)
        
        const { data: todasDivergencias, error: divergenciasError } = await supabase
          .from('divergencias')
          .select('*')
          .in('nota_fiscal_id', notasIdsParaDivergencias)
          
        if (divergenciasError) {
          console.error('❌ Erro ao buscar divergências:', divergenciasError)
        }

        console.log(`🔍 Divergências encontradas:`, todasDivergencias?.length || 0)
        if (todasDivergencias && todasDivergencias.length > 0) {
          console.log(`🔍 Primeira divergência:`, todasDivergencias[0])
        } else {
          console.log(`⚠️ Nenhuma divergência encontrada para as notas:`, notasIdsParaDivergencias)
          // Verificar se há divergências para cada nota individualmente
          for (const notaId of notasIdsParaDivergencias) {
            const { data: divergenciaIndividual, error: erroIndividual } = await supabase
              .from('divergencias')
              .select('*')
              .eq('nota_fiscal_id', notaId as string)
            console.log(`🔍 Verificação individual para nota ${notaId}:`, divergenciaIndividual?.length || 0, 'divergências')
            if (divergenciaIndividual && divergenciaIndividual.length > 0) {
              console.log(`🔍 Divergência individual encontrada:`, divergenciaIndividual[0])
            }
          }
        }

        // Criar mapa de divergências por nota_fiscal_id
        const divergenciasMap: { [key: string]: any } = {}
        if (!divergenciasError && todasDivergencias) {
          todasDivergencias.forEach(div => {
            divergenciasMap[div.nota_fiscal_id as string] = div
            console.log(`🔍 Mapeando divergência para nota ${div.nota_fiscal_id}:`, div)
          })
        }
        
        console.log(`🔍 Mapa de divergências criado:`, Object.keys(divergenciasMap).length, 'divergências')

        // Para cada nota, processar com divergências
        const notasComDivergencias: NotaFiscal[] = notasData.map((nota: any) => {
          const divergencia = divergenciasMap[nota.id]
          
          console.log(`🔍 Processando nota ${nota.numero_nf} (ID: ${nota.id}):`)
          console.log(`  - Status na tabela notas_fiscais: ${nota.status}`)
          console.log(`  - Divergência encontrada:`, divergencia ? 'SIM' : 'NÃO')
          if (divergencia) {
            console.log(`  - Detalhes da divergência:`, divergencia)
          }
          
          // Determinar o status da nota (mesma lógica da página de custos)
          let status: 'ok' | 'divergencia' | 'devolvida'
          if (nota.status === 'devolvida') {
            status = 'devolvida'
            console.log(`  - Status final: devolvida (baseado no status da tabela)`)
          } else if (divergencia) {
            status = 'divergencia'
            console.log(`  - Status final: divergencia (baseado na divergência encontrada)`)
          } else {
            status = 'ok'
            console.log(`  - Status final: ok (sem divergência)`)
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
            status: status,
            divergencia: divergencia ? {
              volumesInformados: divergencia.volumes_informados,
              observacoes: divergencia.observacoes
            } : null
          } as NotaFiscal
        })

        // Encontrar o relatório original
        const relatorioOriginal = relatorios.find(rel => rel.id === relatorioId)
        if (!relatorioOriginal) {
          console.error(`❌ Relatório ${relatorioId} não encontrado na lista`)
          return
        }

        // Criar relatório atualizado
        const relatorioAtualizado = { 
          ...relatorioOriginal, 
          notas: notasComDivergencias 
        }

        // Salvar no cache
        saveRelatorioToCache(relatorioAtualizado, notasComDivergencias)
        
        // Atualizar estados
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

        setRelatorioSelecionado(prev => 
          prev && prev.id === relatorioId 
            ? { ...prev, notas: notasComDivergencias }
            : prev
        )

        // Marcar como carregado
        setNotasCarregadas(prev => new Set([...prev, relatorioId]))
        
        console.log(`✅ Notas carregadas e salvas no cache para relatório ${relatorioId}:`, notasComDivergencias.length)
      })()

      // Executar com timeout
      await Promise.race([loadNotasPromise, timeoutPromise])
    } catch (error) {
      console.error(`❌ Erro ao carregar notas do relatório ${relatorioId}:`, error)
    } finally {
      setCarregandoNotas(false)
    }
  }, [carregandoNotas, notasCarregadas, isRelatorioCached, getRelatorioFromCache, saveRelatorioToCache, relatorios])

  // Otimizar filtros com useMemo para evitar recálculos desnecessários
  const relatoriosFiltradosMemo = useMemo(() => {
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

    return relatoriosFiltrados
  }, [relatorios, filtroTexto, dataInicio, dataFim])

  // Atualizar estado apenas quando necessário
  useEffect(() => {
    setRelatoriosFiltrados(relatoriosFiltradosMemo)
  }, [relatoriosFiltradosMemo])

  // Carregar relatórios quando o modal abrir (otimizado)
  useEffect(() => {
    if (isOpen) {
      // Usar requestIdleCallback para melhor performance
      const loadData = () => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => carregarRelatorios(), { timeout: 1000 })
        } else {
          setTimeout(() => carregarRelatorios(), 100)
        }
      }
      
      loadData()
    } else {
      // Limpar dados quando o modal fechar para permitir recarregamento
      setRelatorios([])
      setRelatoriosFiltrados([])
      setNotasCarregadas(new Set())
    }
  }, [isOpen])

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

  // Função para calcular o percentual de progresso do relatório (memoizada)
  const calcularPercentualProgresso = useCallback((relatorio: Relatorio): number => {
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
  }, [])

  // Função para verificar se o relatório foi liberado parcialmente
  const isRelatorioLiberadoParcialmente = (relatorio: Relatorio) => {
    return relatorio.status === 'liberado_parcialmente'
  }

  // Função otimizada para visualizar detalhes do relatório
  const handleViewDetails = useCallback(async (relatorio: Relatorio) => {
    requestAnimationFrame(async () => {
      setRelatorioSelecionado(relatorio)
      if (relatorio.id && !notasCarregadas.has(relatorio.id)) {
        await carregarNotasRelatorio(relatorio.id)
      }
    })
  }, [notasCarregadas, carregarNotasRelatorio])

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
        <DialogContent ref={modalRef} className="max-w-8xl max-h-[95vh] w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[90vw] overflow-hidden dark:bg-gray-900 dark:border-gray-700 coletor-modal">
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
            <DialogDescription>
              Visualize e gerencie relatórios de recebimento, incluindo filtros por nome, colaboradores e data
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Header fixo */}
            <div className="flex-shrink-0 coletor-modal-header">
           

              {/* Filtros */}
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg space-y-3 sm:space-y-4 dark:bg-blue-900/20">
                <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-700 dark:text-gray-200 text-sm sm:text-base">Filtros de Busca</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-900 dark:text-gray-200">Buscar por transportadora, colaboradores ou NF</Label>
                    <div className="relative">
                      <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        placeholder="Nome da transportadora, colaboradores ou número da NF..."
                        value={filtroTexto}
                        onChange={(e) => setFiltroTexto(e.target.value)}
                        className="pl-6 sm:pl-8 text-xs sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 h-8 sm:h-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-900 dark:text-gray-200">Data Início</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500" />
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
                        className="pl-6 sm:pl-8 text-xs sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 h-8 sm:h-10"
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-900 dark:text-gray-200">Data Fim</Label> 
                    <div className="relative">
                      <CalendarIcon className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="pl-6 sm:pl-8 text-xs sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 h-8 sm:h-10"
                        max={new Date().toISOString().split('T')[0]}
                        min={dataInicio || undefined}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                 
                  <Button
                onClick={useCallback(() => {
                  // Usar requestAnimationFrame para não bloquear a UI
                  requestAnimationFrame(() => {
                    setRelatorios([])
                    setRelatoriosFiltrados([])
                    setNotasCarregadas(new Set())
                    carregarRelatorios(true) // Forçar recarregamento
                  })
                }, [carregarRelatorios])}
                variant="outline"
                size="sm"
                disabled={carregando}
                className="flex items-center gap-2"
              >
                {carregando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {carregando ? 'Carregando...' : 'Recarregar'}
              </Button>
              <Button
                    onClick={useCallback(() => {
                      // Usar requestAnimationFrame para não bloquear a UI
                      requestAnimationFrame(() => {
                        setFiltroTexto("")
                        setDataInicio("")
                        setDataFim("")
                      })
                    }, [])}
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm h-7 sm:h-9 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                  >
                    Limpar Filtros
                  </Button>
                  {/* <Button
                    onClick={() => carregarRelatorios()}
                    variant="outline"
                    size="sm"
                    className="inline-flex items-center text-xs sm:text-sm h-7 sm:h-8 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                    disabled={carregando}
                  >
                    <Loader2 className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 ${carregando ? 'animate-spin' : ''}`} />
                    Recarregar
                  </Button> */}
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    Mostrando {relatoriosFiltrados.length} de {relatorios.length} relatórios
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2 mb-2 mp-2">
                <Card className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50">
                  <CardContent className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-blue-600 dark:text-blue-400">{relatoriosFiltrados.length}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-tight">Relatórios</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 dark:bg-gray-900 dark:border-green-500/50">
                  <CardContent className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-green-600 dark:text-green-400">
                      {relatoriosFiltrados.reduce((sum, rel) => sum + rel.quantidadeNotas, 0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 leading-tight">Total Notas</div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 dark:bg-gray-900 dark:border-purple-500/50">
                  <CardContent className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-purple-600 dark:text-purple-400">
                      {relatoriosFiltrados.reduce((sum, rel) => sum + (rel.somaVolumes || 0), 0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 leading-tight">Total Volumes</div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 dark:bg-gray-900 dark:border-orange-500/50">
                  <CardContent className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-orange-600 dark:text-orange-400">
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
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-red-600 dark:text-red-400">
                      {relatoriosFiltrados.reduce((sum, rel) => sum + (rel.notas ? rel.notas.filter((n) => n.status === "devolvida").length : 0), 0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 leading-tight">Devolvidas</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Lista de Relatórios - Área de Scroll */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full coletor-scroll">
                <div className="p-1">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 pb-4">
                      {relatoriosFiltrados.map((relatorio) => (
                        <RelatorioCard 
                          key={relatorio.id} 
                          relatorio={relatorio}
                          onViewDetails={() => handleViewDetails(relatorio)}
                          isCached={relatorio.id ? isRelatorioCached(relatorio.id) : false}
                          carregandoNotas={carregandoNotas}
                          calcularPercentualProgresso={calcularPercentualProgresso}
                          isRelatorioLiberadoParcialmente={isRelatorioLiberadoParcialmente}
                          formatarNomeRelatorio={formatarNomeRelatorio}
                          getStatusColor={getStatusColor}
                          getStatusLabel={getStatusLabel}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Relatório */}
      {relatorioSelecionado && (
        <Dialog open={!!relatorioSelecionado} onOpenChange={() => setRelatorioSelecionado(null)}>
          <DialogContent className="max-w-7xl max-h-[90vh] w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] overflow-hidden dark:bg-gray-900 dark:border-gray-700 coletor-modal">
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
              <DialogDescription>
                Detalhes do relatório de recebimento, incluindo informações sobre colaboradores, notas fiscais e divergências
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col h-full max-h-[80vh]">
              {/* Header fixo */}
              <div className="flex-shrink-0 space-y-4">
                {/* Alerta de Liberação Parcial */}
                {isRelatorioLiberadoParcialmente(relatorioSelecionado) && (
                  <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600/50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-700 dark:text-orange-300 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-orange-900 dark:text-orange-200">⚠️ Liberação Parcial</h4>
                        <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300 mt-1">
                          Este relatório foi liberado parcialmente. Algumas notas podem ter divergências ou não foram completamente processadas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumo do Relatório */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Transportadora</div>
                    <div className="font-medium text-gray-900 dark:text-gray-200 text-xs sm:text-sm truncate" title={formatarNomeRelatorio(relatorioSelecionado)}>
                      {formatarNomeRelatorio(relatorioSelecionado)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Colaboradores</div>
                    <div className="font-medium text-gray-900 dark:text-gray-200 text-xs sm:text-sm truncate" title={Array.isArray(relatorioSelecionado.colaboradores) && relatorioSelecionado.colaboradores.length > 0 ? relatorioSelecionado.colaboradores.join(', ') : 'Não informado'}>
                      {Array.isArray(relatorioSelecionado.colaboradores) && relatorioSelecionado.colaboradores.length > 0
                        ? relatorioSelecionado.colaboradores.join(', ')
                        : 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Data/Turno</div>
                    <div className="font-medium text-gray-900 dark:text-gray-200 text-xs sm:text-sm">
                      {relatorioSelecionado.data} - {relatorioSelecionado.turno}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Status</div>
                    <Badge className={`text-xs ${getStatusColor(relatorioSelecionado.status)}`}>
                      {getStatusLabel(relatorioSelecionado.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Área de Scroll para Tabela de Notas */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {carregandoNotas ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Carregando notas...</span>
                    </div>
                  </div>
                ) : relatorioSelecionado.notas && relatorioSelecionado.notas.length > 0 ? (
                  <ScrollArea className="h-full coletor-scroll">
                    <div className="p-1">
                      <div className="border dark:border-gray-600 rounded-lg overflow-x-auto">
                        <div className="min-w-[800px]">
                          <div className="bg-gray-50 dark:bg-gray-800 px-2 sm:px-4 py-2 grid grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200">
                            <div className="min-w-[80px]">NF</div>
                            <div className="min-w-[100px]">Volumes</div>
                            <div className="min-w-[80px] hidden sm:block">Destino</div>
                            <div className="min-w-[120px] hidden lg:block">Fornecedor</div>
                            <div className="min-w-[80px] hidden lg:block">Cliente</div>
                            <div className="min-w-[80px]">Status</div>
                            <div className="min-w-[150px]">Divergência</div>
                          </div>
                          {relatorioSelecionado.notas.map((nota: any, index: any) => (
                            <div
                              key={nota.id}
                              className={`px-2 sm:px-4 py-2 grid grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm ${
                                index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"
                              }`}
                            >
                              <div className="font-medium truncate text-gray-900 dark:text-gray-200 min-w-[80px]" title={nota.numeroNF}>{nota.numeroNF}</div>
                              <div className="font-mono text-gray-900 dark:text-gray-200 min-w-[100px]">
                                {nota.divergencia?.volumesInformados || nota.volumes}
                                {nota.divergencia?.volumesInformados !== nota.volumes && (
                                  <span className="text-orange-600 dark:text-orange-400 text-xs ml-1">(era {nota.volumes})</span>
                                )}
                              </div>
                              <div className="hidden sm:block text-xs truncate text-gray-900 dark:text-gray-200 min-w-[80px]" title={nota.destino}>{nota.destino}</div>
                              <div className="hidden lg:block text-xs truncate text-gray-900 dark:text-gray-200 min-w-[120px]" title={nota.fornecedor}>{nota.fornecedor}</div>
                              <div className="hidden lg:block text-xs truncate text-gray-900 dark:text-gray-200 min-w-[80px]" title={nota.clienteDestino}>{nota.clienteDestino}</div>
                              <div className="flex items-center min-w-[80px]">
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
                              <div className="text-xs text-gray-900 dark:text-gray-200 min-w-[150px]" title={nota.divergencia ? `${nota.divergencia.volumesInformados} vol. - ${nota.divergencia.observacoes}` : ''}>
                                {nota.divergencia ? (
                                  <div className="text-orange-600 dark:text-orange-400">
                                    <div className="font-medium">{nota.divergencia.volumesInformados} vol.</div>
                                    {nota.divergencia.observacoes && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
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
                          <div className="bg-blue-50 dark:bg-blue-900/20 px-2 sm:px-4 py-2 grid grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300">
                            <div className="col-span-3">Total:</div>
                            <div className="text-center">
                              {relatorioSelecionado.notas.reduce(
                                (sum: any, nota: any) => sum + (nota.divergencia?.volumesInformados || nota.volumes),
                                0,
                              )}
                            </div>
                            <div className="col-span-3"></div>
                          </div>
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
              </div>

              {/* Footer fixo */}
              <div className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end">
                  <Button onClick={() => setRelatorioSelecionado(null)} variant="outline" className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 h-8 sm:h-9">
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// Componente otimizado para card de relatório
interface RelatorioCardProps {
  relatorio: Relatorio
  onViewDetails: () => void
  isCached: boolean
  carregandoNotas: boolean
  calcularPercentualProgresso: (relatorio: Relatorio) => number
  isRelatorioLiberadoParcialmente: (relatorio: Relatorio) => boolean
  formatarNomeRelatorio: (relatorio: Relatorio) => string
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string) => string
}

const RelatorioCard = React.memo(({
  relatorio,
  onViewDetails,
  isCached,
  carregandoNotas,
  calcularPercentualProgresso,
  isRelatorioLiberadoParcialmente,
  formatarNomeRelatorio,
  getStatusColor,
  getStatusLabel
}: RelatorioCardProps) => {
  return (
    <Card className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
              <span className="font-semibold text-gray-900 dark:text-gray-200 text-xs sm:text-sm truncate" title={formatarNomeRelatorio(relatorio)}>
                {formatarNomeRelatorio(relatorio)}
              </span>
              {isRelatorioLiberadoParcialmente(relatorio) && (
                <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-600/50 font-medium flex-shrink-0">
                  <AlertTriangle className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                  <span className="hidden sm:inline">Parcialmente</span>
                  <span className="sm:hidden">Parc.</span>
                </Badge>
              )}
            </div>
          </div>
          <Badge className={`text-xs flex-shrink-0 ${getStatusColor(relatorio.status)}`}>
            {getStatusLabel(relatorio.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 sm:space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400 text-xs">Colaboradores</div>
            <div className="font-medium text-gray-900 dark:text-gray-200 truncate" title={Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0 ? relatorio.colaboradores.join(', ') : 'Não informado'}>
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

        <div className="grid grid-cols-3 gap-2 sm:gap-4 py-1 sm:py-2">
          <div className="text-center">
            <div className="text-sm sm:text-lg font-bold text-blue-600 dark:text-blue-400">{relatorio.quantidadeNotas}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Notas</div>
          </div>
          <div className="text-center">
            <div className="text-sm sm:text-lg font-bold text-green-600 dark:text-green-400">
              {relatorio.somaVolumes || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Volumes</div>
          </div>
          <div className="text-center">
            <div className="text-sm sm:text-lg font-bold text-red-600 dark:text-red-400">
              {relatorio.totalDivergencias || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Divergências</div>
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Liberado em: {new Date(relatorio.dataFinalizacao).toLocaleString("pt-BR")}
        </div>

        <Button
          onClick={onViewDetails}
          variant="outline"
          className="w-full bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 h-8 sm:h-9"
          size="sm"
          disabled={carregandoNotas}
        >
          {carregandoNotas ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
          <span className="ml-1 sm:ml-2 text-xs sm:text-sm">
            {carregandoNotas ? 'Carregando...' : 
             isCached ? 'Ver Detalhes (Cache)' : 'Ver Detalhes'}
          </span>
        </Button>
      </CardContent>
    </Card>
  )
})

RelatorioCard.displayName = 'RelatorioCard'

  