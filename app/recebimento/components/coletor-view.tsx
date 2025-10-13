"use client"

import type React from "react"
import { useMemo, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Package,
  Camera,
  CameraOff,
  Scan,
  CheckCircle,
  AlertTriangle,
  FileText,
  Eye,
  X,
  Trash2,
  LogOut,
  Truck,
  Search,
} from "lucide-react"
import BarcodeScanner from "./barcode-scanner"
import type { NotaFiscal } from "@/lib/database-service"
import "../coletor-styles.css"

interface ColetorViewProps {
  codigoInput: string
  setCodigoInput: (value: string) => void
  scannerAtivo: boolean
  setScannerAtivo: (value: boolean) => void
  scannerParaBipar: boolean
  setScannerParaBipar: (value: boolean) => void
  handleBipagem: () => void
  handleKeyPress: (e: React.KeyboardEvent) => void
  handleCodigoEscaneado: (codigo: string) => void
  notas: NotaFiscal[]
  finalizarRelatorio: () => void
  setModalRelatorios: (value: boolean) => void
  inputRef: React.RefObject<HTMLInputElement>
  sessionData: any
  clearNotas: (chave: string) => Promise<void>
  handleLogout: () => void
  // Novas props para funcionalidades de transportadora
  transportadoraSelecionada?: string
  progressoTransportadora?: { bipadas: number; total: number; percentual: number }
  bipagemIniciada?: boolean
  setModalSelecaoTransportadora?: (value: boolean) => void
  sessaoIniciada?: boolean
  iniciarBipagem?: () => void
  finalizando?: boolean
  setModalConsultarNfsFaltantes?: (value: boolean) => void
}

// Componente memoizado para notas individuais para melhorar performance
const NotaItem = memo(({ nota }: { nota: NotaFiscal }) => {
  const timestamp = useMemo(() => {
    return new Date(nota.timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }, [nota.timestamp])

  const statusIcon = nota.status === "ok" ? (
    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
  ) : (
    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
  )

  const statusText = nota.status === "ok" ? "Nota processada com sucesso" : "Nota com divergência"

  return (
    <div
      className={`p-3 border-l-4 rounded-lg coletor-nota-item ${nota.status === "ok"
          ? "coletor-nota-ok"
          : "coletor-nota-divergencia"
        }`}
      role="listitem"
      aria-label={`Nota fiscal ${nota.numeroNF}, status: ${statusText}`}
    >
      <div className="flex items-start space-x-2">
        <div aria-hidden="true">
          {statusIcon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Cabeçalho da nota */}
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold text-gray-900 text-sm">
              <span className="sr-only">Número da nota fiscal: </span>
              NF: {nota.numeroNF}
            </div>
            <div className="flex space-x-1" role="group" aria-label="Informações da nota">
              <Badge variant="outline" className="text-xs bg-white coletor-badge">
                <span className="sr-only">Volumes: </span>
                Vol: {nota.divergencia?.volumesInformados || nota.volumes}
              </Badge>
              <Badge variant="outline" className="text-xs bg-white coletor-badge">
                <span className="sr-only">Destino: </span>
                {nota.destino}
              </Badge>
            </div>
          </div>

          {/* Detalhes da nota */}
          <div className="text-xs text-gray-600 space-y-1">
            <div className="truncate">
              <strong>Fornecedor:</strong> <span aria-label={`Fornecedor: ${nota.fornecedor}`}>{nota.fornecedor}</span>
            </div>
            <div className="truncate">
              <strong>Cliente:</strong> <span aria-label={`Cliente: ${nota.clienteDestino}`}>{nota.clienteDestino}</span>
            </div>
            <div className="truncate">
              <strong>Tipo:</strong> {nota.tipoCarga} | <strong>Data:</strong> {nota.data}
            </div>

            {/* Divergência */}
            {nota.divergencia && (
              <div className="text-orange-600 font-medium text-xs" role="alert" aria-live="polite">
                <span className="sr-only">Divergência detectada: </span>
                🔸 {nota.divergencia.observacoes}
                {nota.divergencia.volumesInformados !== nota.volumes && (
                  <span aria-label={`Volumes alterados de ${nota.volumes} para ${nota.divergencia.volumesInformados}`}>
                    {" "}
                    ({nota.volumes} → {nota.divergencia.volumesInformados})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-400 mt-1" aria-label={`Processado às ${timestamp}`}>
            {timestamp}
          </div>
        </div>
      </div>
    </div>
  )
})

NotaItem.displayName = 'NotaItem'

export default function ColetorView({
  codigoInput,
  setCodigoInput,
  scannerAtivo,
  setScannerAtivo,
  scannerParaBipar,
  setScannerParaBipar,
  handleBipagem,
  handleKeyPress,
  handleCodigoEscaneado,
  notas,
  finalizarRelatorio,
  setModalRelatorios,
  inputRef,
  clearNotas,
  sessionData,
  handleLogout,
  transportadoraSelecionada,
  progressoTransportadora,
  bipagemIniciada,
  setModalSelecaoTransportadora,
  sessaoIniciada,
  iniciarBipagem,
  finalizando = false,
  setModalConsultarNfsFaltantes
}: ColetorViewProps) {
  // Memoizar cálculos para melhorar performance
  const totalVolumes = useMemo(() => {
    return notas.reduce((sum, nota) => sum + (nota.divergencia?.volumesInformados || nota.volumes), 0)
  }, [notas])

  const handleScannerToggle = useCallback(() => {
    if (scannerAtivo) {
      console.log('📷 Fechando scanner (coletor)')
      setScannerAtivo(false)
      setScannerParaBipar(false)
    } else {
      console.log('📷 Abrindo scanner para bipar (coletor)')
      setScannerAtivo(true)
      setScannerParaBipar(true)
    }
  }, [scannerAtivo, setScannerAtivo, setScannerParaBipar])

  const handleClearNotas = useCallback(async () => {
    if (notas.length === 0) {
      alert("Não há notas para limpar!")
      return
    }

    // Confirmação mais clara
    const confirmacao = confirm(
      `🗑️ LIMPAR BIPAGEM\n\n` +
      `Tem certeza que deseja limpar todas as ${notas.length} notas bipadas?\n\n` +
      `⚠️ ATENÇÃO: Esta ação não pode ser desfeita!\n` +
      `📝 As notas serão removidas da sessão atual.`
    )

    if (confirmacao) {
      try {
        console.log('🗑️ Iniciando limpeza das notas...')

        // Limpar notas usando a função do hook
        const chaveNotas = `recebimento_${Array.isArray(sessionData?.colaboradores) && sessionData?.colaboradores.length > 0
          ? sessionData?.colaboradores.join('_')
          : 'sem_colaborador'}_${sessionData?.data}_${sessionData?.turno}`

        console.log('🗑️ Chave das notas:', chaveNotas)
        await clearNotas(chaveNotas)

        console.log('✅ Notas limpas com sucesso!')
        // Mostrar mensagem de sucesso
        alert(`✅ SUCESSO!\n\n${notas.length} notas foram limpas com sucesso!`)
      } catch (error) {
        console.error('❌ Erro ao limpar notas:', error)
        alert('❌ Erro ao limpar as notas. Tente novamente.')
      }
    }
  }, [notas.length, sessionData, clearNotas])

  return (
    <div className="min-h-screen bg-gray-50 p-2 coletor-container" role="main" aria-label="Área de recebimento - Coletor">
      {/* Header compacto para coletor */}
      <header className="bg-white rounded-lg shadow-sm mb-3 p-3 coletor-header" role="banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-blue-600" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Recebimento</h1>
              <p className="text-sm text-gray-500">Coletor</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right" role="status" aria-live="polite">
              <div className="text-sm text-gray-500">
                <span className="sr-only">Total de notas: </span>
                Notas: {notas.length}
              </div>
              <div className="text-sm text-gray-500">
                <span className="sr-only">Total de volumes: </span>
                Volumes: {totalVolumes}
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="icon"
              className="h-8 px-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              aria-label="Sair do sistema"
            >
              <LogOut className="h-3 w-3 mr-1" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      {/* Card de Seleção de Transportadora - se não iniciada */}
      {!sessaoIniciada && (
        <Card className="mb-3 border-orange-200 coletor-card" role="region" aria-label="Seleção de transportadora">
          <CardHeader className="pb-2 coletor-card-header">
            <CardTitle className="text-base flex items-center space-x-2">
              <Truck className="h-4 w-4 text-orange-600" />
              <span>Selecionar Transportadora</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 coletor-card-content">
            <div className="text-center py-4">
              <div className="mb-3">
                <Truck className="h-12 w-12 mx-auto text-orange-300 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Para começar a bipar notas, você precisa primeiro selecionar uma transportadora.
                </p>
              </div>
              <Button
                onClick={() => setModalSelecaoTransportadora?.(true)}
                className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white coletor-button"
                aria-label="Abrir modal de seleção de transportadora"
              >
                <Truck className="h-4 w-4 mr-2" />
                Selecionar Transportadora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card de Progresso da Transportadora - se disponível */}
      {transportadoraSelecionada && progressoTransportadora && (
        <Card className="mb-3 border-purple-200 coletor-card" role="region" aria-label="Progresso da transportadora">
          <CardHeader className="pb-2 coletor-card-header">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span>Progresso - {transportadoraSelecionada}</span>
              </CardTitle>
              {!bipagemIniciada && setModalSelecaoTransportadora && (
                <Button
                  onClick={() => setModalSelecaoTransportadora(true)}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 h-8 px-2"
                  title="Trocar transportadora selecionada"
                >
                  <Truck className="h-3 w-3 mr-1" />
                  Trocar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 coletor-card-content">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Notas Bipadas</span>
                <span className="text-sm font-bold">
                  {progressoTransportadora.bipadas} de {progressoTransportadora.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressoTransportadora.percentual}%` }}
                />
              </div>
              <div className="text-center">
                <Badge
                  variant={progressoTransportadora.percentual === 100 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {progressoTransportadora.percentual}% Concluído
                </Badge>
              </div>

              {/* Botão Iniciar Bipagem - se não iniciada */}
              {!bipagemIniciada && iniciarBipagem && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    onClick={iniciarBipagem}
                    className="w-full h-10 bg-green-600 hover:bg-green-700 text-white coletor-button"
                    aria-label="Iniciar bipagem das notas"
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Iniciar Bipagem
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Área de entrada - otimizada para coletor - só aparece após iniciar bipagem */}
      {bipagemIniciada && (
        <Card className="mb-3 border-blue-200 coletor-card" role="region" aria-label="Scanner de código">
          <CardHeader className="pb-2 coletor-card-header">
            <CardTitle className="text-base">Scanner de Código</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 coletor-card-content">
            {scannerAtivo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium" id="scanner-status">📷 Scanner Ativo</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScannerToggle}
                    className="text-red-600 hover:text-red-700 h-8 px-2"
                    aria-label="Fechar scanner de código"
                  >
                    <X className="h-3 w-3 mr-2" aria-hidden="true" />
                    Fechar
                  </Button>
                </div>
                <BarcodeScanner
                  onScan={handleCodigoEscaneado}
                  onError={(error) => {
                    console.error("Erro no scanner:", error)
                    alert("Erro ao acessar a câmera. Verifique as permissões.")
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Campo de entrada otimizado para coletor */}
                <div className="space-y-2">
                  <Label htmlFor="codigo-input" className="sr-only">Código da nota fiscal</Label>
                  <Input
                    id="codigo-input"
                    ref={inputRef}
                    placeholder="Digite ou escaneie o código..."
                    value={codigoInput}
                    onChange={(e) => setCodigoInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-base h-12 font-mono text-center coletor-input"
                    aria-describedby="codigo-format"
                    aria-label="Campo para digitar ou escanear código da nota fiscal"
                  />
                  <p id="codigo-format" className="text-xs text-gray-500 text-center">
                    Formato: data|nf|volumes|destino|fornecedor|cliente|tipo
                  </p>
                </div>

                {/* Botões otimizados para coletor */}
                <div className="grid grid-cols-2 gap-2 coletor-button-grid" role="group" aria-label="Controles do scanner">
                  <Button
                    onClick={handleScannerToggle}
                    className="h-12 bg-blue-600 hover:bg-blue-700 coletor-button"
                    aria-label="Ativar scanner de código de barras"
                  >
                    <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
                    Scanner
                  </Button>
                  <Button
                    onClick={handleBipagem}
                    disabled={!codigoInput.trim()}
                    className="h-12 bg-green-600 hover:bg-green-700 coletor-button"
                    aria-label={`Processar código: ${codigoInput || 'campo vazio'}`}
                    aria-describedby={!codigoInput.trim() ? "bipar-disabled" : undefined}
                  >
                    <Scan className="h-4 w-4 mr-2" aria-hidden="true" />
                    Bipar
                  </Button>
                  {!codigoInput.trim() && (
                    <div id="bipar-disabled" className="sr-only">
                      Botão desabilitado. Digite um código primeiro.
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botões de ação - otimizados para coletor - só aparecem após iniciar bipagem */}
      {bipagemIniciada && (
        <>
          {/* Primeira linha - Botões principais */}
          <div className="grid grid-cols-2 gap-3 mb-1 coletor-button-grid" role="group" aria-label="Ações principais">
            <Button
              onClick={finalizarRelatorio}
              disabled={notas.length === 0 || finalizando}
              className={`h-12 text-white coletor-button ${progressoTransportadora?.percentual === 100
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-600 hover:bg-orange-700'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              aria-label={`Finalizar relatório com ${notas.length} notas`}
              aria-describedby={notas.length === 0 ? "finalizar-disabled" : undefined}
            >
              {finalizando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" aria-hidden="true"></div>
                  Finalizando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                  {progressoTransportadora?.percentual === 100
                    ? `Liberar Relatório (${notas.length})`
                    : `Liberar Parcial (${notas.length})`
                  }
                </>
              )}
            </Button>
            {notas.length === 0 && (
              <div id="finalizar-disabled" className="sr-only">
                Botão desabilitado. Não há notas para finalizar.
              </div>
            )}

            <Button
              onClick={handleClearNotas}
              className="h-12 bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300 coletor-button"
              aria-label={`Limpar ${notas.length} notas bipadas`}
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Limpar ({notas.length})
            </Button>

            <Button
              onClick={() => setModalRelatorios(true)}
              className="h-12 bg-blue-100 hover:bg-blue-200 text-blue-600 coletor-button"
              aria-label="Abrir modal de relatórios"
            >
              <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
              Relatórios
            </Button>




            {/* Segunda linha - Botão Consultar NFs Faltantes */}
            <div className="mb-3">
              <Button
                onClick={() => setModalConsultarNfsFaltantes?.(true)}
                className="w-full h-12 bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200 hover:border-orange-300 coletor-button"
                aria-label="Consultar notas fiscais faltantes da transportadora"
              >
                <Search className="h-4 w-4 mr-2" aria-hidden="true" />
                NFs Faltantes
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Lista de notas - otimizada para coletor */}
      <Card className="border-blue-200 coletor-card" role="region" aria-label="Lista de notas processadas">
        <CardHeader className="pb-2 coletor-card-header">
          <CardTitle className="text-base">Notas Bipadas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 coletor-card-content">
          {notas.length === 0 ? (
            <div className="text-center py-6 text-gray-500" role="status" aria-live="polite">
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" aria-hidden="true" />
              <p className="text-sm">Nenhuma nota bipada ainda.</p>
              <p className="text-xs">Use o campo acima para começar.</p>
            </div>
          ) : (
            <div className="space-y-2" role="list" aria-label={`Lista de ${notas.length} notas processadas`}>
              {notas.map((nota) => (
                <NotaItem key={nota.id} nota={nota} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
