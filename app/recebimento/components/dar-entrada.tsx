"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CalendarIcon,
  Package,
  ArrowLeft,
  LogOut,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Save,
  BarChart3,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { SaveNotesService } from "@/lib/save-notes-service"

interface Usuario {
  nome: string
  loginTime: string
}

interface NotaFiscal {
  id: string
  data: string
  nota: string
  volume: number
  destino: string
  fornecedor: string
  clienteDestino: string
  tipo: string
  transportadora: string
  usuario: string
  dataEntrada: string
  codigoCompleto: string
}

interface NotaValidacao {
  codigo: string
  status: "valida" | "duplicada" | "invalida"
  erro?: string
  nota?: NotaFiscal
}

interface DarEntradaProps {
  usuario: Usuario
  onVoltar: () => void
  onVerConsolidado: () => void
  onLogout: () => void
}

const REGEX_NOTA =
  /^(\d{2}\/\d{2}\/\d{4})\|(\d{6,12})\|(\d{1,5})\|([A-Za-z0-9\-_/]{2,})\|([^|]{1,50})\|([A-Za-z0-9\-_/ ]{2,})\|([A-Za-z]{2,4})$/

export default function DarEntrada({ usuario, onVoltar, onVerConsolidado, onLogout }: DarEntradaProps) {
  const [transportadora, setTransportadora] = useState("")
  const [dataEntrada, setDataEntrada] = useState<Date>(new Date())
  const [codigosTexto, setCodigosTexto] = useState("")
  const [notasValidacao, setNotasValidacao] = useState<NotaValidacao[]>([])
  const [processando, setProcessando] = useState(false)

  const validarCodigos = () => {
    if (!codigosTexto.trim()) {
      setNotasValidacao([])
      return
    }

    const linhas = codigosTexto
      .split("\n")
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0)

    const validacoes: NotaValidacao[] = []
    const notasExistentes = carregarNotasExistentes()
    const notasNaRemessa = new Set<string>()

    linhas.forEach((codigo) => {
      const match = codigo.match(REGEX_NOTA)

      if (!match) {
        validacoes.push({
          codigo,
          status: "invalida",
          erro: "Formato inválido. Use: DD/MM/AAAA|nota|volume|destino|fornecedor|cliente_destino|tipo",
        })
        return
      }

      const [, data, nota, volume, destino, fornecedor, cliente_destino, tipo] = match

      // Debug: verificar dados extraídos
      console.log('🔍 Dados extraídos do regex:', {
        data,
        nota,
        volume,
        destino,
        fornecedor,
        cliente_destino,
        tipo
      })

      // Validar data
      const partesData = data.split("/")
      const dataObj = new Date(
        Number.parseInt(partesData[2]),
        Number.parseInt(partesData[1]) - 1,
        Number.parseInt(partesData[0]),
      )
      if (isNaN(dataObj.getTime())) {
        validacoes.push({
          codigo,
          status: "invalida",
          erro: "Data inválida",
        })
        return
      }

      // Verificar duplicata na remessa atual
      if (notasNaRemessa.has(nota)) {
        validacoes.push({
          codigo,
          status: "duplicada",
          erro: "Nota duplicada nesta remessa",
        })
        return
      }

      // Verificar duplicata no banco
      const notaExistente = notasExistentes.find((n) => n.nota === nota)
      if (notaExistente) {
        validacoes.push({
          codigo,
          status: "duplicada",
          erro: `Nota já existe - ${notaExistente.transportadora} em ${new Date(notaExistente.dataEntrada).toLocaleDateString("pt-BR")}`,
        })
        return
      }

      notasNaRemessa.add(nota)

      const notaFiscal: NotaFiscal = {
        id: `${nota}_${Date.now()}`,
        data,
        nota,
        volume: Number.parseInt(volume),
        destino: destino.toUpperCase(),
        fornecedor: fornecedor.trim(),
        clienteDestino: cliente_destino.toUpperCase(),
        tipo: tipo.toUpperCase(),
        transportadora: transportadora.trim() || 'N/A', // Fallback para transportadora vazia
        usuario: usuario.nome || 'N/A', // Fallback para usuário vazio
        dataEntrada: new Date().toISOString(),
        codigoCompleto: codigo,
      }

      validacoes.push({
        codigo,
        status: "valida",
        nota: notaFiscal,
      })
    })

    setNotasValidacao(validacoes)
  }

  const carregarNotasExistentes = (): NotaFiscal[] => {
    const notasSalvas = localStorage.getItem("sistema_notas_consolidado")
    return notasSalvas ? JSON.parse(notasSalvas) : []
  }

  const consolidar = async () => {
    if (!transportadora.trim()) {
      alert("Por favor, informe o nome da transportadora.")
      return
    }

    const notasValidas = notasValidacao.filter((v) => v.status === "valida" && v.nota)

    if (notasValidas.length === 0) {
      alert("Não há notas válidas para consolidar.")
      return
    }

    setProcessando(true)

    try {
      // Simular processamento
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const notasExistentes = carregarNotasExistentes()
      const novasNotas = notasValidas.map((v) => v.nota!).filter(Boolean)

      const todasNotas = [...notasExistentes, ...novasNotas]
      localStorage.setItem("sistema_notas_consolidado", JSON.stringify(todasNotas))

      // Debug: verificar dados antes de salvar
      console.log('🔍 Dados das novas notas antes de salvar:', novasNotas)
      console.log('🔍 Total de notas no localStorage:', todasNotas.length)

      // Salvar no banco de dados automaticamente
      try {
        console.log('💾 Salvando notas no banco de dados...')
        const saveResult = await SaveNotesService.saveNotesFromLocalStorage()
        
        if (saveResult.success) {
          console.log(`✅ ${saveResult.savedNotes} notas salvas no banco com sucesso!`)
        } else {
          console.warn('⚠️ Erro ao salvar no banco:', saveResult.message)
          console.warn('📝 Notas salvas apenas no localStorage')
          if (saveResult.errors && saveResult.errors.length > 0) {
            console.warn('❌ Detalhes dos erros:', saveResult.errors)
          }
        }
      } catch (error) {
        console.error('❌ Erro ao salvar no banco:', error)
        console.log('📝 Notas salvas apenas no localStorage')
      }

      // Log da ação
      const log = {
        id: Date.now().toString(),
        usuario: usuario.nome,
        transportadora: transportadora.trim(),
        dataEntrada: new Date().toISOString(),
        totalCodigos: notasValidacao.length,
        validas: notasValidas.length,
        duplicadas: notasValidacao.filter((v) => v.status === "duplicada").length,
        invalidas: notasValidacao.filter((v) => v.status === "invalida").length,
      }

      const logsExistentes = JSON.parse(localStorage.getItem("sistema_logs_consolidado") || "[]")
      logsExistentes.unshift(log)
      localStorage.setItem("sistema_logs_consolidado", JSON.stringify(logsExistentes))

      alert(
        `Consolidação realizada com sucesso!\n\n` +
        `✅ ${notasValidas.length} notas válidas inseridas\n` +
        `⚠️ ${notasValidacao.filter((v) => v.status === "duplicada").length} duplicadas\n` +
        `❌ ${notasValidacao.filter((v) => v.status === "invalida").length} inválidas`,
      )

      // Limpar formulário mantendo data e usuário
      setCodigosTexto("")
      setTransportadora("")
      setNotasValidacao([])
    } catch (error) {
      alert("Erro ao consolidar dados. Tente novamente.")
    } finally {
      setProcessando(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (codigosTexto.trim()) {
        validarCodigos()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [codigosTexto, transportadora])

  const notasValidas = notasValidacao.filter((v) => v.status === "valida")
  const notasDuplicadas = notasValidacao.filter((v) => v.status === "duplicada")
  const notasInvalidas = notasValidacao.filter((v) => v.status === "invalida")

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Package className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Consolidado - Entrada</h1>
                <p className="text-sm text-gray-500">Inserir códigos de notas fiscais</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{usuario.nome}</div>
                <div className="text-xs text-gray-500">{new Date(usuario.loginTime).toLocaleString("pt-BR")}</div>
              </div>
    
              <Button 
                onClick={onVerConsolidado}
                variant="outline"
                size="sm"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Consolidado
              </Button>

              <Button variant="outline" size="sm" onClick={onVoltar} className="bg-transparent hover:bg-green-50 border-green-200">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              <Button variant="outline" size="sm" onClick={onLogout} className="bg-transparent hover:bg-green-50 border-green-200">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-lg">Dados da Remessa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-medium">Transportadora *</Label>
                <Input
                  placeholder="Nome da transportadora"
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
                  className="text-base h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Data de Entrada *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-12 text-base bg-transparent"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dataEntrada, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dataEntrada} onSelect={(date) => date && setDataEntrada(date)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Códigos das Notas (um por linha) *</Label>
                <Textarea
                  placeholder={`Cole os códigos aqui, um por linha:\n\n01/12/2024|000068310|0014|RJ08|EMS S/A|SAO JO|ROD\n02/12/2024|000068311|0025|SP01|CORREIOS|RIO DE|CON`}
                  value={codigosTexto}
                  onChange={(e) => setCodigosTexto(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Formato: DD/MM/AAAA|nota|volume|destino|fornecedor|cliente_destino|tipo
                </p>
              </div>

              <Button
                onClick={consolidar}
                disabled={notasValidas.length === 0 || !transportadora.trim() || processando}
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
              >
                {processando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Consolidando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Consolidar ({notasValidas.length} válidas)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Prévia */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-lg">Prévia da Validação</CardTitle>
            </CardHeader>
            <CardContent>
              {notasValidacao.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Cole os códigos no campo ao lado para ver a prévia</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Estatísticas */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{notasValidas.length}</div>
                      <div className="text-sm text-gray-600">Válidas</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{notasDuplicadas.length}</div>
                      <div className="text-sm text-gray-600">Duplicadas</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{notasInvalidas.length}</div>
                      <div className="text-sm text-gray-600">Inválidas</div>
                    </div>
                  </div>

                  {/* Lista de validações */}
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {notasValidacao.map((validacao, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border-l-4 ${validacao.status === "valida"
                              ? "border-l-green-500 bg-green-50"
                              : validacao.status === "duplicada"
                                ? "border-l-yellow-500 bg-yellow-50"
                                : "border-l-red-500 bg-red-50"
                            }`}
                        >
                          <div className="flex items-start space-x-2">
                            {validacao.status === "valida" ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                            ) : validacao.status === "duplicada" ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              {validacao.status === "valida" && validacao.nota ? (
                                <div>
                                  <div className="font-medium text-sm">
                                    NF: {validacao.nota.nota} | Vol: {validacao.nota.volume} | {validacao.nota.destino}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {validacao.nota.fornecedor} → {validacao.nota.clienteDestino} ({validacao.nota.tipo}
                                    )
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-mono text-xs text-gray-600 break-all">
                                    {validacao.codigo.length > 50
                                      ? `${validacao.codigo.substring(0, 50)}...`
                                      : validacao.codigo}
                                  </div>
                                  <div className="text-xs text-red-600 mt-1">{validacao.erro}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
