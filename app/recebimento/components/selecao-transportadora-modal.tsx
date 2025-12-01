"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Truck, Scan } from "lucide-react"
import { getSupabase } from "@/lib/supabase-client"

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
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Salvar elemento ativo antes de abrir o modal
      previousActiveElement.current = document.activeElement as HTMLElement
      carregarTransportadoras()
    } else {
      // Resetar estado quando modal for fechado
      setBipagemIniciadaLocal(false)
      setTransportadoraSelecionada("")
      
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

      // Ordenar por total de notas (maior primeiro) e depois por nome original
      transportadorasComProgresso.sort((a, b) => {
        if (b.totalNotas !== a.totalNotas) {
          return b.totalNotas - a.totalNotas
        }
        return a.nomeOriginal.localeCompare(b.nomeOriginal)
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
        className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-950"
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
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <span>Selecionar Transportadora</span>
          </DialogTitle>
          <DialogDescription>
            Selecione uma transportadora para iniciar a bipagem das notas fiscais.
          </DialogDescription>
        </DialogHeader>

        {/* Seleção de transportadora */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Selecionar Transportadora</Label>
            <Select value={transportadoraSelecionada} onValueChange={setTransportadoraSelecionada}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma transportadora..." />
              </SelectTrigger>
              <SelectContent className="z-[110]">
                {transportadoras.map((transportadora) => (
                  <SelectItem key={transportadora.nome} value={transportadora.nome}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">{transportadora.nomeOriginal}</span>
                        {transportadora.data && (
                          <span className="text-xs text-gray-500 ">Data: {transportadora.data}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Badge variant="outline" className="text-xs">
                          {transportadora.notasBipadas}/{transportadora.totalNotas} - {transportadora.progresso}%
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>


        {/* Botões */}
        <div className="flex space-x-4">
          <Button
            onClick={handleConfirmar}
            disabled={!transportadoraSelecionada || carregando}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {carregando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Carregando...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Iniciar Bipagem
              </>
            )}
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
            disabled={!podeFechar}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
