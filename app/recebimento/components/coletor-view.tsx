"use client"

import type React from "react"
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
}

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
  handleLogout
}: ColetorViewProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-2 coletor-container">
      {/* Header compacto para coletor */}
      <div className="bg-white rounded-lg shadow-sm mb-3 p-3 coletor-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Recebimento</h1>
              <p className="text-sm text-gray-500">Coletor</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Notas: {notas.length}</div>
              <div className="text-sm text-gray-500">
                Volumes: {notas.reduce((sum, nota) => sum + (nota.divergencia?.volumesInformados || nota.volumes), 0)}
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="icon"
              className="h-8 px-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <LogOut className="h-3 w-3 mr-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Área de entrada - otimizada para coletor */}
      <Card className="mb-3 border-blue-200 coletor-card">
        <CardHeader className="pb-2 coletor-card-header">
          <CardTitle className="text-base">Scanner de Código</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 coletor-card-content">
          {scannerAtivo ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">📷 Scanner Ativo</h3>
                                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => {
                     console.log('📷 Fechando scanner (coletor)')
                     setScannerAtivo(false)
                     setScannerParaBipar(false)
                   }}
                   className="text-red-600 hover:text-red-700 h-8 px-2"
                 >
                   <X className="h-3 w-3 mr-2" />
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
                                  <Input
                    ref={inputRef}
                    placeholder="Digite ou escaneie o código..."
                    value={codigoInput}
                    onChange={(e) => setCodigoInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-base h-12 font-mono text-center coletor-input"
                  />
                <p className="text-xs text-gray-500 text-center">
                  Formato: data|nf|volumes|destino|fornecedor|cliente|tipo
                </p>
              </div>
              
                             {/* Botões otimizados para coletor */}
               <div className="grid grid-cols-2 gap-2 coletor-button-grid">
                 <Button 
                   onClick={() => {
                     console.log('📷 Abrindo scanner para bipar (coletor)')
                     setScannerAtivo(true)
                     setScannerParaBipar(true)
                   }} 
                   className="h-12 bg-blue-600 hover:bg-blue-700 coletor-button"
                 >
                   <Camera className="h-4 w-4 mr-2" />
                   Scanner
                 </Button>
                 <Button
                   onClick={handleBipagem}
                   disabled={!codigoInput.trim()}
                   className="h-12 bg-green-600 hover:bg-green-700 coletor-button"
                 >
                   <Scan className="h-4 w-4 mr-2" />
                   Bipar
                 </Button>
               </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botões de ação - otimizados para coletor */}
      <div className="grid grid-cols-3 gap-2 mb-3 coletor-button-grid">
        <Button
          onClick={finalizarRelatorio}
          disabled={notas.length === 0}
          className="h-12 bg-orange-600 hover:bg-orange-700 text-white coletor-button"
        >
          <FileText className="h-4 w-4 mr-2" />
          Finalizar ({notas.length})
        </Button>

        <Button
          onClick={() => setModalRelatorios(true)}
          className="h-12 bg-blue-100 hover:bg-blue-200 text-blue-600 coletor-button"
        >
          <Eye className="h-4 w-4 mr-2" />
          Relatórios
        </Button>

                 <Button
           onClick={async () => {
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
           }}
          className="h-12 bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300 coletor-button"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar ({notas.length})
        </Button>
      </div>

      {/* Lista de notas - otimizada para coletor */}
      <Card className="border-blue-200 coletor-card">
        <CardHeader className="pb-2 coletor-card-header">
          <CardTitle className="text-base">Notas Bipadas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 coletor-card-content">
          {notas.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhuma nota bipada ainda.</p>
              <p className="text-xs">Use o campo acima para começar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notas.map((nota) => (
                                  <div
                    key={nota.id}
                    className={`p-3 border-l-4 rounded-lg coletor-nota-item ${
                      nota.status === "ok" 
                        ? "coletor-nota-ok" 
                        : "coletor-nota-divergencia"
                    }`}
                  >
                  <div className="flex items-start space-x-2">
                    {nota.status === "ok" ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* Cabeçalho da nota */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          NF: {nota.numeroNF}
                        </div>
                                                 <div className="flex space-x-1">
                           <Badge variant="outline" className="text-xs bg-white coletor-badge">
                             Vol: {nota.divergencia?.volumesInformados || nota.volumes}
                           </Badge>
                           <Badge variant="outline" className="text-xs bg-white coletor-badge">
                             {nota.destino}
                           </Badge>
                         </div>
                      </div>
                      
                      {/* Detalhes da nota */}
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="truncate">
                          <strong>Fornecedor:</strong> {nota.fornecedor}
                        </div>
                        <div className="truncate">
                          <strong>Cliente:</strong> {nota.clienteDestino}
                        </div>
                        <div className="truncate">
                          <strong>Tipo:</strong> {nota.tipoCarga} | <strong>Data:</strong> {nota.data}
                        </div>
                        
                        {/* Divergência */}
                        {nota.divergencia && (
                          <div className="text-orange-600 font-medium text-xs">
                            🔸 {nota.divergencia.observacoes}
                            {nota.divergencia.volumesInformados !== nota.volumes && (
                              <span>
                                {" "}
                                ({nota.volumes} → {nota.divergencia.volumesInformados})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Timestamp */}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(nota.timestamp).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
