"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, MapPin, Package, Search } from "lucide-react"
import { WMSService, type WMSSugestaoPosicao, type WMSSugestaoConjuntoPosicoes } from "@/lib/wms-service"
import { SlotRecommendationCard } from "@/components/wms/slot-recommendation-card"
import { SlotConjuntoRecommendationCard } from "@/components/wms/slot-conjunto-recommendation-card"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-database"

export default function WMSEnderecamentoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { getSession } = useSession()

  const [paleteSelecionado, setPaleteSelecionado] = useState<any>(null)
  const [paletes, setPaletes] = useState<any[]>([])
  const [sugestoes, setSugestoes] = useState<(WMSSugestaoPosicao | WMSSugestaoConjuntoPosicoes)[]>([])
  const [loading, setLoading] = useState(false)
  const [nivelFiltro, setNivelFiltro] = useState<string>("all")

  useEffect(() => {
    carregarPaletesAguardando()
  }, [])

  useEffect(() => {
    if (paleteSelecionado) {
      carregarSugestoes()
    }
  }, [paleteSelecionado, nivelFiltro])

  const carregarPaletesAguardando = async () => {
    try {
      setLoading(true)
      // Buscar diretamente os paletes com status aguardando_agendamento
      const paletesAguardando = await WMSService.listarPaletes({ 
        status: "aguardando_agendamento" 
      })
      
      setPaletes(paletesAguardando)
    } catch (error) {
      console.error("Erro ao carregar paletes:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar paletes aguardando agendamento",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
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

      const sugestoesData = await WMSService.sugerirPosicoes(palete, 10)
      
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

  const handleConfirmarEnderecamento = async (posicaoId: string | string[]) => {
    if (!paleteSelecionado) return

    setLoading(true)
    try {
      if (Array.isArray(posicaoId)) {
        // Múltiplas posições
        await WMSService.enderecarPaleteMultiplasPosicoes(paleteSelecionado.id, posicaoId)
        toast({
          title: "Sucesso",
          description: `Palete endereçado em ${posicaoId.length} posições com sucesso`,
          variant: "default"
        })
      } else {
        // Posição única
        await WMSService.enderecarPalete(paleteSelecionado.id, posicaoId)
        toast({
          title: "Sucesso",
          description: "Palete endereçado com sucesso",
          variant: "default"
        })
      }

      // Recarregar dados
      await carregarPaletesAguardando()
      setPaleteSelecionado(null)
      setSugestoes([])
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/wms")}
              className="text-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="h-8 w-8 text-green-600" />
                Endereçamento WMS
              </h1>
              <p className="text-gray-600 mt-1">Sugestões inteligentes de posicionamento</p>
            </div>
          </div>
        </div>

        {/* Seleção de Palete */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Selecionar Palete
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={carregarPaletesAguardando}
                disabled={loading}
              >
                <Search className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Palete Aguardando Agendamento</Label>
                {loading ? (
                  <div className="text-center py-4 text-gray-600">Carregando paletes...</div>
                ) : paletes.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Nenhum palete aguardando armazenagem</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Finalize um carro na seção WMS - Embalagem para que ele apareça aqui
                    </p>
                  </div>
                ) : (
                  <Select
                    value={paleteSelecionado?.id || ""}
                    onValueChange={(value) => {
                      const palete = paletes.find(p => p.id === value)
                      setPaleteSelecionado(palete || null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um palete" />
                    </SelectTrigger>
                    <SelectContent>
                      {paletes.map((palete) => (
                        <SelectItem key={palete.id} value={palete.id}>
                          {palete.codigo_palete} - {palete.quantidade_nfs || 0} NFs, {palete.quantidade_volumes || 0} volumes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {paleteSelecionado && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Palete: {paleteSelecionado.codigo_palete}</span>
                    <span className="text-sm text-gray-600">
                      {paleteSelecionado.quantidade_nfs} NFs • {paleteSelecionado.quantidade_volumes} volumes
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        {paleteSelecionado && (
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-green-600" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Nível</Label>
                  <Select value={nivelFiltro} onValueChange={setNivelFiltro}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os níveis</SelectItem>
                      <SelectItem value="1">Nível 1 (Alta giro)</SelectItem>
                      <SelectItem value="2">Nível 2 (Alta giro)</SelectItem>
                      <SelectItem value="3">Nível 3</SelectItem>
                      <SelectItem value="4">Nível 4 (Baixa giro)</SelectItem>
                      <SelectItem value="5">Nível 5 (Baixa giro)</SelectItem>
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
              <CardTitle>Top 10 Posições Sugeridas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-600">Carregando sugestões...</div>
              ) : sugestoes.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  Nenhuma sugestão disponível
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

        {/* Mini Mapa por Nível */}
        {paleteSelecionado && (
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle>Visualização por Nível</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((nivel) => (
                  <div key={nivel}>
                    <h3 className="text-sm font-semibold mb-2">Nível {nivel}</h3>
                    <div className="grid grid-cols-21 gap-1">
                      {/* Grade simplificada - 28 corredores x 21 ruas */}
                      {Array.from({ length: 28 * 21 }).map((_, index) => {
                        const corredor = Math.floor(index / 21) + 1
                        const rua = (index % 21) + 1
                        
                        // Verificar se há uma sugestão para esta posição
                        const sugestaoPosicaoUnica = sugestoes.find(s => {
                          if ('posicao' in s) {
                            return s.posicao.corredor === corredor && 
                                   s.posicao.rua === rua && 
                                   s.posicao.nivel === nivel
                          }
                          return false
                        })
                        
                        // Verificar se há uma sugestão de conjunto que inclui esta posição
                        const sugestaoConjunto = sugestoes.find(s => 
                          'posicoes' in s &&
                          s.posicoes.some(p => 
                            p.corredor === corredor && 
                            p.rua === rua && 
                            p.nivel === nivel
                          )
                        )
                        
                        const temSugestao = sugestaoPosicaoUnica || sugestaoConjunto
                        
                        return (
                          <div
                            key={index}
                            className={`w-3 h-3 rounded ${
                              temSugestao
                                ? "bg-green-500"
                                : "bg-gray-200"
                            }`}
                            title={`C${String(corredor).padStart(2, "0")}-R${String(rua).padStart(2, "0")}-N${nivel}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

