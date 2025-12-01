"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Warehouse,
  Search,
  ArrowRightLeft,
  Lock,
  Unlock,
  Eye,
  FileText
} from "lucide-react"
import { WMSService } from "@/lib/wms-service"
import { NFSearchBar } from "@/components/wms/nf-search-bar"
import { PositionBadge } from "@/components/wms/position-badge"
import { SideDrawerPalete } from "@/components/wms/side-drawer-palete"
import { useToast } from "@/hooks/use-toast"
import { obterSiglaRua } from "@/lib/wms-utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function WMSArmazenagemPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [posicoes, setPosicoes] = useState<any[]>([])
  const [filtros, setFiltros] = useState({
    cliente: "",
    destino: "",
    nivel: "",
    status: ""
  })
  const [buscaNF, setBuscaNF] = useState("")
  const [resultadoBusca, setResultadoBusca] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paleteSelecionado, setPaleteSelecionado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarPosicoes()
  }, [filtros])

  const carregarPosicoes = async () => {
    setLoading(true)
    try {
      const data = await WMSService.listarPosicoes({
        status: filtros.status || undefined,
        nivel: filtros.nivel ? parseInt(filtros.nivel) : undefined,
        cliente_preferencial: filtros.cliente || undefined,
        destino_preferencial: filtros.destino || undefined
      })
      setPosicoes(data)
    } catch (error) {
      console.error("Erro ao carregar posições:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBuscaNF = (result: any) => {
    setResultadoBusca(result)
    if (result.palete) {
      setPaleteSelecionado(result.palete)
    }
  }

  const handleTransferir = async (paleteId: string) => {
    // TODO: Implementar modal de seleção de nova posição
    toast({
      title: "Info",
      description: "Funcionalidade de transferência em desenvolvimento",
      variant: "default"
    })
  }

  const handleBloquear = async (posicaoId: string) => {
    try {
      await WMSService.bloquearPosicao(posicaoId, "Bloqueio manual")
      toast({
        title: "Sucesso",
        description: "Posição bloqueada",
        variant: "default"
      })
      await carregarPosicoes()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao bloquear posição",
        variant: "destructive"
      })
    }
  }

  const handleDesbloquear = async (posicaoId: string) => {
    try {
      await WMSService.desbloquearPosicao(posicaoId)
      toast({
        title: "Sucesso",
        description: "Posição desbloqueada",
        variant: "default"
      })
      await carregarPosicoes()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao desbloquear posição",
        variant: "destructive"
      })
    }
  }

  const handleVerDetalhes = (posicao: any) => {
    if (posicao.palete_id) {
      WMSService.buscarPalete(posicao.palete_id).then(palete => {
        setPaleteSelecionado(palete)
        setDrawerOpen(true)
      })
    }
  }

  // Função para converter notas do formato WMSPaleteNotaItem para NotaFiscal
  const converterNotasParaFormatoComponente = (notas: any[]): any[] => {
    if (!notas || !Array.isArray(notas)) return []
    
    return notas.map((nota: any) => ({
      id: nota.id || nota.codigo_completo || '',
      codigoCompleto: nota.codigo_completo || '',
      numeroNF: nota.numero_nf || nota.numeroNF || '',
      volumes: nota.volumes || 0,
      fornecedor: nota.fornecedor || '',
      clienteDestino: nota.cliente_destino || nota.clienteDestino || '',
      destino: nota.destino || '',
      tipoCarga: nota.tipo_carga || nota.tipoCarga || '',
      data: nota.data_associacao || nota.data || new Date().toISOString(),
      timestamp: nota.data_associacao || nota.timestamp || new Date().toISOString(),
      status: nota.status || 'ok' as const
    }))
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
                <Warehouse className="h-8 w-8 text-green-600" />
                Armazenagem WMS
              </h1>
              <p className="text-gray-600 mt-1">Gestão de estoque e posições</p>
            </div>
          </div>
        </div>

        {/* Busca por NF */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-600" />
              Buscar por Nota Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NFSearchBar onResult={handleBuscaNF} />
            {resultadoBusca && resultadoBusca.palete && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Palete encontrado: {resultadoBusca.palete.codigo_palete}</p>
                    {resultadoBusca.posicao && (
                      <p className="text-sm text-gray-600">
                        Posição: {resultadoBusca.posicao.codigo_posicao}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {resultadoBusca.notas_palete.length} NFs no palete
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setPaleteSelecionado(resultadoBusca.palete)
                      setDrawerOpen(true)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Cliente</Label>
                <Input
                  value={filtros.cliente}
                  onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
                  placeholder="Filtrar por cliente"
                />
              </div>
              <div>
                <Label>Destino</Label>
                <Input
                  value={filtros.destino}
                  onChange={(e) => setFiltros({ ...filtros, destino: e.target.value })}
                  placeholder="Filtrar por destino"
                />
              </div>
              <div>
                <Label>Nível</Label>
                <Select
                  value={filtros.nivel || "all"}
                  onValueChange={(value) => setFiltros({ ...filtros, nivel: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="1">Nível 1</SelectItem>
                    <SelectItem value="2">Nível 2</SelectItem>
                    <SelectItem value="3">Nível 3</SelectItem>
                    <SelectItem value="4">Nível 4</SelectItem>
                    <SelectItem value="5">Nível 5</SelectItem>
                    <SelectItem value="6">Nível 6</SelectItem>
                    <SelectItem value="7">Nível 7</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={filtros.status || "all"}
                  onValueChange={(value) => setFiltros({ ...filtros, status: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="ocupada">Ocupada</SelectItem>
                    <SelectItem value="bloqueada">Bloqueada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade de Estoque */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>
              Grade de Estoque ({posicoes.length} posições)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-600">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Posição</TableHead>
                      <TableHead>Rua</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Palete</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posicoes.slice(0, 100).map((posicao) => (
                      <TableRow key={posicao.id}>
                        <TableCell className="font-mono font-semibold">
                          {posicao.codigo_posicao}
                        </TableCell>
                        <TableCell className="font-mono">
                          {posicao.posicao ? String(posicao.posicao).padStart(3, '0') : '-'}
                        </TableCell>
                        <TableCell>{obterSiglaRua(posicao.rua)}</TableCell>
                        <TableCell>{posicao.nivel}</TableCell>
                        <TableCell>
                          <PositionBadge status={posicao.status} />
                        </TableCell>
                        <TableCell>
                          {posicao.palete_id ? (
                            <Badge variant="outline">{posicao.palete?.codigo_palete || "N/A"}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {posicao.status === "ocupada" && posicao.palete_id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerDetalhes(posicao)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTransferir(posicao.palete_id)}
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {posicao.status === "disponivel" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBloquear(posicao.id)}
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                            )}
                            {posicao.status === "bloqueada" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDesbloquear(posicao.id)}
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drawer de Detalhes */}
        <SideDrawerPalete
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          palete={paleteSelecionado}
          posicao={resultadoBusca?.posicao || paleteSelecionado?.posicao || null}
          carga={resultadoBusca?.carga || null}
          notas={
            resultadoBusca?.notas_palete?.length 
              ? converterNotasParaFormatoComponente(resultadoBusca.notas_palete)
              : paleteSelecionado?.notas?.length
              ? converterNotasParaFormatoComponente(paleteSelecionado.notas)
              : []
          }
          onTransferir={handleTransferir}
        />
      </div>
    </div>
  )
}

