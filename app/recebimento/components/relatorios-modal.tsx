"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FileText, Search, CalendarIcon, Eye, Package, CheckCircle, AlertTriangle, Filter, Loader2, Plus, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useRelatorios } from "@/hooks/use-database"
import type { NotaFiscal, Relatorio } from "@/lib/database-service"

interface RelatoriosModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RelatoriosModal({ isOpen, onClose }: RelatoriosModalProps) {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [relatoriosFiltrados, setRelatoriosFiltrados] = useState<Relatorio[]>([])
  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroNF, setFiltroNF] = useState("")
  const [dataFiltro, setDataFiltro] = useState<Date | undefined>(undefined)
  const [popoverAberto, setPopoverAberto] = useState(false)
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<Relatorio | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Hook do banco de dados
  const { getRelatoriosRecebimento } = useRelatorios()

  // Memoizar função de carregamento de relatórios
  const carregarRelatorios = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (carregando) return
    
    setCarregando(true)
    setErro(null)

    try {
      console.log('🔍 Carregando relatórios de recebimento...')
      
      // Busca direta do banco (mais confiável)
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      console.log('🔍 Executando query no banco...')
      
      // Primeiro, buscar apenas os relatórios
      const { data: relatoriosData, error: relatoriosError } = await supabase
        .from('relatorios')
        .select('*')
        .eq('area', 'recebimento')
        .order('created_at', { ascending: false })

      if (relatoriosError) {
        console.error('❌ Erro ao buscar relatórios:', relatoriosError)
        setErro(`Erro ao carregar relatórios: ${relatoriosError.message}`)
        return
      }

      if (relatoriosData) {
        console.log('✅ Relatórios carregados diretamente do banco:', relatoriosData.length)
        console.log('🔍 Dados brutos:', relatoriosData)
        
        // Para cada relatório, buscar colaboradores e notas relacionadas
        const relatoriosCompletos = await Promise.all(
          relatoriosData.map(async (relatorio: any) => {
            let colaboradores: string[] = []
            let notas: any[] = []
            
            console.log(`🔍 Processando relatório: ${relatorio.id} - ${relatorio.nome}`)
            
            try {
              // 1. Buscar colaboradores do relatório
              console.log(`🔍 Buscando colaboradores para relatório ${relatorio.id}...`)
              
              // Primeiro, tentar buscar colaboradores da tabela relatorio_colaboradores
              const { data: colaboradoresData, error: colaboradoresError } = await supabase
                .from('relatorio_colaboradores')
                .select(`
                  user_id,
                  users!inner(nome)
                `)
                .eq('relatorio_id', relatorio.id)
              
              console.log(`🔍 Resultado busca colaboradores:`, { colaboradoresData, colaboradoresError })
              
              if (!colaboradoresError && colaboradoresData && colaboradoresData.length > 0) {
                colaboradores = colaboradoresData.map((col: any) => col.users?.nome || 'Colaborador sem nome')
                console.log(`✅ Relatório ${relatorio.id} tem ${colaboradores.length} colaboradores:`, colaboradores)
              } else {
                console.log(`⚠️ Relatório ${relatorio.id} não tem colaboradores ou erro:`, colaboradoresError)
                
                // Tentar busca alternativa sem inner join
                console.log(`🔍 Tentando busca alternativa de colaboradores...`)
                const { data: colaboradoresAlt, error: colaboradoresAltError } = await supabase
                  .from('relatorio_colaboradores')
                  .select('user_id')
                  .eq('relatorio_id', relatorio.id)
                
                if (!colaboradoresAltError && colaboradoresAlt && colaboradoresAlt.length > 0) {
                  console.log(`🔍 IDs de colaboradores encontrados:`, colaboradoresAlt.map(c => c.user_id))
                  
                  // Buscar nomes dos usuários individualmente
                  const nomesColaboradores = await Promise.all(
                    colaboradoresAlt.map(async (col: any) => {
                      const { data: userData, error: userError } = await supabase
                        .from('users')
                        .select('nome')
                        .eq('id', col.user_id)
                        .single()
                      
                      if (!userError && userData) {
                        return userData.nome
                      } else {
                        console.log(`⚠️ Erro ao buscar usuário ${col.user_id}:`, userError)
                        return 'Colaborador sem nome'
                      }
                    })
                  )
                  
                  colaboradores = nomesColaboradores.filter((nome): nome is string => typeof nome === 'string')
                  console.log(`✅ Colaboradores encontrados via busca alternativa:`, colaboradores)
                } else {
                  // Se não encontrar colaboradores na tabela relatorio_colaboradores, 
                  // tentar usar os colaboradores armazenados diretamente no relatório
                  console.log(`🔍 Tentando usar colaboradores armazenados no relatório...`)
                  if (relatorio.colaboradores && Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0) {
                    colaboradores = relatorio.colaboradores
                    console.log(`✅ Colaboradores encontrados no relatório:`, colaboradores)
                  } else {
                    console.log(`⚠️ Nenhum colaborador encontrado para relatório ${relatorio.id}`)
                    colaboradores = []
                  }
                }
              }

              // 2. Buscar as notas relacionadas ao relatório
              console.log(`🔍 Buscando notas para relatório ${relatorio.id}...`)
              const { data: relatorioNotasData, error: relatorioNotasError } = await supabase
                .from('relatorio_notas')
                .select('nota_fiscal_id')
                .eq('relatorio_id', relatorio.id)

              console.log(`🔍 Resultado busca relatorio_notas:`, { relatorioNotasData, relatorioNotasError })

              if (!relatorioNotasError && relatorioNotasData && relatorioNotasData.length > 0) {
                const notaIds = relatorioNotasData.map((rn: any) => rn.nota_fiscal_id)
                console.log(`✅ Relatório ${relatorio.id} tem ${notaIds.length} notas relacionadas:`, notaIds)

                if (notaIds.length > 0) {
                  // 3. Buscar os detalhes das notas fiscais
                  console.log(`🔍 Buscando detalhes das notas fiscais...`)
                  const { data: notasData, error: notasError } = await supabase
                    .from('notas_fiscais')
                    .select('*')
                    .in('id', notaIds)

                  console.log(`🔍 Resultado busca notas_fiscais:`, { notasData, notasError })

                  if (!notasError && notasData) {
                    console.log(`✅ Notas fiscais carregadas para relatório ${relatorio.id}:`, notasData.length)
                    console.log(`🔍 Dados das notas:`, notasData)

                    // 4. Para cada nota, buscar divergências se houver
                    const notasComDivergencias = await Promise.all(
                      notasData.map(async (nota: any) => {
                        let divergencia = null

                        // Buscar divergência da nota
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
                          numeroNF: nota.numero_nf || nota.codigo_completo,
                          volumes: nota.volumes || 0,
                          destino: nota.destino || 'Não informado',
                          fornecedor: nota.fornecedor || 'Não informado',
                          clienteDestino: nota.cliente_destino || 'Não informado',
                          status: nota.status === 'devolvida' ? 'devolvida' : (divergencia ? 'divergencia' : 'ok'),
                          divergencia: divergencia
                        }
                      })
                    )

                    notas = notasComDivergencias
                    console.log(`✅ Notas processadas para relatório ${relatorio.id}:`, notas.length)
                  } else {
                    console.log(`⚠️ Erro ao buscar notas fiscais:`, notasError)
                    notas = []
                  }
                } else {
                  console.log(`⚠️ Nenhum ID de nota válido encontrado`)
                  notas = []
                }
              } else {
                console.log(`⚠️ Relatório ${relatorio.id} não tem notas relacionadas ou erro:`, relatorioNotasError)
                notas = []
              }

            } catch (error) {
              console.error(`❌ Erro ao processar relatório ${relatorio.id}:`, error)
              colaboradores = []
              notas = []
            }

            // Mapear os dados para garantir compatibilidade
            const relatorioCompleto = {
              id: relatorio.id,
              nome: relatorio.nome || 'Relatório sem nome',
              colaboradores: colaboradores,
              data: relatorio.data,
              turno: relatorio.turno || 'Não informado',
              area: relatorio.area || 'recebimento',
              quantidadeNotas: relatorio.quantidade_notas || 0,
              somaVolumes: relatorio.soma_volumes || 0,
              notas: notas,
              dataFinalizacao: relatorio.data_finalizacao || new Date().toISOString(),
              status: relatorio.status || 'liberado',
            }

            console.log(`✅ Relatório completo processado:`, relatorioCompleto)
            console.log(`🔍 Colaboradores no relatório completo:`, relatorioCompleto.colaboradores)
            console.log(`🔍 Notas no relatório completo:`, relatorioCompleto.notas)
            return relatorioCompleto
          })
        )

        console.log("✅ Relatórios completos carregados com sucesso:", relatoriosCompletos.length)
        console.log("🔍 Primeiro relatório completo:", relatoriosCompletos[0])
        setRelatorios(relatoriosCompletos)
        return
      } else {
        console.log("⚠️ Nenhum relatório encontrado no banco")
        setRelatorios([])
      }

    } catch (error) {
      console.error("❌ Erro ao carregar relatórios:", error)
      setErro(`Erro ao carregar relatórios: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setCarregando(false)
    }
  }, [carregando])

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

    // Filtro por data
    if (dataFiltro) {
      const dataFormatada = format(dataFiltro, "dd/MM/yyyy")
      
      relatoriosFiltrados = relatoriosFiltrados.filter((rel) => {
        const dataRelatorio = rel.data
        
        // Comparação simples de string
        const match = dataRelatorio === dataFormatada
        
        return match
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
  }, [relatorios, filtroTexto, dataFiltro])

  // Carregar relatórios quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      // Usar setTimeout para não bloquear a renderização inicial do modal
      const timer = setTimeout(() => {
        carregarRelatorios()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, carregarRelatorios])

  // Aplicar filtros quando dados mudarem
  useEffect(() => {
    // Debounce para evitar re-renderizações excessivas
    const timer = setTimeout(() => {
      aplicarFiltros()
    }, 150)
    return () => clearTimeout(timer)
  }, [relatorios, filtroTexto, dataFiltro, aplicarFiltros])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lancado":
        return "bg-green-100 text-green-800"
      case "em_lancamento":
        return "bg-blue-100 text-blue-800"
      case "liberado":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-purple-100 text-purple-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "lancado":
        return "Lançado"
      case "em_lancamento":
        return "Em Lançamento"
      case "liberado":
        return "Liberado"
      default:
        return "Liberado"
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto" aria-describedby="relatorios-description">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Relatórios de Recebimento</span>
              {carregando && relatoriosFiltrados.length > 0 && (
                <span className="ml-2 inline-flex items-center text-xs text-gray-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
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
              {/* Funcionalidade funcionando perfeitamente */}
            </div>

            {/* Filtros */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-700">Filtros de Busca</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 text-sm">Buscar por transportadora, colaboradores ou NF</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome da transportadora, colaboradores ou número da NF..."
                      value={filtroTexto}
                      onChange={(e) => setFiltroTexto(e.target.value)}
                      className="pl-8 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 text-sm">Filtrar por data</Label>
                  <div className="space-y-2">
                    <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className={`w-full justify-start text-left font-normal cursor-pointer transition-colors ${
                            dataFiltro 
                              ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' 
                              : 'bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400'
                          }`}
                          type="button"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataFiltro ? (
                            <span className="flex items-center">
                              {format(dataFiltro, "dd/MM/yyyy", { locale: ptBR })}
                              <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-700">
                                Filtro Ativo
                              </Badge>
                            </span>
                          ) : (
                            "Selecione uma data"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 z-[9999]" 
                        align="start" 
                        sideOffset={5}
                        side="bottom"
                      >
                        <Calendar 
                          mode="single" 
                          selected={dataFiltro} 
                          onSelect={(date) => {
                            if (date) {
                              setDataFiltro(date)
                            }
                            setPopoverAberto(false)
                          }} 
                          locale={ptBR}
                          className="rounded-md border bg-white"
                          disabled={(date) => {
                            // Permitir apenas datas passadas
                            return date > new Date()
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    {dataFiltro && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDataFiltro(undefined)
                          setPopoverAberto(false)
                        }}
                        className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        ✕ Limpar filtro de data
                      </Button>
                    )}
                  </div>  
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => {
                    setFiltroTexto("")
                    setDataFiltro(undefined)
                    setPopoverAberto(false)
                  }}
                  variant="outline"
                  size="sm"
                >
                  Limpar Filtros
                </Button>
                <Button
                  onClick={carregarRelatorios}
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center"
                  disabled={carregando}
                >
                  <Loader2 className={`mr-2 h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
                  Recarregar
                </Button>
                <div className="text-sm text-gray-600">
                  Mostrando {relatoriosFiltrados.length} de {relatorios.length} relatórios
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
              <Card className="border-blue-200">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{relatorios.length}</div>
                  <div className="text-xs text-gray-600 leading-tight">Total Relatórios</div>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                    {relatorios.reduce((sum, rel) => sum + rel.quantidadeNotas, 0)}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight">Total Notas</div>
                </CardContent>
              </Card>
              <Card className="border-purple-200">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                    {relatorios.reduce((sum, rel) => sum + (rel.somaVolumes || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight">Total Volumes</div>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                    {relatorios.reduce(
                      (sum, rel) => sum + (rel.notas ? rel.notas.filter((n) => n.status === "divergencia").length : 0),
                      0,
                    )}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight">Divergências</div>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                    {relatorios.reduce((sum, rel) => sum + (rel.notas ? rel.notas.filter((n) => n.status === "devolvida").length : 0), 0)}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight">Devolvidas</div>
                </CardContent>
              </Card>
             
            </div>

            {/* Lista de Relatórios */}
            <div className="overflow-y-auto max-h-[60vh] min-h-0">
              {carregando && relatoriosFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  <p className="text-gray-500 mt-2">Carregando relatórios...</p>
                </div>
              ) : erro ? (
                <div className="text-center py-8 text-red-500">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-300" />
                  <h3 className="text-lg font-medium mb-2">Erro ao carregar relatórios</h3>
                  <p>{erro}</p>
                </div>
              ) : relatoriosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhum relatório encontrado</h3>
                  <p>Tente ajustar os filtros de busca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 pb-4">
                  {relatoriosFiltrados.map((relatorio) => (
                    <Card key={relatorio.id} className="border-blue-200 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-gray-900 text-sm">{relatorio.nome}</span>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(relatorio.status)}`}>
                            {getStatusLabel(relatorio.status)}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600 text-xs">Colaboradores</div>
                            <div className="font-medium">
                              {Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0
                                ? relatorio.colaboradores.join(', ')
                                : 'Não informado'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 text-xs">Data/Turno</div>
                            <div className="font-medium">
                              {relatorio.data} - {relatorio.turno}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 py-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{relatorio.quantidadeNotas}</div>
                            <div className="text-xs text-gray-500">Notas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {relatorio.somaVolumes || 0}
                            </div>
                            <div className="text-xs text-gray-500">Volumes</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {relatorio.notas ? relatorio.notas.filter((n) => n.status === "divergencia").length : 0}
                            </div>
                            <div className="text-xs text-gray-500">Divergências</div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Liberado em: {new Date(relatorio.dataFinalizacao).toLocaleString("pt-BR")}
                        </div>

                        <Button
                          onClick={() => setRelatorioSelecionado(relatorio)}
                          variant="outline"
                          className="w-full bg-transparent"
                          size="sm"
                        >
                          <Eye className="h-3 w-3" />
                          Ver Detalhes
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
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="relatorio-detalhes-description">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <span>{relatorioSelecionado.nome} - Detalhes</span>
              </DialogTitle>
            </DialogHeader>

            <div id="relatorio-detalhes-description" className="sr-only">
              Detalhes do relatório de recebimento, incluindo informações sobre colaboradores, notas fiscais e divergências.
            </div>

            <div className="space-y-4">
              {/* Resumo do Relatório */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Transportadora</div>
                  <div className="font-medium">{relatorioSelecionado.nome}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Colaboradores</div>
                  <div className="font-medium">
                    {Array.isArray(relatorioSelecionado.colaboradores) && relatorioSelecionado.colaboradores.length > 0
                      ? relatorioSelecionado.colaboradores.join(', ')
                      : 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Data/Turno</div>
                  <div className="font-medium">
                    {relatorioSelecionado.data} - {relatorioSelecionado.turno}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <Badge className={getStatusColor(relatorioSelecionado.status)}>
                    {getStatusLabel(relatorioSelecionado.status)}
                  </Badge>
                </div>
              </div>

              {/* Tabela de Notas - Só mostrar se houver notas */}
              {relatorioSelecionado.notas && relatorioSelecionado.notas.length > 0 ? (
                <ScrollArea className="h-[50vh] min-h-0">
                  <div className="border rounded-lg overflow-x-auto">
                    <div className="min-w-max">
                      <div className="bg-gray-50 px-2 sm:px-4 py-2 grid grid-cols-6 sm:grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700">
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
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <div className="font-medium truncate" title={nota.numeroNF}>{nota.numeroNF}</div>
                          <div className="font-mono">
                            {nota.divergencia?.volumesInformados || nota.volumes}
                            {nota.divergencia?.volumesInformados !== nota.volumes && (
                              <span className="text-orange-600 text-xs ml-1">(era {nota.volumes})</span>
                            )}
                          </div>
                          <div className="hidden sm:block text-xs truncate" title={nota.destino}>{nota.destino}</div>
                          <div className="hidden lg:block text-xs truncate" title={nota.fornecedor}>{nota.fornecedor}</div>
                          <div className="hidden lg:block text-xs truncate" title={nota.clienteDestino}>{nota.clienteDestino}</div>
                          <div className="flex items-center">
                            {nota.status === "ok" ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <span className="text-xs">OK</span>
                              </div>
                            ) : nota.status === "devolvida" ? (
                              <div className="flex items-center text-red-600">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                <span className="text-xs">Devolvida</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-orange-600">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                <span className="text-xs">Div.</span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs truncate" title={nota.divergencia ? `${nota.divergencia.volumesInformados} vol. - ${nota.divergencia.observacoes}` : ''}>
                            {nota.divergencia ? (
                              <div className="text-orange-600">
                                <div className="font-medium">{nota.divergencia.volumesInformados} vol.</div>
                                {nota.divergencia.observacoes && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {nota.divergencia.observacoes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="bg-blue-50 px-2 sm:px-4 py-2 grid grid-cols-6 sm:grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm font-bold text-blue-800">
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
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma nota disponível</h3>
                  <p>Este relatório não possui notas detalhadas.</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setRelatorioSelecionado(null)} variant="outline">
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
