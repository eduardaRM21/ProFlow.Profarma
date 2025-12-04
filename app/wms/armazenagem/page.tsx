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
  FileText,
  Loader2,
  Package,
  Truck,
  CheckCircle2,
  XCircle
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [transferirModalOpen, setTransferirModalOpen] = useState(false)
  const [paleteParaTransferir, setPaleteParaTransferir] = useState<string | null>(null)
  const [posicoesDisponiveis, setPosicoesDisponiveis] = useState<any[]>([])
  const [posicaoSelecionada, setPosicaoSelecionada] = useState<string>("")
  const [loadingTransferencia, setLoadingTransferencia] = useState(false)
  const [loadingPosicoes, setLoadingPosicoes] = useState(false)
  const [buscaPosicao, setBuscaPosicao] = useState("")
  const [pickingModalOpen, setPickingModalOpen] = useState(false)
  const [codigoCargaPicking, setCodigoCargaPicking] = useState("")
  const [codigoEnderecoPicking, setCodigoEnderecoPicking] = useState("")
  const [codigoPaletePicking, setCodigoPaletePicking] = useState("")
  const [cargaPicking, setCargaPicking] = useState<any>(null)
  const [validacaoPicking, setValidacaoPicking] = useState<{
    enderecoValido: boolean | null
    paleteValido: boolean | null
    mensagem: string
  }>({
    enderecoValido: null,
    paleteValido: null,
    mensagem: ""
  })
  const [loadingPicking, setLoadingPicking] = useState(false)
  const [loadingValidacao, setLoadingValidacao] = useState(false)

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
    setPaleteParaTransferir(paleteId)
    setTransferirModalOpen(true)
    await carregarPosicoesDisponiveis()
  }

  const carregarPosicoesDisponiveis = async () => {
    setLoadingPosicoes(true)
    try {
      const data = await WMSService.listarPosicoes({ status: 'disponivel' })
      setPosicoesDisponiveis(data)
    } catch (error) {
      console.error("Erro ao carregar posições disponíveis:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar posições disponíveis",
        variant: "destructive"
      })
    } finally {
      setLoadingPosicoes(false)
    }
  }

  const confirmarTransferencia = async () => {
    if (!paleteParaTransferir || !posicaoSelecionada) {
      toast({
        title: "Atenção",
        description: "Selecione uma posição para transferir",
        variant: "destructive"
      })
      return
    }

    setLoadingTransferencia(true)
    try {
      await WMSService.transferirPalete(paleteParaTransferir, posicaoSelecionada)
      toast({
        title: "Sucesso",
        description: "Palete transferido com sucesso",
        variant: "default"
      })
      setTransferirModalOpen(false)
      setPaleteParaTransferir(null)
      setPosicaoSelecionada("")
      setBuscaPosicao("")
      await carregarPosicoes()
      // Fechar drawer se estiver aberto
      if (drawerOpen) {
        setDrawerOpen(false)
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao transferir palete",
        variant: "destructive"
      })
    } finally {
      setLoadingTransferencia(false)
    }
  }

  const posicoesFiltradas = posicoesDisponiveis.filter(posicao => {
    if (!buscaPosicao) return true
    const busca = buscaPosicao.toLowerCase()
    return (
      posicao.codigo_posicao?.toLowerCase().includes(busca) ||
      obterSiglaRua(posicao.rua)?.toLowerCase().includes(busca) ||
      posicao.nivel?.toString().includes(busca)
    )
  })

  const handleAbrirPicking = () => {
    setPickingModalOpen(true)
    setCodigoCargaPicking("")
    setCodigoEnderecoPicking("")
    setCodigoPaletePicking("")
    setCargaPicking(null)
    setValidacaoPicking({
      enderecoValido: null,
      paleteValido: null,
      mensagem: ""
    })
  }

  const buscarCargaPicking = async () => {
    if (!codigoCargaPicking.trim()) {
      toast({
        title: "Atenção",
        description: "Digite o código da carga",
        variant: "destructive"
      })
      return
    }

    setLoadingValidacao(true)
    try {
      const cargas = await WMSService.listarCargas()
      const carga = cargas.find(c => 
        c.codigo_carga.toLowerCase() === codigoCargaPicking.trim().toLowerCase()
      )

      if (!carga) {
        toast({
          title: "Carga não encontrada",
          description: `Nenhuma carga encontrada com o código ${codigoCargaPicking}`,
          variant: "destructive"
        })
        setCargaPicking(null)
        return
      }

      setCargaPicking(carga)
      toast({
        title: "Carga encontrada",
        description: `Carga ${carga.codigo_carga} carregada com sucesso`,
        variant: "default"
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao buscar carga",
        variant: "destructive"
      })
    } finally {
      setLoadingValidacao(false)
    }
  }

  const validarEnderecoPicking = async () => {
    if (!codigoEnderecoPicking.trim()) {
      setValidacaoPicking({
        enderecoValido: false,
        paleteValido: null,
        mensagem: "Digite o código do endereço"
      })
      return
    }

    setLoadingValidacao(true)
    try {
      const posicao = await WMSService.buscarPosicaoPorCodigo(codigoEnderecoPicking.trim())
      
      if (!posicao) {
        setValidacaoPicking({
          enderecoValido: false,
          paleteValido: null,
          mensagem: "Endereço não encontrado"
        })
        return
      }

      if (posicao.status !== "ocupada" || !posicao.palete_id) {
        setValidacaoPicking({
          enderecoValido: false,
          paleteValido: null,
          mensagem: "Endereço não está ocupado por nenhum palete"
        })
        return
      }

      setValidacaoPicking({
        enderecoValido: true,
        paleteValido: null,
        mensagem: `Endereço válido: ${posicao.codigo_posicao}`
      })
    } catch (error: any) {
      setValidacaoPicking({
        enderecoValido: false,
        paleteValido: null,
        mensagem: error.message || "Erro ao validar endereço"
      })
    } finally {
      setLoadingValidacao(false)
    }
  }

  const validarPaletePicking = async () => {
    if (!codigoPaletePicking.trim()) {
      setValidacaoPicking(prev => ({
        ...prev,
        paleteValido: false,
        mensagem: "Digite o código do palete"
      }))
      return
    }

    if (!validacaoPicking.enderecoValido) {
      setValidacaoPicking(prev => ({
        ...prev,
        paleteValido: false,
        mensagem: "Valide o endereço primeiro"
      }))
      return
    }

    setLoadingValidacao(true)
    try {
      const palete = await WMSService.buscarPaletePorCodigo(codigoPaletePicking.trim())
      
      if (!palete) {
        setValidacaoPicking(prev => ({
          ...prev,
          paleteValido: false,
          mensagem: "Palete não encontrado"
        }))
        return
      }

      // Buscar a posição atual do endereço escaneado
      const posicaoEndereco = await WMSService.buscarPosicaoPorCodigo(codigoEnderecoPicking.trim())
      
      if (!posicaoEndereco || posicaoEndereco.palete_id !== palete.id) {
        setValidacaoPicking(prev => ({
          ...prev,
          paleteValido: false,
          mensagem: `Palete ${palete.codigo_palete} não está no endereço ${codigoEnderecoPicking}`
        }))
        return
      }

      // Verificar se o palete pertence à carga
      if (cargaPicking && palete.carga_id !== cargaPicking.id) {
        setValidacaoPicking(prev => ({
          ...prev,
          paleteValido: false,
          mensagem: `Palete não pertence à carga ${cargaPicking.codigo_carga}`
        }))
        return
      }

      setValidacaoPicking(prev => ({
        ...prev,
        paleteValido: true,
        mensagem: `Validação OK! Palete ${palete.codigo_palete} confirmado no endereço ${codigoEnderecoPicking}`
      }))
    } catch (error: any) {
      setValidacaoPicking(prev => ({
        ...prev,
        paleteValido: false,
        mensagem: error.message || "Erro ao validar palete"
      }))
    } finally {
      setLoadingValidacao(false)
    }
  }

  const confirmarPicking = async () => {
    if (!validacaoPicking.enderecoValido || !validacaoPicking.paleteValido) {
      toast({
        title: "Atenção",
        description: "Valide o endereço e o palete antes de confirmar",
        variant: "destructive"
      })
      return
    }

    setLoadingPicking(true)
    try {
      const palete = await WMSService.buscarPaletePorCodigo(codigoPaletePicking.trim())
      
      if (!palete) {
        throw new Error("Palete não encontrado")
      }

      // Atualizar status do palete para expedido
      await WMSService.atualizarPalete(palete.id, {
        status: 'expedido',
        data_expedicao: new Date().toISOString()
      })

      // Liberar a posição
      if (palete.posicao_id) {
        const posicaoId = palete.posicao_id
        const posicao = await WMSService.buscarPosicao(posicaoId)
        if (posicao) {
          const { getSupabase, retryWithBackoff } = await import('@/lib/supabase-client')
          await retryWithBackoff(async () => {
            return await getSupabase()
              .from('wms_posicoes')
              .update({
                status: 'disponivel',
                palete_id: null,
                data_liberacao: new Date().toISOString()
              })
              .eq('id', posicaoId)
          })
        }
      }

      toast({
        title: "Sucesso",
        description: `Palete ${palete.codigo_palete} expedido com sucesso!`,
        variant: "default"
      })

      // Limpar campos e fechar modal
      setPickingModalOpen(false)
      setCodigoCargaPicking("")
      setCodigoEnderecoPicking("")
      setCodigoPaletePicking("")
      setCargaPicking(null)
      setValidacaoPicking({
        enderecoValido: null,
        paleteValido: null,
        mensagem: ""
      })

      // Recarregar posições
      await carregarPosicoes()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao confirmar picking",
        variant: "destructive"
      })
    } finally {
      setLoadingPicking(false)
    }
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
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm md:text-sm px-2 md:px-4">Código</TableHead>
                      <TableHead className="hidden md:table-cell text-sm">Posição</TableHead>
                      <TableHead className="hidden md:table-cell text-sm">Rua</TableHead>
                      <TableHead className="hidden md:table-cell text-sm">Nível</TableHead>
                      <TableHead className="hidden md:table-cell text-sm">Status</TableHead>
                      <TableHead className="text-sm md:text-sm px-2 md:px-4">Palete</TableHead>
                      <TableHead className="text-sm md:text-sm px-2 md:px-4 w-24 md:w-auto">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posicoes.slice(0, 100).map((posicao) => (
                      <TableRow key={posicao.id}>
                        <TableCell className="font-semibold text-xs md:text-sm px-2 md:px-4 whitespace-nowrap">
                          {posicao.codigo_posicao}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm">
                          {posicao.posicao ? String(posicao.posicao).padStart(3, '0') : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {obterSiglaRua(posicao.rua)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {posicao.nivel}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <PositionBadge status={posicao.status} />
                        </TableCell>
                        <TableCell className="px-2 md:px-4">
                          {posicao.palete_id ? (
                            <Badge variant="outline" className="text-xs md:text-sm whitespace-nowrap">
                              {posicao.palete?.codigo_palete || "N/A"}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs md:text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 md:px-4">
                          <div className="flex gap-1 md:gap-2">
                            {posicao.status === "ocupada" && posicao.palete_id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerDetalhes(posicao)}
                                  title="Ver detalhes"
                                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                                >
                                  <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTransferir(posicao.palete_id)}
                                  title="Transferir palete"
                                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                                >
                                  <ArrowRightLeft className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleAbrirPicking}
                                  title="Fazer picking"
                                  className="h-7 w-7 md:h-8 md:w-8 p-0 text-blue-600 hover:text-blue-700"
                                >
                                  <Truck className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                              </>
                            )}
                            {posicao.status === "disponivel" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBloquear(posicao.id)}
                                className="h-7 w-7 md:h-8 md:w-8 p-0"
                              >
                                <Lock className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            )}
                            {posicao.status === "bloqueada" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDesbloquear(posicao.id)}
                                className="h-7 w-7 md:h-8 md:w-8 p-0"
                              >
                                <Unlock className="h-3 w-3 md:h-4 md:w-4" />
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
  
        {/* Modal de Transferência */}
        <Dialog open={transferirModalOpen} onOpenChange={setTransferirModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-green-600" />
                Transferir Palete
              </DialogTitle>
              <DialogDescription>
                Selecione a nova posição para onde deseja transferir o palete
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Busca de Posição */}
              <div>
                <Label>Buscar Posição</Label>
                <Input
                  value={buscaPosicao}
                  onChange={(e) => setBuscaPosicao(e.target.value)}
                  placeholder="Digite o código da posição, rua ou nível..."
                  className="mt-1"
                />
              </div>

              {/* Lista de Posições Disponíveis */}
              <div>
                <Label className="mb-2 block">
                  Posições Disponíveis ({posicoesFiltradas.length})
                </Label>
                {loadingPosicoes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                    <span className="ml-2 text-gray-600">Carregando posições...</span>
                  </div>
                ) : posicoesFiltradas.length === 0 ? (
                  <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                    Nenhuma posição disponível encontrada
                  </div>
                ) : (
                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Rua</TableHead>
                          <TableHead>Nível</TableHead>
                          <TableHead>Posição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {posicoesFiltradas.map((posicao) => (
                          <TableRow
                            key={posicao.id}
                            className={`cursor-pointer hover:bg-green-50 ${
                              posicaoSelecionada === posicao.id ? "bg-green-100" : ""
                            }`}
                            onClick={() => setPosicaoSelecionada(posicao.id)}
                          >
                            <TableCell>
                              <input
                                type="radio"
                                checked={posicaoSelecionada === posicao.id}
                                onChange={() => setPosicaoSelecionada(posicao.id)}
                                className="h-4 w-4 text-green-600"
                              />
                            </TableCell>
                            <TableCell className="font-mono font-semibold">
                              {posicao.codigo_posicao}
                            </TableCell>
                            <TableCell>{obterSiglaRua(posicao.rua)}</TableCell>
                            <TableCell>{posicao.nivel}</TableCell>
                            <TableCell className="font-mono">
                              {posicao.posicao ? String(posicao.posicao).padStart(3, '0') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setTransferirModalOpen(false)
                  setPosicaoSelecionada("")
                  setBuscaPosicao("")
                  setPaleteParaTransferir(null)
                }}
                disabled={loadingTransferencia}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarTransferencia}
                disabled={!posicaoSelecionada || loadingTransferencia}
                className="bg-green-600 hover:bg-green-700"
              >
                {loadingTransferencia ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Confirmar Transferência
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Picking */}
        <Dialog open={pickingModalOpen} onOpenChange={setPickingModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Picking da Carga
              </DialogTitle>
              <DialogDescription>
                Escaneie o endereço e o código do palete para validar e confirmar o picking
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Busca de Carga */}
              <div>
                <Label>Código da Carga</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={codigoCargaPicking}
                    onChange={(e) => setCodigoCargaPicking(e.target.value)}
                    placeholder="Ex: CAR-00001"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        buscarCargaPicking()
                      }
                    }}
                  />
                  <Button
                    onClick={buscarCargaPicking}
                    disabled={loadingValidacao}
                    variant="outline"
                  >
                    {loadingValidacao ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {cargaPicking && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="font-semibold text-sm">Carga: {cargaPicking.codigo_carga}</p>
                    <p className="text-xs text-gray-600">Cliente: {cargaPicking.cliente_destino}</p>
                    <p className="text-xs text-gray-600">Destino: {cargaPicking.destino}</p>
                  </div>
                )}
              </div>

              {/* Validação de Endereço */}
              <div>
                <Label>Endereço (Bipar)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={codigoEnderecoPicking}
                    onChange={(e) => {
                      setCodigoEnderecoPicking(e.target.value)
                      setValidacaoPicking({
                        enderecoValido: null,
                        paleteValido: null,
                        mensagem: ""
                      })
                    }}
                    placeholder="Escaneie ou digite o código do endereço"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        validarEnderecoPicking()
                      }
                    }}
                    className={validacaoPicking.enderecoValido === true ? "border-green-500" : 
                               validacaoPicking.enderecoValido === false ? "border-red-500" : ""}
                  />
                  <Button
                    onClick={validarEnderecoPicking}
                    disabled={loadingValidacao || !codigoEnderecoPicking.trim()}
                    variant="outline"
                  >
                    {loadingValidacao ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : validacaoPicking.enderecoValido === true ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {validacaoPicking.enderecoValido !== null && (
                  <div className={`mt-2 p-3 rounded-lg flex items-center gap-2 ${
                    validacaoPicking.enderecoValido ? "bg-green-50" : "bg-red-50"
                  }`}>
                    {validacaoPicking.enderecoValido ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <p className={`text-sm ${
                      validacaoPicking.enderecoValido ? "text-green-700" : "text-red-700"
                    }`}>
                      {validacaoPicking.mensagem}
                    </p>
                  </div>
                )}
              </div>

              {/* Validação de Palete */}
              <div>
                <Label>Código do Palete (Bipar)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={codigoPaletePicking}
                    onChange={(e) => {
                      setCodigoPaletePicking(e.target.value)
                      if (validacaoPicking.paleteValido !== null) {
                        setValidacaoPicking(prev => ({
                          ...prev,
                          paleteValido: null,
                          mensagem: prev.enderecoValido ? prev.mensagem : ""
                        }))
                      }
                    }}
                    placeholder="Escaneie ou digite o código do palete"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        validarPaletePicking()
                      }
                    }}
                    disabled={!validacaoPicking.enderecoValido}
                    className={validacaoPicking.paleteValido === true ? "border-green-500" : 
                               validacaoPicking.paleteValido === false ? "border-red-500" : ""}
                  />
                  <Button
                    onClick={validarPaletePicking}
                    disabled={loadingValidacao || !codigoPaletePicking.trim() || !validacaoPicking.enderecoValido}
                    variant="outline"
                  >
                    {loadingValidacao ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : validacaoPicking.paleteValido === true ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {validacaoPicking.paleteValido !== null && (
                  <div className={`mt-2 p-3 rounded-lg flex items-center gap-2 ${
                    validacaoPicking.paleteValido ? "bg-green-50" : "bg-red-50"
                  }`}>
                    {validacaoPicking.paleteValido ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <p className={`text-sm ${
                      validacaoPicking.paleteValido ? "text-green-700" : "text-red-700"
                    }`}>
                      {validacaoPicking.mensagem}
                    </p>
                  </div>
                )}
              </div>

              {/* Resumo da Validação */}
              {validacaoPicking.enderecoValido && validacaoPicking.paleteValido && (
                <div className="bg-green-50 border-2 border-green-500 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-700">Validação Completa!</p>
                  </div>
                  <p className="text-sm text-green-700">
                    Endereço e palete validados. Clique em "Confirmar Picking" para finalizar.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPickingModalOpen(false)
                  setCodigoCargaPicking("")
                  setCodigoEnderecoPicking("")
                  setCodigoPaletePicking("")
                  setCargaPicking(null)
                  setValidacaoPicking({
                    enderecoValido: null,
                    paleteValido: null,
                    mensagem: ""
                  })
                }}
                disabled={loadingPicking}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarPicking}
                disabled={!validacaoPicking.enderecoValido || !validacaoPicking.paleteValido || loadingPicking}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loadingPicking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    Confirmar Picking
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

