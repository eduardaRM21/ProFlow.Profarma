"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, MapPin, Package, Search, Layers, Scan, CheckCircle2, XCircle } from "lucide-react"
import { WMSService, type WMSSugestaoPosicao, type WMSSugestaoConjuntoPosicoes, type WMSCarga } from "@/lib/wms-service"
import { SlotRecommendationCard } from "@/components/wms/slot-recommendation-card"
import { SlotConjuntoRecommendationCard } from "@/components/wms/slot-conjunto-recommendation-card"
import { obterDestinoCompleto } from "@/lib/wms-utils"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-database"
import BarcodeScanner from "@/app/recebimento/components/barcode-scanner"

export default function WMSEnderecamentoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { getSession } = useSession()

  const [cargaSelecionada, setCargaSelecionada] = useState<WMSCarga | null>(null)
  const [paleteSelecionado, setPaleteSelecionado] = useState<any>(null)
  const [paletes, setPaletes] = useState<any[]>([])
  const [sugestoes, setSugestoes] = useState<(WMSSugestaoPosicao | WMSSugestaoConjuntoPosicoes)[]>([])
  const [sugestoesCompletas, setSugestoesCompletas] = useState<(WMSSugestaoPosicao | WMSSugestaoConjuntoPosicoes)[]>([])
  const [sugestoesPorNivel, setSugestoesPorNivel] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [nivelFiltro, setNivelFiltro] = useState<string>("all")
  const [cargasMontadas, setCargasMontadas] = useState<WMSCarga[]>([])
  const [loadingCargas, setLoadingCargas] = useState(false)
  
  // Estados para fluxo de bipagem
  const [mostrarDialogBipagem, setMostrarDialogBipagem] = useState(false)
  const [etapaBipagem, setEtapaBipagem] = useState<"palete" | "posicao">("palete")
  const [posicaoIdParaEnderecar, setPosicaoIdParaEnderecar] = useState<string | string[] | null>(null)
  const [codigoBipadoPalete, setCodigoBipadoPalete] = useState("")
  const [codigoBipadoPosicao, setCodigoBipadoPosicao] = useState("")
  const [scannerAtivo, setScannerAtivo] = useState(false)
  const [paleteValidado, setPaleteValidado] = useState(false)
  const [posicaoValidada, setPosicaoValidada] = useState(false)

  useEffect(() => {
    carregarCargasMontadas()
  }, [])

  useEffect(() => {
    if (cargaSelecionada) {
      carregarPaletesDaCarga()
    } else {
      setPaletes([])
      setPaleteSelecionado(null)
      setSugestoes([])
      setSugestoesCompletas([])
      setSugestoesPorNivel({})
    }
  }, [cargaSelecionada])

  useEffect(() => {
    if (paleteSelecionado) {
      carregarSugestoes()
    }
  }, [paleteSelecionado, nivelFiltro])

  const carregarPaletesDaCarga = async () => {
    if (!cargaSelecionada) return

    try {
      setLoading(true)
      // Buscar paletes da carga selecionada com status aguardando_armazenagem
      const paletesDaCarga = await WMSService.listarPaletes({ 
        carga_id: cargaSelecionada.id,
        status: "aguardando_armazenagem" 
      })

      // Colocar os paletes em ordem crescente por codigo_palete (ou id se preferir)
      const paletesOrdenados = [...paletesDaCarga].sort((a, b) => {
        if (a.codigo_palete && b.codigo_palete) {
          // Ordena numericamente se for numeral, senão alfabeticamente
          const numA = parseInt(a.codigo_palete, 10)
          const numB = parseInt(b.codigo_palete, 10)
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB
          return a.codigo_palete.localeCompare(b.codigo_palete)
        }
        return 0
      })

      setPaletes(paletesOrdenados)
      
      // Se houver apenas um palete, selecionar automaticamente
      if (paletesDaCarga.length === 1) {
        setPaleteSelecionado(paletesDaCarga[0])
      } else {
        setPaleteSelecionado(null)
        setSugestoes([])
      }
    } catch (error) {
      console.error("Erro ao carregar paletes da carga:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar paletes da carga",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const carregarCargasMontadas = async () => {
    try {
      setLoadingCargas(true)
      const cargas = await WMSService.listarCargas({ 
        status: "montada" 
      })
      
      // Filtrar apenas cargas com destino_cliente (apenas essas serão embaladas)
      const cargasComDestino = cargas.filter(carga => carga.cliente_destino && carga.cliente_destino.trim() !== '')
      
      // Verificar quais cargas têm paletes aguardando armazenagem
      const cargasComPaletesAguardando = await Promise.all(
        cargasComDestino.map(async (carga) => {
          const paletes = await WMSService.listarPaletes({ 
            carga_id: carga.id,
            status: "aguardando_armazenagem" 
          })
          return { carga, temPaletesAguardando: paletes.length > 0 }
        })
      )
      
      // Filtrar apenas cargas que têm paletes aguardando armazenagem
      const cargasFiltradas = cargasComPaletesAguardando
        .filter(item => item.temPaletesAguardando)
        .map(item => item.carga)
      
      setCargasMontadas(cargasFiltradas)
    } catch (error) {
      console.error("Erro ao carregar cargas montadas:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar cargas montadas",
        variant: "destructive"
      })
    } finally {
      setLoadingCargas(false)
    }
  }

  const gerarIdWMS = (carga: WMSCarga, index: number): string => {
    // Extrair timestamp da data_criacao ou usar timestamp atual
    let timestamp: number
    if (carga.data_criacao) {
      timestamp = new Date(carga.data_criacao).getTime()
    } else {
      timestamp = Date.now()
    }
    
    // Formato: WMS_001_1763472726914
    const numeroSequencial = String(index + 1).padStart(3, '0')
    return `WMS_${numeroSequencial}_${timestamp}`
  }

  const carregarSugestoes = async () => {
    if (!paleteSelecionado) return

    setLoading(true)
    try {
      const palete = await WMSService.buscarPalete(paleteSelecionado.id)
      if (!palete) {
        toast({
          title: "Erro",
          description: "Palete não encontrado",
          variant: "destructive"
        })
        return
      }

      // Buscar todas as sugestões disponíveis (sem limite) para garantir sugestões de todos os níveis
      const sugestoesData = await WMSService.sugerirPosicoes(palete, 1000)
      
      // Contar sugestões por nível para exibir nos filtros
      const contagemPorNivel: Record<number, number> = {}
      sugestoesData.forEach(s => {
        const nivel = 'posicao' in s ? s.posicao.nivel : s.posicao_inicial.nivel
        contagemPorNivel[nivel] = (contagemPorNivel[nivel] || 0) + 1
      })
      setSugestoesPorNivel(contagemPorNivel)
      setSugestoesCompletas(sugestoesData)
      console.log('📊 Sugestões por nível:', contagemPorNivel)
      console.log('📊 Total de sugestões:', sugestoesData.length)
      
      // Filtrar por nível se necessário
      let sugestoesFiltradas: (WMSSugestaoPosicao | WMSSugestaoConjuntoPosicoes)[] = sugestoesData
      if (nivelFiltro !== "all") {
        const nivel = parseInt(nivelFiltro)
        sugestoesFiltradas = sugestoesData.filter(s => {
          // Verificar se é sugestão de posição única ou conjunto
          if ('posicao' in s) {
            return s.posicao.nivel === nivel
          } else {
            return s.posicao_inicial.nivel === nivel
          }
        })
        console.log(`🔍 Filtrado para nível ${nivel}: ${sugestoesFiltradas.length} sugestões encontradas`)
        
        // Se não houver sugestões para o nível selecionado, mostrar aviso
        if (sugestoesFiltradas.length === 0) {
          console.warn(`⚠️ Nenhuma sugestão encontrada para o nível ${nivel}. Verifique se há posições disponíveis neste nível.`)
          // Verificar se há sugestões em outros níveis para debug
          const niveisComSugestoes: Record<number, number> = {}
          sugestoesData.forEach(s => {
            const nivelSugestao = 'posicao' in s ? s.posicao.nivel : s.posicao_inicial.nivel
            niveisComSugestoes[nivelSugestao] = (niveisComSugestoes[nivelSugestao] || 0) + 1
          })
          console.log('📊 Sugestões disponíveis em outros níveis:', niveisComSugestoes)
        }
        
        // Limitar a 10 sugestões após filtrar por nível
        sugestoesFiltradas = sugestoesFiltradas.slice(0, 10)
      } else {
        // Se não há filtro, mostrar apenas top 10
        sugestoesFiltradas = sugestoesFiltradas.slice(0, 10)
      }

      setSugestoes(sugestoesFiltradas)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar sugestões",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const iniciarFluxoBipagem = (posicaoId: string | string[]) => {
    if (!paleteSelecionado || !cargaSelecionada) {
      toast({
        title: "Erro",
        description: "Selecione uma carga e um palete antes de confirmar",
        variant: "destructive"
      })
      return
    }

    setPosicaoIdParaEnderecar(posicaoId)
    setEtapaBipagem("palete")
    setCodigoBipadoPalete("")
    setCodigoBipadoPosicao("")
    setPaleteValidado(false)
    setPosicaoValidada(false)
    setMostrarDialogBipagem(true)
  }

  const validarCodigoPalete = (codigo: string): boolean => {
    if (!paleteSelecionado) return false
    
    // Verificar se o código bipado corresponde ao código do palete
    const codigoPalete = paleteSelecionado.codigo_palete?.toUpperCase().trim()
    const codigoBipado = codigo.toUpperCase().trim()
    
    return codigoPalete === codigoBipado
  }

  const validarCodigoPosicao = async (codigo: string): Promise<boolean> => {
    if (!posicaoIdParaEnderecar) return false

    try {
      if (Array.isArray(posicaoIdParaEnderecar)) {
        // Para múltiplas posições, verificar se o código corresponde à primeira posição
        const primeiraPosicao = await WMSService.buscarPosicao(posicaoIdParaEnderecar[0])
        if (!primeiraPosicao) return false
        return primeiraPosicao.codigo_posicao?.toUpperCase().trim() === codigo.toUpperCase().trim()
      } else {
        // Para posição única
        const posicao = await WMSService.buscarPosicao(posicaoIdParaEnderecar)
        if (!posicao) return false
        return posicao.codigo_posicao?.toUpperCase().trim() === codigo.toUpperCase().trim()
      }
    } catch (error) {
      console.error("Erro ao validar código da posição:", error)
      return false
    }
  }

  const handleCodigoPaleteEscaneado = (codigo: string) => {
    setScannerAtivo(false)
    setCodigoBipadoPalete(codigo)
    
    if (validarCodigoPalete(codigo)) {
      setPaleteValidado(true)
      toast({
        title: "Palete validado",
        description: "Código do palete confirmado. Agora bipar o código do endereço.",
        variant: "default"
      })
      // Avançar para próxima etapa após um pequeno delay
      setTimeout(() => {
        setEtapaBipagem("posicao")
        setCodigoBipadoPosicao("")
        setPosicaoValidada(false)
      }, 1000)
    } else {
      setPaleteValidado(false)
      toast({
        title: "Código inválido",
        description: `O código bipado não corresponde ao palete selecionado. Esperado: ${paleteSelecionado?.codigo_palete}`,
        variant: "destructive"
      })
    }
  }

  const handleCodigoPosicaoEscaneado = async (codigo: string) => {
    setScannerAtivo(false)
    setCodigoBipadoPosicao(codigo)
    
    const valido = await validarCodigoPosicao(codigo)
    if (valido) {
      setPosicaoValidada(true)
      toast({
        title: "Posição validada",
        description: "Código da posição confirmado. Confirmando endereçamento...",
        variant: "default"
      })
      // Confirmar endereçamento após validação
      setTimeout(() => {
        confirmarEnderecamentoFinal()
      }, 1000)
    } else {
      setPosicaoValidada(false)
      toast({
        title: "Código inválido",
        description: "O código bipado não corresponde à posição selecionada.",
        variant: "destructive"
      })
    }
  }

  const handleBipagemManualPalete = () => {
    if (codigoBipadoPalete.trim()) {
      handleCodigoPaleteEscaneado(codigoBipadoPalete)
    }
  }

  const handleBipagemManualPosicao = async () => {
    if (codigoBipadoPosicao.trim()) {
      await handleCodigoPosicaoEscaneado(codigoBipadoPosicao)
    }
  }

  const confirmarEnderecamentoFinal = async () => {
    if (!paleteSelecionado || !posicaoIdParaEnderecar) return

    setLoading(true)
    try {
      if (Array.isArray(posicaoIdParaEnderecar)) {
        // Múltiplas posições
        await WMSService.enderecarPaleteMultiplasPosicoes(paleteSelecionado.id, posicaoIdParaEnderecar)
        toast({
          title: "Sucesso",
          description: `Palete endereçado em ${posicaoIdParaEnderecar.length} posições com sucesso`,
          variant: "default"
        })
      } else {
        // Posição única
        await WMSService.enderecarPalete(paleteSelecionado.id, posicaoIdParaEnderecar)
        toast({
          title: "Sucesso",
          description: "Palete endereçado com sucesso",
          variant: "default"
        })
      }

      // Fechar diálogo e recarregar dados
      setMostrarDialogBipagem(false)
      setPosicaoIdParaEnderecar(null)
      setCodigoBipadoPalete("")
      setCodigoBipadoPosicao("")
      setPaleteValidado(false)
      setPosicaoValidada(false)
      
      await carregarPaletesDaCarga()
      setPaleteSelecionado(null)
      setSugestoes([])
      setSugestoesCompletas([])
      setSugestoesPorNivel({})
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao endereçar palete",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cancelarBipagem = () => {
    setMostrarDialogBipagem(false)
    setPosicaoIdParaEnderecar(null)
    setCodigoBipadoPalete("")
    setCodigoBipadoPosicao("")
    setPaleteValidado(false)
    setPosicaoValidada(false)
    setEtapaBipagem("palete")
    setScannerAtivo(false)
  }

  const handleConfirmarEnderecamento = (posicaoId: string | string[]) => {
    iniciarFluxoBipagem(posicaoId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
          <Button
              variant="ghost"
              onClick={() => router.push("/wms")}
              className="text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                <MapPin className="h-8 w-8 text-green-600" />
                Endereçamento WMS
              </h1>
              <span className="text-gray-600 mt-2"> Sugestões inteligentes de posicionamento</span>
            </div>
          
          </div>
        </div>

        {/* Seleção de Carga - Só mostra se houver cargas ou estiver carregando */}
        {(cargasMontadas.length > 0 || loadingCargas) && (
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Selecionar Carga
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={carregarCargasMontadas}
                disabled={loadingCargas}
              >
                <Search className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">Cargas Montadas</Label>
                {loadingCargas ? (
                  <div className="text-center py-4 text-gray-600">Carregando cargas...</div>
                ) : cargasMontadas.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Nenhuma carga montada encontrada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cargasMontadas.map((carga, index) => {
                      const idWMS = gerarIdWMS(carga, index)
                      const isSelected = cargaSelecionada?.id === carga.id
                      // Obter destino completo da sigla
                      const destinoCompleto = carga.cliente_destino 
                        ? obterDestinoCompleto(carga.cliente_destino) || carga.destino || carga.cliente_destino
                        : carga.destino || 'N/A'
                      return (
                        <div
                          key={carga.id}
                          onClick={() => setCargaSelecionada(carga)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-green-500 bg-green-50 shadow-md"
                              : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">Código:</span>
                              <span className="text-green-600 font-mono font-bold">{carga.codigo_carga}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">ID WMS:</span>
                              <span className="text-gray-700 font-mono text-xs">{idWMS}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Destino:</span>
                              <span className="text-sm font-medium text-blue-600">{destinoCompleto}</span>
                            </div>
                            <div className="pt-2 border-t border-gray-200">
                              <div className="text-xs text-gray-600">
                                {carga.total_nfs || 0} NFs • {carga.total_volumes || 0} volumes • {carga.quantidade_paletes || 0} paletes
                              </div>
                            </div>
                            {isSelected && (
                              <div className="pt-2">
                                <div className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded text-center">
                                  ✓ Selecionada
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Seleção de Palete da Carga */}
              {cargaSelecionada && (
                <div className="pt-4 border-t border-gray-200">
                  <Label className="mb-3 block">Paletes da Carga</Label>
                  {loading ? (
                    <div className="text-center py-4 text-gray-600">Carregando paletes...</div>
                  ) : paletes.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                      <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Nenhum palete aguardando armazenagem nesta carga</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {paletes.map((palete) => {
                        const isSelected = paleteSelecionado?.id === palete.id
                        return (
                          <div
                            key={palete.id}
                            onClick={() => setPaleteSelecionado(palete)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 shadow-md"
                                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900">Palete:</span>
                                <span className="text-blue-600 font-mono font-bold">{palete.codigo_palete}</span>
                              </div>
                              <div className="pt-2 border-t border-gray-200">
                                <div className="text-xs text-gray-600">
                                  {palete.quantidade_nfs || 0} NFs • {palete.quantidade_volumes || 0} volumes
                                </div>
                              </div>
                              {isSelected && (
                                <div className="pt-2">
                                  <div className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded text-center">
                                    ✓ Selecionado
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Filtros */}
        {paleteSelecionado && (
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-green-600" />
                Filtros por Nível
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="mb-3 block text-sm font-medium text-gray-700">
                    Selecione um nível para filtrar as sugestões
                  </Label>
                  
                  <Select value={nivelFiltro} onValueChange={setNivelFiltro}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        Todos os níveis ({sugestoesCompletas.length} sugestões)
                      </SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7].map((nivel) => {
                        const quantidade = sugestoesPorNivel[nivel] || 0
                        const isAltaGiro = nivel <= 2
                        const isBaixaGiro = nivel >= 4
                        return (
                          <SelectItem 
                            key={nivel} 
                            value={nivel.toString()}
                            disabled={quantidade === 0}
                          >
                            Nível {nivel} 
                            {isAltaGiro && " (Alta giro)"}
                            {!isAltaGiro && !isBaixaGiro && ""}
                            {isBaixaGiro && " (Baixa giro)"}
                            {quantidade > 0 && ` - ${quantidade} sugestões`}
                            {quantidade === 0 && " - Sem sugestões"}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sugestões */}
        {paleteSelecionado && (
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle>
                {nivelFiltro !== "all" 
                  ? `Posições Sugeridas - Nível ${nivelFiltro}`
                  : "Top 10 Posições Sugeridas"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-600">Carregando sugestões...</div>
              ) : sugestoes.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <p className="text-lg font-semibold mb-2">Nenhuma sugestão disponível</p>
                  {nivelFiltro !== "all" && (
                    <p className="text-sm text-gray-500">
                      Não há posições disponíveis no nível {nivelFiltro} que sejam preferenciais para o destino desta carga.
                      <br />
                      Tente selecionar outro nível ou verifique se há posições disponíveis neste nível no sistema.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sugestoes.map((sugestao, index) => {
                    // Verificar se é sugestão de posição única ou conjunto
                    if ('posicao' in sugestao) {
                      // Sugestão de posição única
                      return (
                        <SlotRecommendationCard
                          key={sugestao.posicao.id}
                          sugestao={sugestao}
                          onConfirmar={handleConfirmarEnderecamento}
                        />
                      )
                    } else {
                      // Sugestão de conjunto de posições
                      return (
                        <SlotConjuntoRecommendationCard
                          key={`conjunto-${index}-${sugestao.posicao_inicial.id}`}
                          sugestao={sugestao}
                          onConfirmar={handleConfirmarEnderecamento}
                        />
                      )
                    }
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialog de Bipagem */}
        <Dialog open={mostrarDialogBipagem} onOpenChange={setMostrarDialogBipagem}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-green-600" />
                {etapaBipagem === "palete" ? "Bipar Palete" : "Bipar Endereço da Posição"}
              </DialogTitle>
              <DialogDescription>
                {etapaBipagem === "palete" 
                  ? `Escaneie ou digite o código do palete: ${paleteSelecionado?.codigo_palete || ""}`
                  : "Escaneie ou digite o código do endereço da posição selecionada"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {etapaBipagem === "palete" ? (
                <>
                  <div className="space-y-2">
                    <Label>Código do Palete</Label>
                    <div className="flex gap-2">
                      <Input
                        value={codigoBipadoPalete}
                        onChange={(e) => setCodigoBipadoPalete(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleBipagemManualPalete()
                          }
                        }}
                        placeholder="Digite ou escaneie o código do palete"
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        onClick={() => setScannerAtivo(!scannerAtivo)}
                        variant="outline"
                      >
                        <Scan className="h-4 w-4 mr-2" />
                        {scannerAtivo ? "Fechar Scanner" : "Abrir Scanner"}
                      </Button>
                      <Button
                        onClick={handleBipagemManualPalete}
                        disabled={!codigoBipadoPalete.trim()}
                      >
                        Validar
                      </Button>
                    </div>
                  </div>

                  {scannerAtivo && (
                    <div className="mt-4">
                      <BarcodeScanner
                        onScan={handleCodigoPaleteEscaneado}
                        onError={(error) => {
                          console.error("Erro no scanner:", error)
                          toast({
                            title: "Erro no Scanner",
                            description: error,
                            variant: "destructive"
                          })
                        }}
                      />
                    </div>
                  )}

                  {paleteValidado && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-green-700 font-medium">Palete validado com sucesso!</span>
                    </div>
                  )}

                  {codigoBipadoPalete && !paleteValidado && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-700">
                        Código inválido. Esperado: <strong>{paleteSelecionado?.codigo_palete}</strong>
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Código do Endereço da Posição</Label>
                    <div className="flex gap-2">
                      <Input
                        value={codigoBipadoPosicao}
                        onChange={(e) => setCodigoBipadoPosicao(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            await handleBipagemManualPosicao()
                          }
                        }}
                        placeholder="Digite ou escaneie o código da posição"
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        onClick={() => setScannerAtivo(!scannerAtivo)}
                        variant="outline"
                      >
                        <Scan className="h-4 w-4 mr-2" />
                        {scannerAtivo ? "Fechar Scanner" : "Abrir Scanner"}
                      </Button>
                      <Button
                        onClick={handleBipagemManualPosicao}
                        disabled={!codigoBipadoPosicao.trim()}
                      >
                        Validar
                      </Button>
                    </div>
                  </div>

                  {scannerAtivo && (
                    <div className="mt-4">
                      <BarcodeScanner
                        onScan={handleCodigoPosicaoEscaneado}
                        onError={(error) => {
                          console.error("Erro no scanner:", error)
                          toast({
                            title: "Erro no Scanner",
                            description: error,
                            variant: "destructive"
                          })
                        }}
                      />
                    </div>
                  )}

                  {posicaoValidada && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-green-700 font-medium">Posição validada com sucesso! Confirmando endereçamento...</span>
                    </div>
                  )}

                  {codigoBipadoPosicao && !posicaoValidada && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-700">Código inválido. Verifique se corresponde à posição selecionada.</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={cancelarBipagem}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}

