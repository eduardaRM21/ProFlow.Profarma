"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Package, Truck, Scan } from "lucide-react"
import { getSupabase } from "@/lib/supabase-client"

interface Transportadora {
  nome: string
  nomeOriginal: string
  data: string
  totalNotas: number
  notasBipadas: number
  progresso: number
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

  useEffect(() => {
    if (isOpen) {
      carregarTransportadoras()
    } else {
      // Resetar estado quando modal for fechado
      setBipagemIniciadaLocal(false)
    }
  }, [isOpen, notasBipadas])

  const carregarTransportadoras = async () => {
    setCarregando(true)
    try {
      const supabase = getSupabase()
      
      // Buscar transportadoras e suas notas do consolidado
      const { data: consolidadoData, error } = await supabase
        .from('notas_consolidado')
        .select('transportadora, numero_nf')
        .not('transportadora', 'is', null) // Excluir valores nulos
        .neq('transportadora', '') // Excluir valores vazios
        .order('data_entrada', { ascending: false })

      if (error) {
        console.error('❌ Erro ao carregar transportadoras:', error)
        return
      }

      // Buscar notas bipadas
      const { data: notasBipadasData, error: bipadasError } = await supabase
        .from('notas_bipadas')
        .select('numero_nf')
        .eq('area_origem', 'recebimento')

      if (bipadasError) {
        console.warn('⚠️ Erro ao carregar notas bipadas:', bipadasError)
      }

      // Criar Set com números das notas bipadas
      const notasBipadasSet = new Set(
        notasBipadasData?.map((item: any) => item.numero_nf) || []
      )

      // Agrupar por transportadora e calcular progresso
      const transportadorasMap = new Map<string, { total: number, bipadas: number, nomeOriginal: string, data: string }>()
      
      if (consolidadoData) {
        consolidadoData.forEach((item: any) => {
          const transportadora = item.transportadora
          const numeroNF = item.numero_nf
          
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
            
            const atual = transportadorasMap.get(transportadora) || { total: 0, bipadas: 0, nomeOriginal, data }
            atual.total += 1
            
            if (notasBipadasSet.has(numeroNF)) {
              atual.bipadas += 1
            }
            
            transportadorasMap.set(transportadora, atual)
          }
        })
      }

      // Calcular progresso e filtrar transportadoras 100% bipadas
      const transportadorasComProgresso = Array.from(transportadorasMap.entries())
        .map(([nome, dados]) => {
          const progresso = dados.total > 0 ? Math.round((dados.bipadas / dados.total) * 100) : 0

          return {
            nome,
            nomeOriginal: dados.nomeOriginal,
            data: dados.data,
            totalNotas: dados.total,
            notasBipadas: dados.bipadas,
            progresso: progresso
          }
        })
        .filter(transportadora => transportadora.progresso < 100) // Filtrar transportadoras 100% bipadas

      // Ordenar por total de notas (maior primeiro) e depois por nome original
      transportadorasComProgresso.sort((a, b) => {
        if (b.totalNotas !== a.totalNotas) {
          return b.totalNotas - a.totalNotas
        }
        return a.nomeOriginal.localeCompare(b.nomeOriginal)
      })

      console.log('📋 Transportadoras carregadas (excluindo 100% bipadas):', transportadorasComProgresso)
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



  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && podeFechar) {
        onClose()
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <SelectContent>
                {transportadoras.map((transportadora) => (
                  <SelectItem key={transportadora.nome} value={transportadora.nome}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">{transportadora.nomeOriginal}</span>
                        {transportadora.data && (
                          <span className="text-xs text-gray-500">Data: {transportadora.data}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Badge variant="outline" className="text-xs">
                          {transportadora.notasBipadas}/{transportadora.totalNotas}
                        </Badge>
                        <Badge 
                          variant={transportadora.progresso === 100 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {transportadora.progresso}%
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
            onClick={onClose}
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
