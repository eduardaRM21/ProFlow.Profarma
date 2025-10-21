"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Package, CheckCircle, Loader2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase-client"
import { useIsColetor } from "@/hooks/use-coletor"

interface NotaFaltante {
  numero_nf: string
  fornecedor: string
  cliente_destino: string
  volumes: number
  data: string
  tipo_carga: string
  transportadora: string
}

interface ConsultarNfsFaltantesModalProps {
  isOpen: boolean
  onClose: () => void
  transportadoraSelecionada: string
}

export default function ConsultarNfsFaltantesModal({
  isOpen,
  onClose,
  transportadoraSelecionada
}: ConsultarNfsFaltantesModalProps) {
  const [notasFaltantes, setNotasFaltantes] = useState<NotaFaltante[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const isColetor = useIsColetor()

  useEffect(() => {
    if (isOpen && transportadoraSelecionada) {
      carregarNotasFaltantes()
    }
  }, [isOpen, transportadoraSelecionada])

  const carregarNotasFaltantes = async () => {
    if (!transportadoraSelecionada) return

    setCarregando(true)
    setErro(null)
    
    try {
      const supabase = getSupabase()
      
      // Extrair nome original da transportadora (remover data se houver)
      const nomeTransportadora = transportadoraSelecionada.includes(' - ') 
        ? transportadoraSelecionada.split(' - ')[1] 
        : transportadoraSelecionada

      console.log(`🔍 Buscando notas faltantes para: ${nomeTransportadora}`)

      // Buscar todas as notas da transportadora no consolidado
      // IMPORTANTE: Filtrar apenas notas com status "deu entrada"
      const { data: consolidadoData, error: consolidadoError } = await supabase
        .from('notas_consolidado')
        .select('numero_nf, fornecedor, cliente_destino, volumes, data, tipo_carga, transportadora, status')
        .eq('transportadora', transportadoraSelecionada)
        .eq('status', 'deu entrada') // FILTRO CRÍTICO: Apenas notas com status "deu entrada"
        .order('numero_nf', { ascending: true })

      if (consolidadoError) {
        console.error('❌ Erro ao carregar notas do consolidado:', consolidadoError)
        throw new Error('Erro ao carregar notas do consolidado')
      }

      // Buscar notas já bipadas (liberadas) para esta transportadora
      const numerosNf = consolidadoData?.map(n => n.numero_nf) || []
      
      if (numerosNf.length === 0) {
        setNotasFaltantes([])
        return
      }

      const { data: notasBipadasData, error: bipadasError } = await supabase
        .from('notas_bipadas')
        .select('numero_nf')
        .eq('area_origem', 'recebimento')
        .in('numero_nf', numerosNf)

      if (bipadasError) {
        console.warn('⚠️ Erro ao carregar notas bipadas:', bipadasError)
      }

      // Criar Set com números das notas já bipadas
      const notasBipadasSet = new Set(
        notasBipadasData?.map((item: any) => item.numero_nf) || []
      )

      // Filtrar apenas as notas que ainda não foram bipadas
      const notasRestantes = (consolidadoData || []).filter(nota => 
        !notasBipadasSet.has(nota.numero_nf)
      )

      setNotasFaltantes(notasRestantes)
      
      console.log(`✅ ${notasRestantes.length} notas faltantes encontradas`)
      console.log(`📊 Total: ${consolidadoData?.length || 0}, Já bipadas: ${notasBipadasSet.size}, Faltantes: ${notasRestantes.length}`)
      
    } catch (error) {
      console.error('❌ Erro ao carregar notas faltantes:', error)
      setErro('Erro ao carregar notas faltantes. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleDateString('pt-BR')
    } catch {
      return data
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isColetor ? 'max-w-sm mx-2 coletor-confirmation-modal' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto`}>
        <DialogHeader className={`${isColetor ? 'coletor-modal-header' : ''}`}>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span>NFs Faltantes - {transportadoraSelecionada}</span>
          </DialogTitle>
          <DialogDescription>
            Lista de notas fiscais que ainda não foram bipadas para esta transportadora.
          </DialogDescription>
        </DialogHeader>

        <div className={`space-y-${isColetor ? '4' : '6'} ${isColetor ? 'coletor-modal-content' : ''}`}>
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-sm text-gray-600">Carregando notas faltantes...</span>
            </div>
          ) : erro ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-3" />
              <p className="text-red-600 text-sm mb-4">{erro}</p>
              <Button 
                onClick={carregarNotasFaltantes}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : notasFaltantes.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-3" />
              <p className="text-green-600 text-sm font-medium mb-2">
                🎉 Todas as notas foram bipadas!
              </p>
              <p className="text-gray-500 text-xs">
                Não há notas faltantes para esta transportadora.
              </p>
            </div>
          ) : (
            <>
              {/* Resumo */}
              <div className={`bg-orange-50 p-${isColetor ? '3' : '4'} rounded-lg`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold text-orange-800 ${isColetor ? 'text-sm' : ''}`}>
                      Notas Faltantes
                    </h3>
                    <p className={`text-orange-600 ${isColetor ? 'text-xs' : 'text-sm'}`}>
                      {notasFaltantes.length} nota{notasFaltantes.length !== 1 ? 's' : ''} ainda não bipada{notasFaltantes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    {notasFaltantes.length}
                  </Badge>
                </div>
              </div>

              {/* Lista de notas faltantes */}
              <ScrollArea className={`${isColetor ? 'h-64' : 'h-96'}`}>
                <div className="space-y-2" role="list" aria-label={`Lista de ${notasFaltantes.length} notas faltantes`}>
                  {notasFaltantes.map((nota, index) => (
                    <div
                      key={nota.numero_nf}
                      className={`p-${isColetor ? '2' : '3'} border border-orange-200 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors`}
                      role="listitem"
                      aria-label={`Nota fiscal ${nota.numero_nf} faltante`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Package className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <span className={`font-semibold text-gray-900 ${isColetor ? 'text-sm' : ''}`}>
                              NF: {nota.numero_nf}
                            </span>
                            <Badge variant="outline" className="text-xs bg-white">
                              Vol: {nota.volumes}
                            </Badge>
                          </div>
                          
                          <div className={`text-xs text-gray-600 space-y-1`}>
                            <div className="truncate">
                              <strong>Fornecedor:</strong> {nota.fornecedor}
                            </div>
                            <div className="truncate">
                              <strong>Cliente:</strong> {nota.cliente_destino}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span><strong>Tipo:</strong> {nota.tipo_carga}</span>
                              <span><strong>Data:</strong> {formatarData(nota.data)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
            <Button
              onClick={onClose}
              variant="outline"
              className={`${isColetor ? 'h-10 px-3' : ''} text-gray-600 border-gray-300 hover:bg-gray-50`}
            >
              Fechar
            </Button>
            {!carregando && !erro && notasFaltantes.length > 0 && (
              <Button
                onClick={carregarNotasFaltantes}
                variant="outline"
                className={`${isColetor ? 'h-10 px-3' : ''} text-blue-600 border-blue-300 hover:bg-blue-50`}
              >
                Atualizar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
