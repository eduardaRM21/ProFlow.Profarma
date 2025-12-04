"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Truck, Scan, Search, CheckCircle2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase-client"
import { useIsColetor } from "@/hooks/use-coletor"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface Transportadora {
  nome: string
  nomeOriginal: string
  data: string
  totalNotas: number
  notasBipadas: number
  progresso: number
  faltando: number
  statusCounts: { [key: string]: number }
}

interface SelecaoTransportadoraModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmar: (transportadora: string) => void
  notasBipadas: any[]
  sessionData: any
  podeFechar?: boolean
}

export default function SelecaoTransportadoraModal({
  isOpen,
  onClose,
  onConfirmar,
  notasBipadas,
  sessionData,
  podeFechar = true
}: SelecaoTransportadoraModalProps) {
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [transportadoraSelecionada, setTransportadoraSelecionada] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [bipagemIniciadaLocal, setBipagemIniciadaLocal] = useState(false)
  const [busca, setBusca] = useState("")
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const isColetor = useIsColetor()

  useEffect(() => {
    if (isOpen) {
      // Salvar elemento ativo antes de abrir o modal
      previousActiveElement.current = document.activeElement as HTMLElement
      carregarTransportadoras()
    } else {
      // Resetar estado quando modal for fechado
      setBipagemIniciadaLocal(false)
      setTransportadoraSelecionada("")
      setBusca("")
      
      // Restaurar foco para o elemento anterior após um pequeno delay
      // para evitar conflitos com aria-hidden
      setTimeout(() => {
        if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
          previousActiveElement.current.focus()
        }
        previousActiveElement.current = null
      }, 100)
    }
  }, [isOpen, notasBipadas])

  const carregarTransportadoras = async () => {
    setCarregando(true)
    try {
      const supabase = getSupabase()
      
      // Buscar todas as notas do consolidado (não apenas "deu entrada")
      // para calcular o progresso baseado no status
      // IMPORTANTE: Remover limite para buscar TODAS as transportadoras, incluindo as mais antigas
      let allConsolidadoData: any[] = []
      let offset = 0
      const limit = 1000 // Limite por página
      let hasMore = true

      while (hasMore) {
        const { data: consolidadoData, error } = await supabase
          .from('notas_consolidado')
          .select('transportadora, numero_nf, status, data_entrada')
          .not('transportadora', 'is', null) // Excluir valores nulos
          .neq('transportadora', '') // Excluir valores vazios
          .order('data_entrada', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) {
          console.error('❌ Erro ao carregar transportadoras:', error)
          break
        }

        if (consolidadoData && consolidadoData.length > 0) {
          allConsolidadoData = [...allConsolidadoData, ...consolidadoData]
          offset += limit
          hasMore = consolidadoData.length === limit // Se retornou menos que o limite, não há mais dados
        } else {
          hasMore = false
        }
      }

      const consolidadoData = allConsolidadoData

      console.log(`📋 Total de notas encontradas: ${consolidadoData?.length || 0}`)

      // Agrupar por transportadora e calcular progresso baseado no status
      const transportadorasMap = new Map<string, { 
        total: number, 
        processadas: number, 
        nomeOriginal: string, 
        data: string,
        statusCounts: { [key: string]: number }
      }>()
      
      if (consolidadoData) {
        consolidadoData.forEach((item: any) => {
          const transportadora = item.transportadora
          const numeroNF = item.numero_nf
          const status = item.status
          
          if (transportadora && transportadora.trim() !== '') {
            // Extrair data e nome original da transportadora (formato: "DD/MM/YYYY - Nome")
            let nomeOriginal = transportadora
            let data = ''
            
            if (transportadora.includes(' - ')) {
              const partes = transportadora.split(' - ')
              if (partes.length >= 2) {
                data = partes[0]
                nomeOriginal = partes.slice(1).join(' - ')
              }
            }
            
            const atual = transportadorasMap.get(transportadora) || { 
              total: 0, 
              processadas: 0, 
              nomeOriginal, 
              data,
              statusCounts: {} as { [key: string]: number }
            }
            
            atual.total += 1
            
            // Contar status
            const statusStr = status as string
            if (!atual.statusCounts[statusStr]) {
              atual.statusCounts[statusStr] = 0
            }
            atual.statusCounts[statusStr] += 1
            
            // Considerar como processada apenas se status for "recebida"
            if (status === 'recebida') {
              atual.processadas += 1
            }
            
            transportadorasMap.set(transportadora, atual)
          }
        })
      }

      // Buscar relatórios liberados parcialmente e adicionar à lista
      // IMPORTANTE: Buscar TODOS os relatórios, incluindo os mais antigos
      let allRelatoriosData: any[] = []
      let relatoriosOffset = 0
      const relatoriosLimit = 1000
      let hasMoreRelatorios = true

      while (hasMoreRelatorios) {
        const { data: relatoriosData, error: relatoriosError } = await supabase
          .from('relatorios')
          .select('id, nome, area, data, status, total_divergencias')
          .eq('area', 'recebimento')
          .eq('status', 'liberado_parcialmente')
          .order('data', { ascending: false })
          .range(relatoriosOffset, relatoriosOffset + relatoriosLimit - 1)

        if (relatoriosError) {
          console.error('❌ Erro ao carregar relatórios:', relatoriosError)
          break
        }

        if (relatoriosData && relatoriosData.length > 0) {
          allRelatoriosData = [...allRelatoriosData, ...relatoriosData]
          relatoriosOffset += relatoriosLimit
          hasMoreRelatorios = relatoriosData.length === relatoriosLimit
        } else {
          hasMoreRelatorios = false
        }
      }

      const relatoriosData = allRelatoriosData

      if (relatoriosData && relatoriosData.length > 0) {
        for (const relatorio of relatoriosData) {
          // Buscar total de notas do relatório
          const { data: relatorioNotasData, error: notasError } = await supabase
            .from('relatorio_notas')
            .select('nota_fiscal_id')
            .eq('relatorio_id', String(relatorio.id))

          if (notasError) continue

          const totalNotas = relatorioNotasData?.length || 0

          // Buscar notas processadas (com status ok, devolvida ou divergencia)
          const { data: notasFiscaisData, error: fiscaisError } = await supabase
            .from('notas_fiscais')
            .select('id, status')
            .in('id', relatorioNotasData?.map((rn: any) => rn.nota_fiscal_id) || [])

          if (fiscaisError) continue

          const notasProcessadas = notasFiscaisData?.filter(nota => 
            nota.status === 'ok' || nota.status === 'devolvida' || nota.status === 'divergencia'
          ).length || 0

          // Adicionar relatório como transportadora especial
          const nomeRelatorio = `📋 ${relatorio.nome as string}`
          transportadorasMap.set(nomeRelatorio, {
            total: totalNotas,
            processadas: notasProcessadas,
            nomeOriginal: relatorio.nome as string,
            data: relatorio.data as string,
            statusCounts: {} as { [key: string]: number }
          })
        }
      }

      // Calcular progresso e filtrar transportadoras 100% processadas
      const transportadorasComProgresso = Array.from(transportadorasMap.entries())
        .map(([nome, dados]) => {
          const progresso = dados.total > 0 ? Math.round((dados.processadas / dados.total) * 100) : 0
          const faltando = dados.total - dados.processadas

          return {
            nome,
            nomeOriginal: dados.nomeOriginal,
            data: dados.data,
            totalNotas: dados.total,
            notasBipadas: dados.processadas,
            progresso: progresso,
            faltando: faltando,
            statusCounts: dados.statusCounts
          }
        })
        .filter(transportadora => transportadora.faltando > 0) // Filtrar apenas transportadoras que ainda têm notas para processar

      // Ordenar por data (mais recente primeiro) e depois por quantidade de notas (maior primeiro)
      transportadorasComProgresso.sort((a, b) => {
        // Comparar por data primeiro
        if (a.data && b.data) {
          const dataA = new Date(a.data).getTime()
          const dataB = new Date(b.data).getTime()
          if (dataB !== dataA) {
            return dataB - dataA // Mais recente primeiro
          }
        } else if (a.data && !b.data) {
          return -1 // a tem data, b não tem - a vem primeiro
        } else if (!a.data && b.data) {
          return 1 // b tem data, a não tem - b vem primeiro
        }
        // Se as datas forem iguais ou ambas não tiverem data, ordenar por quantidade de notas
        return b.totalNotas - a.totalNotas
      })

      console.log('📋 Transportadoras carregadas (baseado no status das notas e progresso < 100%):', transportadorasComProgresso)
      setTransportadoras(transportadorasComProgresso)
    } catch (error) {
      console.error('❌ Erro ao carregar transportadoras:', error)
    } finally {
      setCarregando(false)
    }
  }


  const handleConfirmar = () => {
    if (!transportadoraSelecionada) {
      alert("Selecione uma transportadora!")
      return
    }

    setBipagemIniciadaLocal(true)
    onConfirmar(transportadoraSelecionada)
  }

  const handleClose = () => {
    if (podeFechar) {
      // Remover foco de qualquer elemento dentro do modal antes de fechar
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement.blur) {
        activeElement.blur()
      }
      onClose()
    }
  }



  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose()
      }
    }}>
      <DialogContent 
        className={cn(
          "overflow-y-auto dark:bg-gray-950",
          isColetor 
            ? '!w-screen !h-screen !max-w-none !max-h-none !m-0 !rounded-none !p-4 !left-0 !right-0 !top-0 !bottom-0 !translate-x-0 !translate-y-0 flex flex-col' 
            : 'max-w-4xl max-h-[90vh]'
        )}
        onEscapeKeyDown={(e) => {
          if (!podeFechar) {
            e.preventDefault()
          }
        }}
        onPointerDownOutside={(e) => {
          if (!podeFechar) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader className={cn(isColetor && "mb-2 flex-shrink-0")}>
          <DialogTitle className={cn("flex items-center space-x-2", isColetor && "text-lg")}>
            <Truck className="h-5 w-5 text-blue-600" />
            <span>Selecionar Transportadora</span>
          </DialogTitle>
          <DialogDescription className={isColetor ? "text-sm" : ""}>
            Selecione uma transportadora para iniciar a bipagem.
          </DialogDescription>
        </DialogHeader>

        {/* Seleção de transportadora */}
        <div className={cn("space-y-4", isColetor && "flex-1 flex flex-col min-h-0")}>
          {/* Campo de busca */}
          {transportadoras.length > 3 && (
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar transportadora..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={cn("pl-9", isColetor && "h-12 text-base")}
              />
            </div>
          )}

          {/* Lista de transportadoras */}
          <div className={cn(
            "space-y-2 overflow-y-auto",
            isColetor && "flex-1 min-h-0"
          )}>
            {(() => {
              const transportadorasFiltradas = transportadoras.filter(t => {
                if (!busca) return true
                const buscaLower = busca.toLowerCase()
                return (
                  t.nomeOriginal.toLowerCase().includes(buscaLower) ||
                  t.data?.toLowerCase().includes(buscaLower) ||
                  t.nome.toLowerCase().includes(buscaLower)
                )
              })

              if (transportadorasFiltradas.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nenhuma transportadora encontrada</p>
                    {busca && (
                      <p className="text-xs mt-1">Tente buscar com outros termos</p>
                    )}
                  </div>
                )
              }

              return transportadorasFiltradas.map((transportadora) => {
                const isSelected = transportadoraSelecionada === transportadora.nome
                const progressoColor = transportadora.progresso === 100 
                  ? "bg-green-500" 
                  : transportadora.progresso >= 50 
                    ? "bg-blue-500" 
                    : "bg-orange-500"

                return (
                  <div
                    key={transportadora.nome}
                    onClick={() => setTransportadoraSelecionada(transportadora.nome)}
                    className={cn(
                      "relative p-4 rounded-lg border-2 cursor-pointer transition-all",
                      "hover:shadow-md active:scale-[0.98]",
                      isSelected
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300",
                      isColetor && "p-4"
                    )}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setTransportadoraSelecionada(transportadora.nome)
                      }
                    }}
                    aria-pressed={isSelected}
                  >
                    {/* Indicador de seleção */}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      {/* Informações principais */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Truck className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isSelected ? "text-blue-600" : "text-gray-400"
                          )} />
                          <h3 className={cn(
                            "font-semibold truncate",
                            isColetor ? "text-base" : "text-sm",
                            isSelected && "text-blue-700 dark:text-blue-300"
                          )}>
                            {transportadora.nomeOriginal}
                          </h3>
                        </div>
                        
                        {transportadora.data && (
                          <p className={cn(
                            "text-gray-500 mb-2",
                            isColetor ? "text-sm" : "text-xs"
                          )}>
                            📅 {transportadora.data}
                          </p>
                        )}

                        {/* Barra de progresso */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">
                              Progresso
                            </span>
                            <span className={cn(
                              "font-medium",
                              transportadora.progresso === 100 ? "text-green-600" : "text-gray-700 dark:text-gray-300"
                            )}>
                              {transportadora.progresso}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={cn("h-2 rounded-full transition-all duration-300", progressoColor)}
                              style={{ width: `${transportadora.progresso}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Badges de informações */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Badge 
                          variant={transportadora.faltando > 0 ? "default" : "secondary"}
                          className={cn(
                            "text-xs whitespace-nowrap",
                            transportadora.faltando > 0 && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                          )}
                        >
                          {transportadora.faltando} faltando
                        </Badge>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {transportadora.notasBipadas}/{transportadora.totalNotas} notas
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>


        {/* Botões */}
        <div className={cn("flex", isColetor ? "flex-col space-y-3 mt-2 flex-shrink-0" : "space-x-3")}>
          <Button
            onClick={handleConfirmar}
            disabled={!transportadoraSelecionada || carregando}
            className={cn(
              "bg-blue-600 hover:bg-blue-700",
              isColetor ? "w-full h-12 text-base" : "flex-1"
            )}
          >
            {carregando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Carregando...
              </>
            ) : (
              <>
                <Scan className={cn("mr-2", isColetor ? "h-5 w-5" : "h-4 w-4")} />
                Iniciar Bipagem
              </>
            )}
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            className={cn(isColetor ? "w-full h-12 text-base" : "flex-1")}
            disabled={!podeFechar}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
