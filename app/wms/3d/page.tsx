"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Box, Filter, RotateCcw } from "lucide-react"
import { WMSService } from "@/lib/wms-service"
import { SideDrawerPalete } from "@/components/wms/side-drawer-palete"
import Warehouse3D from "@/components/wms/warehouse-3d"
import { useToast } from "@/hooks/use-toast"

export default function WMS3DPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [posicoes, setPosicoes] = useState<any[]>([])
  const [nivelSelecionado, setNivelSelecionado] = useState<number>(1)
  const [posicaoSelecionada, setPosicaoSelecionada] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarPosicoes()
  }, [nivelSelecionado, filtroCliente])

  const carregarPosicoes = async () => {
    try {
      setLoading(true)
      const data = await WMSService.listarPosicoes({
        nivel: nivelSelecionado,
        cliente_preferencial: filtroCliente || undefined
      })
      setPosicoes(data)
    } catch (error) {
      console.error("Erro ao carregar posições:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar posições",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClickPosicao = async (posicao: any) => {
    setPosicaoSelecionada(posicao)
    
      if (posicao.palete_id) {
        const palete = await WMSService.buscarPalete(posicao.palete_id)
        if (palete) {
          // Buscar notas do palete através do serviço
          const paleteCompleto = await WMSService.buscarPalete(posicao.palete_id)
          const notas = paleteCompleto?.notas || []
          
          setPosicaoSelecionada({
            ...posicao,
            palete: paleteCompleto,
            notas: notas
          })
          setDrawerOpen(true)
        }
      } else {
        setDrawerOpen(true)
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
                <Box className="h-8 w-8 text-green-600" />
                Visualização 3D do Estoque
              </h1>
              <p className="text-gray-600 mt-1">Visão interativa do porta-paletes</p>
            </div>
          </div>
        </div>

        {/* Controles */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-green-600" />
              Controles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Nível</Label>
                <Select
                  value={nivelSelecionado.toString()}
                  onValueChange={(value) => setNivelSelecionado(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Nível 1</SelectItem>
                    <SelectItem value="2">Nível 2</SelectItem>
                    <SelectItem value="3">Nível 3</SelectItem>
                    <SelectItem value="4">Nível 4</SelectItem>
                    <SelectItem value="5">Nível 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filtrar por Cliente</Label>
                <Select
                  value={filtroCliente || "all"}
                  onValueChange={(value) => setFiltroCliente(value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {/* TODO: Carregar lista de clientes */}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border">
                  Controles: Rotacionar (arrastar), Zoom (scroll), Mover (arrastar com botão direito)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visualização 3D */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Nível {nivelSelecionado} - {posicoes.length} posições
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={carregarPosicoes}
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando visualização 3D...</p>
                </div>
              </div>
            ) : (
              <>
                <Warehouse3D
                  posicoes={posicoes}
                  nivelSelecionado={nivelSelecionado}
                  onPositionClick={handleClickPosicao}
                />
                
                {/* Legenda */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded border border-gray-400"></div>
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#8B4513] rounded border border-gray-400"></div>
                    <span>Ocupada (com pallet e caixas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 rounded border border-gray-400"></div>
                    <span>Bloqueada</span>
                  </div>
                  <div className="ml-auto text-xs text-gray-500">
                    💡 Use o mouse para rotacionar, arrastar e dar zoom
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Drawer de Detalhes */}
        <SideDrawerPalete
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false)
            setPosicaoSelecionada(null)
          }}
          palete={posicaoSelecionada?.palete || null}
          posicao={posicaoSelecionada || null}
          carga={null}
          notas={posicaoSelecionada?.notas || []}
        />
      </div>
    </div>
  )
}

