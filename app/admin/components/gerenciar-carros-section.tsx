"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useCarrosRealtime, CarroStatus } from "@/hooks/use-carros-realtime"
import { getSupabase } from "@/lib/supabase-client"
import FiltrosAvancados, { FiltrosAvancados as FiltrosAvancadosType } from "./filtros-avancados"
import {
  Truck,
  Calendar,
  MapPin,
  Eye,
  Trash2,
  Package,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Hash,
  Copy,
  Search,
  Filter,
  Send,
  Plus,
} from "lucide-react"

interface Carro {
  id: string
  nomeCarro: string
  colaboradores: string[]
  data: string
  turno: string
  destinoFinal: string
  quantidadeNFs: number
  totalVolumes: number
  dataCriacao: string
  dataFinalizacao?: string
  numerosSAP?: string[]
  statusCarro: "embalando" | "divergencia" | "aguardando_lancamento" | "pronto" | "em_producao" | "finalizado"
  nfs: Array<{
    id: string
    numeroNF: string
    volume: number
    fornecedor: string
    codigo: string
    codigoDestino: string
    destinoFinal: string
    tipo: string
    codigoCompleto: string
    timestamp: string
    status: "valida" | "invalida"
  }>
  estimativaPallets: number
  posicoes?: number
  tipoCarro?: "ROD" | "CON"
}

interface CarroLancamento {
  id: string
  nomeCarro?: string
  colaboradores: string[]
  data: string
  turno: string
  destinoFinal: string
  quantidadeNFs: number
  totalVolumes: number
  dataFinalizacao: string
  nfs: Array<{
    id: string
    numeroNF: string
    volume: number
    fornecedor: string
    codigo: string
    codigoDestino: string
    destinoFinal: string
    tipo: string
    codigoCompleto: string
    timestamp: string
  }>
  status: "aguardando_lancamento" | "em_lancamento" | "lancado" | "erro_lancamento"
  estimativaPallets: number
  palletesReais?: number
  posicoes?: number
  numerosSAP?: string[]
  observacoes?: string
  dataLancamento?: string
  numeroLancamento?: string
  responsavelLancamento?: string
  tipoCarro?: "ROD" | "CON"
}

// Função para determinar o tipo do carro baseado nas NFs
const determinarTipoCarro = (nfs: Array<{ tipo: string }>): "ROD" | "CON" => {
  // Verificar se há pelo menos uma NF com tipo "ROD"
  const temROD = nfs.some(nf => nf.tipo?.toUpperCase().includes('ROD'));
  // Verificar se há pelo menos uma NF com tipo "CON" ou "CONTROLADO"
  const temCON = nfs.some(nf =>
    nf.tipo?.toUpperCase().includes('CON') ||
    nf.tipo?.toUpperCase().includes('CONTROLADO')
  );

  // Priorizar ROD se existir, senão CON
  if (temROD) return "ROD";
  if (temCON) return "CON";

  // Padrão: ROD (assumindo que a maioria é rodoviária)
  return "ROD";
};

export default function GerenciarCarrosSection() {
  const { toast } = useToast()

  const {
    carros,
    loading,
    error,
    lastUpdate,
    isConnected,
    salvarCarro,
    atualizarStatusCarro,
    excluirCarro,
    excluirNotaCarro,
    lancarCarro,
    estatisticas: estatisticasRealtime,
    recarregar
  } = useCarrosRealtime()
  const [carrosLancamento, setCarrosLancamento] = useState<CarroLancamento[]>([])
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [filtroBusca, setFiltroBusca] = useState("")


  // Filtros avançados
  const [filtrosAvancados, setFiltrosAvancados] = useState<FiltrosAvancadosType>({
    filtroData: "hoje",
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    setores: [],
    incluirSetores: false,
    statuses: [],
    incluirStatus: false,
    colaboradores: [],
    incluirColaboradores: false,
    destinos: [],
    incluirDestinos: false,
    tiposCarro: [],
    incluirTiposCarro: false,
    salvarPreferencias: true,
    mostrarFiltros: false
  })
  const [carroSelecionado, setCarroSelecionado] = useState<CarroStatus | null>(null)
  const [carroLancamentoSelecionado, setCarroLancamentoSelecionado] = useState<CarroLancamento | null>(null)
  const [modalDetalhes, setModalDetalhes] = useState(false)
  const [carroParaExcluir, setCarroParaExcluir] = useState<CarroStatus | null>(null)
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false)



  // Estados para lançamento
  const [modalLancamento, setModalLancamento] = useState(false)
  const [observacoes, setObservacoes] = useState("")
  const [numeroLancamento, setNumeroLancamento] = useState("")
  const [processandoLancamento, setProcessandoLancamento] = useState(false)

  // Estados para números SAP
  const [modalSAP, setModalSAP] = useState(false)
  const [numerosSAP, setNumerosSAP] = useState<string[]>([])
  const [novoNumeroSAP, setNovoNumeroSAP] = useState("")
  const [carroParaSAP, setCarroParaSAP] = useState<CarroStatus | null>(null)

  useEffect(() => {
    carregarCarrosLancamento()

    // Sincronização automática a cada 45 segundos para melhor performance
    const interval = setInterval(() => {
      carregarCarrosLancamento()
      // Recarregar carros em tempo real se necessário
      if (recarregar) {
        recarregar()
      }
    }, 45000)

    return () => clearInterval(interval)
  }, [recarregar])

  const carregarCarrosLancamento = () => {
    const chaveCarrosLancamento = "profarma_carros_lancamento"
    const carrosSalvos = localStorage.getItem(chaveCarrosLancamento)

    if (carrosSalvos) {
      const carrosArray = JSON.parse(carrosSalvos)
      setCarrosLancamento(carrosArray)
    }
  }

  const handleExcluirCarro = async (carro: CarroStatus) => {
    try {
      console.log('🗑️ [COMPONENTE] Iniciando exclusão do carro:', carro)
      console.log('🆔 [COMPONENTE] ID do carro:', carro.carro_id)
      console.log('📋 [COMPONENTE] Dados completos do carro:', JSON.stringify(carro, null, 2))

      if (!carro.carro_id) {
        console.error('❌ [COMPONENTE] ID do carro não encontrado')
        toast({
          title: "Erro",
          description: "ID do carro não encontrado",
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      console.log(`🔄 [COMPONENTE] Chamando excluirCarro(${carro.carro_id})`)
      const result = await excluirCarro(carro.carro_id)
      console.log('📊 [COMPONENTE] Resultado da exclusão:', result)

      if (result.success) {
        console.log('✅ [COMPONENTE] Carro excluído com sucesso')
        toast({
          title: "Carro Excluído",
          description: "Carro excluído com sucesso!",
          duration: 3000,
        })
        setCarroParaExcluir(null)
        setModalExclusaoAberto(false)
      } else {
        console.error('❌ [COMPONENTE] Falha ao excluir carro:', result.error)
        toast({
          title: "Erro",
          description: result.error || "Erro ao excluir carro",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error('❌ [COMPONENTE] Erro inesperado ao excluir carro:', error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir carro",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const iniciarLancamento = (carro: CarroLancamento) => {
    setCarroLancamentoSelecionado(carro)
    setObservacoes(carro.observacoes || "")
    setNumeroLancamento(carro.numeroLancamento || "")
    setModalLancamento(true)
  }

  const processarLancamento = async () => {
    if (!carroLancamentoSelecionado || !numeroLancamento.trim()) {
      toast({
        title: "Erro",
        description: "Número do lançamento é obrigatório!",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setProcessandoLancamento(true)

    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Atualizar status do carro
    const carroAtualizado: CarroLancamento = {
      ...carroLancamentoSelecionado,
      status: "lancado",
      observacoes: observacoes.trim(),
      numeroLancamento: numeroLancamento.trim(),
      dataLancamento: new Date().toISOString(),
      responsavelLancamento: "Administrador",
    }

    // Salvar no localStorage
    const chaveCarrosLancamento = "profarma_carros_lancamento"
    const carrosExistentes = localStorage.getItem(chaveCarrosLancamento)
    const carrosArray = carrosExistentes ? JSON.parse(carrosExistentes) : []

    const carroIndex = carrosArray.findIndex((c: CarroLancamento) => c.id === carroLancamentoSelecionado.id)
    if (carroIndex !== -1) {
      carrosArray[carroIndex] = carroAtualizado
      localStorage.setItem(chaveCarrosLancamento, JSON.stringify(carrosArray))
      setCarrosLancamento(carrosArray)
    }

    setProcessandoLancamento(false)
    setModalLancamento(false)
    setCarroLancamentoSelecionado(null)
    setObservacoes("")
    setNumeroLancamento("")

    toast({
      title: "Lançamento Realizado!",
      description: `Lançamento realizado com sucesso! Número: ${numeroLancamento.trim()}`,
      duration: 3000,
    })
  }

  const alterarStatusCarro = (carroId: string, novoStatus: CarroLancamento["status"]) => {
    const chaveCarrosLancamento = "profarma_carros_lancamento"
    const carrosExistentes = localStorage.getItem(chaveCarrosLancamento)
    const carrosArray = carrosExistentes ? JSON.parse(carrosExistentes) : []

    const carroIndex = carrosArray.findIndex((c: CarroLancamento) => c.id === carroId)
    if (carroIndex !== -1) {
      carrosArray[carroIndex].status = novoStatus
      localStorage.setItem(chaveCarrosLancamento, JSON.stringify(carrosArray))
      setCarrosLancamento(carrosArray)
    }
  }

  const getStatusIcon = (status: Carro["statusCarro"] | CarroLancamento["status"]) => {
    switch (status) {
      case "embalando":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case "divergencia":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "aguardando_lancamento":
        return <Clock className="h-4 w-4 text-orange-600" />
      case "finalizado":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "lancado":
        return <Send className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "embalando":
        return "bg-orange-100 text-orange-800"
      case "divergencia":
        return "bg-red-100 text-red-800"
      case "aguardando_lancamento":
        return "bg-orange-100 text-orange-800"
      case "finalizado":
        return "bg-green-100 text-green-800"
      case "lancado":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "embalando":
        return "Embalando"
      case "divergencia":
        return "Divergência"
      case "aguardando_lancamento":
        return "Aguardando Lançamento"
      case "finalizado":
        return "Finalizado"
      case "lancado":
        return "Lançado"
      default:
        return status
    }
  }

  const getTurnoLabel = (turno: string) => {
    switch (turno) {
      case "A":
        return "Manhã"
      case "B":
        return "Tarde"
      case "C":
        return "Noite"
      default:
        return turno
    }
  }

  const copiarNFsParaSAP = (nfs: Array<{ numeroNF: string }>) => {
    // Manter o formato original das NFs com zeros à esquerda
    const nfsTexto = nfs.map((nf) => nf.numeroNF.toString()).join("\n")

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(nfsTexto)
        .then(() => {
          toast({
            title: "NFs Copiadas!",
            description: `${nfs.length} NFs copiadas para a área de transferência. Formato: com zeros à esquerda. Pronto para colar no SAP.`,
            duration: 3000,
          })
        })
        .catch(() => {
          const textArea = document.createElement("textarea")
          textArea.value = nfsTexto
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand("copy")
          document.body.removeChild(textArea)
          toast({
            title: "NFs Copiadas!",
            description: `${nfs.length} NFs copiadas para a área de transferência. Formato: com zeros à esquerda. Pronto para colar no SAP.`,
            duration: 3000,
          })
        })
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = nfsTexto
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      toast({
        title: "NFs Copiadas!",
        description: `${nfs.length} NFs copiadas para a área de transferência. Formato: com zeros à esquerda. Pronto para colar no SAP.`,
        duration: 3000,
      })
    }
  }

  const copiarVolumesParaSAP = (nfs: Array<{ volume: number }>) => {
    const volumesTexto = nfs.map((nf) => nf.volume.toString()).join("\n")

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(volumesTexto)
        .then(() => {
          toast({
            title: "Volumes Copiados!",
            description: `${nfs.length} volumes copiados para a área de transferência. Pronto para colar no SAP.`,
            duration: 3000,
          })
        })
        .catch(() => {
          const textArea = document.createElement("textarea")
          textArea.value = volumesTexto
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand("copy")
          document.body.removeChild(textArea)
          toast({
            title: "Volumes Copiados!",
            description: `${nfs.length} volumes copiados para a área de transferência. Pronto para colar no SAP.`,
            duration: 3000,
          })
        })
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = volumesTexto
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      toast({
        title: "Volumes Copiados!",
        description: `${nfs.length} volumes copiados para a área de transferência. Pronto para colar no SAP.`,
        duration: 3000,
      })
    }
  }

  // Função para imprimir carro em andamento
  const imprimirCarro = (carro: CarroStatus) => {
    const conteudoImpressao = criarConteudoImpressao(carro)
    imprimirConteudo(conteudoImpressao)
  }

  // Função para imprimir carro de lançamento
  const imprimirCarroLancamento = (carro: CarroLancamento) => {
    const conteudoImpressao = criarConteudoImpressaoLancamento(carro)
    imprimirConteudo(conteudoImpressao)
  }

  // Função para criar conteúdo de impressão para carro em andamento
  const criarConteudoImpressao = (carro: CarroStatus) => {
    const tipoCarro = determinarTipoCarro(carro.nfs)
    const tipoCarroLabel = tipoCarro === "ROD" ? "RODOVIÁRIO" : "CONTROLADO"

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${carro.nome_carro}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media print {
            body { margin: 0; margin-bottom: 120px; }
            .no-print { display: none; }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            margin-bottom: 120px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin-bottom: 20px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .info-value {
            border: 1px solid #ccc;
            padding: 8px;
            background-color: #f9f9f9;
            min-height: 20px;
            font-size: 15px;
          }
          .nf-count {
            grid-column: 3 / 4;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            background-color: #e3f2fd;
            border: 2px solid #2196f3;
            padding: 15px;
            border-radius: 2px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .table th {
            background-color:rgb(0, 255, 238);
            color: black;
            padding: 10px;
            text-align: left;
            font-weight: bold
          }
          .table td {
            border: 1px solid #ddd;
            padding: 4px;
            text-align: left;
            margin-bottom: 10px;
          }
          .table tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
          .print-button:hover {
            background-color: #0056b3;
          }
          .rodape {
            bottom: 0;
            left: 0;
            background: white;
            width: 100%;
            box-sizing: border-box;
            margin-top: 20px;

          }
          
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>
        <div class="header">
          ESPELHO DE PRODUÇÃO CARGAS CRDK ES
        </div>
        
        <div class="info-section">
          <div class="info-item">
            <div class="info-label">EMBALADO POR:</div>
            <div class="info-value">${carro.colaboradores.join(" + ")}</div>
          </div>
          <div class="info-item">
            <div class="info-label">DESTINO:</div>
            <div class="info-value">${carro.destino_final}</div>
          </div>
          <div class="info-item">
            <div class="info-label">TIPO DE CARGA:</div>
            <div class="info-value">${tipoCarroLabel}</div>
          </div>
          <div class="info-item">
            <div class="info-label">CONFERIDO POR:</div>
            <div class="info-value"> </div>
          </div>
          <div class="info-item">
            <div class="info-label">VOLUMES:</div>
            <div class="info-value">${carro.total_volumes} </div>
          </div>
          <div class="nf-count">
            ${carro.quantidade_nfs} NFs
          </div>
        </div>
        
        <table class="table">
          <thead>
            <tr>
              <th>NOTA FISCAL</th>
              <th>FORNECEDOR</th>
              <th>VOLUMES</th>
            </tr>
          </thead>
          <tbody >
            ${carro.nfs.map(nf => `
              <tr>
                <td>${nf.numeroNF}</td>
                <td>${nf.fornecedor}</td>
                <td> </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 5px; font-size: 10px; color: #666;">
          <p><strong>Data:</strong> ${carro.data} | <strong>Turno:</strong> ${carro.turno} - ${getTurnoLabel(carro.turno)} | <strong>Status:</strong> ${getStatusLabel(carro.status_carro)} </p> 
           </div>
          <div class="rodape">
           <p ><strong>QTDD PLT: </strong>     |    <strong>POSIÇÃO PLT:</strong> </p> 
        </div>
      </body>
      </html>
    `
  }

  // Função para criar conteúdo de impressão para carro de lançamento
  const criarConteudoImpressaoLancamento = (carro: CarroLancamento) => {
    const tipoCarro = determinarTipoCarro(carro.nfs)
    const tipoCarroLabel = tipoCarro === "ROD" ? "RODOVIÁRIO" : "CONTROLADO"

    return `
      <!DOCTYPE html>
      <html>
      <head>
      <title> ${carro.nomeCarro || 'Carro'} </title>
        <meta charset="UTF-8">
        <style>
          @media print {
            body { margin: 0; margin-bottom: 120px; }
            .no-print { display: none; }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            margin-bottom: 120px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin-bottom: 20px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-weight: bold;
            margin-bottom: 5px;
         
          }
          .info-value {
            border: 1px solid #ccc;
            padding: 8px;
            background-color: #f9f9f9;
            min-height: 20px;
            font-size: 15px;
          }
          .nf-count {
            grid-column: 2 / 4;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            background-color: #e3f2fd;
            border: 2px solid #2196f3;
            padding: 15px;
            border-radius: 5px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;

          }
          .table th {
            background-color:rgb(0, 255, 238);
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
          }
          .table td {
            border: 1px solid #ddd;
            padding: 5px;
            text-align: left;
            margin-bottom: 10px;
          }
          .table tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
          .print-button:hover {
            background-color: #0056b3;
          }

           .rodape {
            bottom: 0;
            left: 0;
            background: white;
            width: 100%;
            box-sizing: border-box;
            margin-top: 20px;

          }
           
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>
        
        <div class="header">
          ESPELHO DE PRODUÇÃO CARGAS CRDK ES
        </div>
        
        <div class="info-section">
          <div class="info-item">
            <div class="info-label">EMBALADO POR:</div>
            <div class="info-value">${carro.colaboradores.join(" + ")}</div>
          </div>
          <div class="info-item">
            <div class="info-label">DESTINO:</div>
            <div class="info-value">${carro.destinoFinal}</div>
          </div>
          <div class="info-item">
            <div class="info-label">TIPO DE CARGA:</div>
            <div class="info-value">${tipoCarroLabel}</div>
          </div>
          <div class="info-item">
            <div class="info-label">CONFERIDO POR:</div>
            <div class="info-value"> </div>
          </div>
          <div class="info-item">
            <div class="info-label">VOLUMES:</div>
            <div class="info-value">${carro.totalVolumes} </div>
          </div>
          <div class="nf-count">
            ${carro.quantidadeNFs} NFs
          </div>
        </div>
        
        <table class="table">
          <thead>
            <tr>
              <th>NOTA FISCAL</th>
              <th>FORNECEDOR</th>
              <th>VOLUMES</th>
            </tr>
          </thead>
          <tbody>
            ${carro.nfs.map(nf => `
              <tr>
                <td>${nf.numeroNF}</td>
                <td>${nf.fornecedor}</td>
                <td> </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 5px; font-size: 10px; color: #666;">
          <p><strong>Data:</strong> ${carro.data} | <strong>Turno:</strong> ${carro.turno} - ${getTurnoLabel(carro.turno)} |  <strong>Status:</strong> ${getStatusLabel(carro.status)}</p>
          </div>
          <div class="rodape">
          <p> <strong>QTDD PLT: </strong>     |  <strong>POSIÇÃO PLT: </strong>   </p>
        </div>
      </body>
      </html>
    `
  }

  // Função para imprimir o conteúdo
  const imprimirConteudo = (conteudo: string) => {
    const novaJanela = window.open('', '_blank', 'width=800,height=600')
    if (novaJanela) {
      novaJanela.document.write(conteudo)
      novaJanela.document.close()

      // Aguardar o carregamento e então imprimir
      novaJanela.onload = () => {
        setTimeout(() => {
          novaJanela.print()
        }, 500)
      }
    } else {
      toast({
        title: "Erro de Impressão",
        description: "Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativado.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const excluirNotaIndividual = async (carroId: string, notaId: string) => {
    try {
      console.log(`🗑️ [COMPONENTE] Excluindo nota ${notaId} do carro ${carroId}`)

      // Usar a função do hook para excluir a nota do banco de dados
      const result = await excluirNotaCarro(carroId, notaId)

      if (result.success) {
        console.log('✅ [COMPONENTE] Nota excluída com sucesso do banco')
        toast({
          title: "Nota Removida!",
          description: "Nota removida com sucesso!",
          duration: 3000,
        })
      } else {
        console.error('❌ [COMPONENTE] Erro ao excluir nota:', result.error)
        toast({
          title: "Erro",
          description: result.error || "Erro ao excluir nota",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error('❌ [COMPONENTE] Erro inesperado ao excluir nota:', error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir nota",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const alterarStatusCarroEmbalagem = async (carroId: string, novoStatus: CarroStatus["status_carro"], fromModal: boolean = false) => {
    // Buscar o carro atual
    const carro = carros.find(c => c.carro_id === carroId)
    if (!carro) return

    // REGRA DE NEGÓCIO: Lógica de finalização
    let statusParaSalvar = novoStatus

    if (novoStatus === "aguardando_lancamento" && !fromModal) {
      // Se o Admin está marcando como aguardando lançamento (não do modal), abrir modal para números SAP
      setCarroParaSAP(carro)
      setNumerosSAP([])
      setNovoNumeroSAP("")
      setModalSAP(true)
      return
    }

    const result = await atualizarStatusCarro(carroId, { status_carro: statusParaSalvar })
    if (result.success) {
      toast({
        title: "Status Atualizado",
        description: `Status do carro ${carro.nome_carro} atualizado para ${getStatusLabel(statusParaSalvar)}`,
        duration: 3000,
      })
    } else {
      toast({
        title: "Erro",
        description: result.error || "Erro ao atualizar status do carro",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Funções para gerenciar números SAP
  const adicionarNumeroSAP = () => {
    const numero = novoNumeroSAP.trim()

    if (!numero) {
      toast({
        title: "Erro",
        description: "Digite um número SAP!",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Validar se contém exatamente 6 dígitos
    if (!/^\d{6}$/.test(numero)) {
      toast({
        title: "Erro",
        description: "O número SAP deve conter exatamente 6 dígitos!",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Verificar se já existe
    if (numerosSAP.includes(numero)) {
      toast({
        title: "Erro",
        description: "Este número SAP já foi adicionado!",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setNumerosSAP([...numerosSAP, numero])
    setNovoNumeroSAP("")
  }

  const removerNumeroSAP = (index: number) => {
    setNumerosSAP(numerosSAP.filter((_, i) => i !== index))
  }


  const confirmarNumerosSAP = async () => {
    if (!carroParaSAP || numerosSAP.length === 0) {
      toast({
        title: "Erro",
        description: "É necessário adicionar pelo menos um número SAP!",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    try {
      console.log('🔄 Iniciando processo de lançamento do carro...')
      console.log('🆔 ID do carro:', carroParaSAP.carro_id)
      console.log('🔑 Números SAP:', numerosSAP)

      // 1. Lançar o carro (buscar número na tabela de finalizados e mudar status para "lancado")
      const result = await lancarCarro(carroParaSAP.carro_id, numerosSAP)

      console.log('📊 Resultado da atualização:', result)

      if (!result.success) {
        console.error('❌ Falha ao atualizar status do carro:', result.error)
        toast({
          title: "Erro",
          description: result.error || "Erro ao lançar carro",
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      console.log('✅ Status do carro atualizado com sucesso!')

      // 2. Salvar o carro na tabela embalagem_carros_finalizados
      const carroParaSalvar = {
        id: numerosSAP[0], // Usar o primeiro número SAP como ID
        numeros_sap: numerosSAP, // Array JSON com todos os números SAP
        nome_carro: carroParaSAP.nome_carro || 'Carro sem nome',
        colaboradores: carroParaSAP.colaboradores || [],
        data: carroParaSAP.data || new Date().toISOString().split('T')[0],
        turno: carroParaSAP.turno || 'A',
        destino_final: carroParaSAP.destino_final || 'Destino não informado',
        quantidade_nfs: carroParaSAP.quantidade_nfs || 0,
        total_volumes: carroParaSAP.total_volumes || 0,
        estimativa_pallets: carroParaSAP.estimativa_pallets || 0,
        data_criacao: carroParaSAP.data_criacao || new Date().toISOString(),
        data_finalizacao: new Date().toISOString(),
        nfs: carroParaSAP.nfs || [],
        status_carro: "lancado" // Status "Lançado" após buscar número na tabela de finalizados
      }

      console.log('🚀 Tentando salvar carro na tabela embalagem_carros_finalizados:')
      console.log('📋 Dados do carro:', JSON.stringify(carroParaSalvar, null, 2))
      console.log('🔑 Números SAP:', numerosSAP)
      console.log('📊 Estrutura do carroParaSAP:', carroParaSAP)

      // Verificar se a tabela existe primeiro
      const { data: tableCheck, error: tableError } = await getSupabase()
        .from('embalagem_carros_finalizados')
        .select('*')
        .limit(1)

      if (tableError) {
        console.error('❌ Erro ao verificar tabela embalagem_carros_finalizados:', tableError)
        toast({
          title: "Aviso",
          description: "Tabela de carros finalizados não encontrada. Carro salvo apenas localmente.",
          duration: 4000,
        })
      } else {
        console.log('✅ Tabela embalagem_carros_finalizados encontrada, salvando carro...')

        // Salvar no Supabase
        const { data: insertData, error: supabaseError } = await getSupabase()
          .from('embalagem_carros_finalizados')
          .insert({
            carros: [carroParaSalvar]
          })
          .select()

        if (supabaseError) {
          console.error('❌ Erro ao salvar na tabela embalagem_carros_finalizados:', supabaseError)
          toast({
            title: "Aviso",
            description: "Erro ao salvar na tabela de carros finalizados. Carro salvo apenas localmente.",
            duration: 4000,
          })
        } else {
          console.log('✅ Carro salvo com sucesso na tabela embalagem_carros_finalizados:', insertData)
        }
      }

      // 3. Salvar também no localStorage como backup
      const chaveCarrosFinalizados = "profarma_carros_finalizados_admin"
      const carrosFinalizadosExistentes = localStorage.getItem(chaveCarrosFinalizados)
      const carrosFinalizados = carrosFinalizadosExistentes ? JSON.parse(carrosFinalizadosExistentes) : []

      // Adicionar o carro finalizado à lista local
      carrosFinalizados.push(carroParaSalvar)
      localStorage.setItem(chaveCarrosFinalizados, JSON.stringify(carrosFinalizados))

      console.log('💾 Carro salvo localmente como backup:', carroParaSalvar)

      // 4. Fechar modal e limpar estados
      setModalSAP(false)
      setCarroParaSAP(null)
      setNumerosSAP([])
      setNovoNumeroSAP("")

      toast({
        title: "Carro Lançado!",
        description: `Carro lançado com sucesso! Status alterado para "Lançado". Números SAP: ${numerosSAP.join(", ")}. Número do carro: ${result.numeroCarro || carroParaSAP.carro_id}`,
        duration: 5000,
      })
    } catch (error) {
      console.error('Erro ao lançar carro:', error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao lançar carro",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Combinar todos os carros para estatísticas
  const todosCarros = [...carros, ...carrosLancamento]

  // Filtrar carros
  const carrosFiltrados = carros.filter((carro) => {
    // Filtro básico de status
    const matchStatus = filtroStatus === "todos" ||
      (filtroStatus === "lancados" && carro.status_carro === "lancado") ||
      carro.status_carro === filtroStatus

    // Filtro básico de busca
    const matchBusca = filtroBusca === "" ||
      carro.nome_carro.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      (carro.numeros_sap && carro.numeros_sap.some((sap: string) =>
        sap.toLowerCase().includes(filtroBusca.toLowerCase())
      )) ||
      carro.colaboradores.some(col => col.toLowerCase().includes(filtroBusca.toLowerCase())) ||
      carro.destino_final.toLowerCase().includes(filtroBusca.toLowerCase())

    // Filtros avançados
    let matchFiltrosAvancados = true

    // Filtro de data
    if (filtrosAvancados.filtroData !== "todos" && filtrosAvancados.dataInicio && filtrosAvancados.dataFim) {
      const dataCarro = new Date(carro.data)
      const dataInicio = new Date(filtrosAvancados.dataInicio)
      const dataFim = new Date(filtrosAvancados.dataFim)
      dataFim.setHours(23, 59, 59) // Incluir todo o dia final

      matchFiltrosAvancados = matchFiltrosAvancados &&
        dataCarro >= dataInicio && dataCarro <= dataFim
    }

    if (filtrosAvancados.incluirSetores && filtrosAvancados.setores.length > 0) {
      // Implementar lógica de filtro por setor se necessário
      matchFiltrosAvancados = matchFiltrosAvancados && true
    }

    if (filtrosAvancados.incluirStatus && filtrosAvancados.statuses.length > 0) {
      matchFiltrosAvancados = matchFiltrosAvancados && filtrosAvancados.statuses.includes(carro.status_carro)
    }

    if (filtrosAvancados.incluirColaboradores && filtrosAvancados.colaboradores.length > 0) {
      matchFiltrosAvancados = matchFiltrosAvancados &&
        carro.colaboradores.some(col => filtrosAvancados.colaboradores.includes(col))
    }

    if (filtrosAvancados.incluirDestinos && filtrosAvancados.destinos.length > 0) {
      matchFiltrosAvancados = matchFiltrosAvancados &&
        filtrosAvancados.destinos.some(destino =>
          carro.destino_final.toLowerCase().includes(destino.toLowerCase())
        )
    }

    if (filtrosAvancados.incluirTiposCarro && filtrosAvancados.tiposCarro.length > 0) {
      const tipoCarro = determinarTipoCarro(carro.nfs)
      matchFiltrosAvancados = matchFiltrosAvancados && filtrosAvancados.tiposCarro.includes(tipoCarro)
    }

    return matchStatus && matchBusca && matchFiltrosAvancados
  })

  // Filtrar carros de lançamento
  const carrosLancamentoFiltrados = carrosLancamento.filter((carro) => {
    // Filtro básico de status
    const matchStatus = filtroStatus === "todos" ||
      (filtroStatus === "lancados" && carro.status === "lancado") ||
      carro.status === filtroStatus

    // Filtro básico de busca
    const matchBusca = filtroBusca === "" ||
      (carro.nomeCarro && carro.nomeCarro.toLowerCase().includes(filtroBusca.toLowerCase())) ||
      (carro.numerosSAP && carro.numerosSAP.some((sap: string) =>
        sap.toLowerCase().includes(filtroBusca.toLowerCase())
      )) ||
      carro.colaboradores.some(col => col.toLowerCase().includes(filtroBusca.toLowerCase())) ||
      carro.destinoFinal.toLowerCase().includes(filtroBusca.toLowerCase())

    // Filtros avançados
    let matchFiltrosAvancados = true

    // Filtro de data
    if (filtrosAvancados.filtroData !== "todos" && filtrosAvancados.dataInicio && filtrosAvancados.dataFim) {
      const dataCarro = new Date(carro.data)
      const dataInicio = new Date(filtrosAvancados.dataInicio)
      const dataFim = new Date(filtrosAvancados.dataFim)
      dataFim.setHours(23, 59, 59) // Incluir todo o dia final

      matchFiltrosAvancados = matchFiltrosAvancados &&
        dataCarro >= dataInicio && dataCarro <= dataFim
    }

    if (filtrosAvancados.incluirSetores && filtrosAvancados.setores.length > 0) {
      // Implementar lógica de filtro por setor se necessário
      matchFiltrosAvancados = matchFiltrosAvancados && true
    }

    if (filtrosAvancados.incluirStatus && filtrosAvancados.statuses.length > 0) {
      matchFiltrosAvancados = matchFiltrosAvancados && filtrosAvancados.statuses.includes(carro.status)
    }

    if (filtrosAvancados.incluirColaboradores && filtrosAvancados.colaboradores.length > 0) {
      matchFiltrosAvancados = matchFiltrosAvancados &&
        carro.colaboradores.some(col => filtrosAvancados.colaboradores.includes(col))
    }

    if (filtrosAvancados.incluirDestinos && filtrosAvancados.destinos.length > 0) {
      matchFiltrosAvancados = matchFiltrosAvancados &&
        filtrosAvancados.destinos.some(destino =>
          carro.destinoFinal.toLowerCase().includes(destino.toLowerCase())
        )
    }

    if (filtrosAvancados.incluirTiposCarro && filtrosAvancados.tiposCarro.length > 0) {
      const tipoCarro = determinarTipoCarro(carro.nfs)
      matchFiltrosAvancados = matchFiltrosAvancados && filtrosAvancados.tiposCarro.includes(tipoCarro)
    }

    return matchStatus && matchBusca && matchFiltrosAvancados
  })

  // Combinar estatísticas do banco de dados com carros de lançamento
  const estatisticasCombinadas = {
    ...estatisticasRealtime,
    lancados: carrosLancamento.filter((c) => c.status === "lancado").length,
    aguardandoLancamento: estatisticasRealtime.aguardandoLancamento + carrosLancamento.filter((c) => c.status === "aguardando_lancamento").length,
    totalPallets: carros.reduce((total, carro) => total + ((carro as any).posicoes || carro.estimativa_pallets || 0), 0) +
      carrosLancamento.reduce((total, carro) => total + (carro.posicoes || carro.estimativaPallets || 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-6 w-6 text-blue-600" />
            <span>Gerenciar Carros e Lançamentos</span>
          </CardTitle>

          {/* Indicadores de Tempo Real */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                  {isConnected ? 'Conectado em Tempo Real' : 'Desconectado'}
                </span>
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{estatisticasCombinadas.total}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">{estatisticasCombinadas.embalando}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Embalando</div>
            </div>

            <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">{estatisticasCombinadas.aguardandoLancamento}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Aguardando Lançamento</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{estatisticasCombinadas.divergencia}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Divergências</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-teal-600">{estatisticasCombinadas.lancados}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Lançados</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{estatisticasCombinadas.finalizados}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Finalizados</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-indigo-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600">{estatisticasCombinadas.totalNFs}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total NFs</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-sky-50 rounded-lg">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-sky-600">{estatisticasCombinadas.totalPallets}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Pallets</div>
            </div>
          </div>

          {/* Filtros Básicos */}
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-4">
            <div className="flex items-center space-x-2 w-full">
              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <Input
                placeholder="Buscar por carro, colaborador ou destino..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                className="w-full text-sm h-10"
              />
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-full sm:w-48 text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="embalando">🟠 Embalando</SelectItem>
                  <SelectItem value="divergencia">🔴 Divergência</SelectItem>
                  <SelectItem value="aguardando_lancamento">⏳ Aguardando Lançamento</SelectItem>
                  <SelectItem value="finalizado">✅ Finalizados</SelectItem>
                  <SelectItem value="lancado">🚀 Lançados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                const pesquisaSection = document.querySelector('[data-pesquisa-notas]')
                if (pesquisaSection) {
                  pesquisaSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              variant="outline"
              className="w-full sm:w-auto text-sm h-10 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            >
              <Search className="h-4 w-4 mr-2" />
              Pesquisar Notas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros Avançados */}
      <FiltrosAvancados
        filtros={filtrosAvancados}
        onFiltrosChange={setFiltrosAvancados}
        opcoesDisponiveis={{
          setores: ["Embalagem", "Expedição", "Recebimento", "Administrativo"],
          statuses: ["embalando", "divergencia", "aguardando_lancamento", "finalizado", "lancado"],
          colaboradores: [...new Set(carros.flatMap(c => c.colaboradores))],
          destinos: [...new Set(carros.flatMap(c => c.destino_final.split(", ")))]
        }}
      />

      {/* Indicadores de Status */}
      {loading && (
        <Card className="border-blue-200">
          <CardContent className="text-center py-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-blue-600">Carregando carros...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicador de Erro */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="text-center py-8">
            <div className="text-red-600">
              <p className="font-semibold">Erro ao carregar carros:</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção: Carros em Andamento */}
      {carrosFiltrados.length > 0 && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span>Carros em Andamento ({carrosFiltrados.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {carrosFiltrados.map((carro) => (
                <Card
                  key={carro.carro_id}
                  className="border-green-200 hover:shadow-lg hover:border-green-300 transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    console.log('🎯 Card clicado, abrindo modal para carro:', carro)
                    // Abrir o modal de detalhes que já existe
                    setCarroSelecionado(carro)
                    console.log('🎯 Estado carroSelecionado definido:', carro)
                  }}
                >
                  <CardHeader className="pb-2 sm:pb-3 px-2 sm:px-4 pt-2 sm:pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Truck className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-gray-900">
                          {carro.numeros_sap && carro.numeros_sap.length > 0
                            ? `Carro SAP: ${carro.numeros_sap.join(', ')}`
                            : carro.nome_carro
                          }
                        </span>

                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs ${getStatusColor(carro.status_carro)}`}>
                          {getStatusIcon(carro.status_carro)}
                          <span className="ml-1">{getStatusLabel(carro.status_carro)}</span>
                        </Badge>

                        {/* Badge do tipo do carro */}
                        <Badge
                          className={`text-xs ${determinarTipoCarro(carro.nfs) === "ROD"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-orange-100 text-orange-800 border-orange-200"
                            }`}
                        >
                          {determinarTipoCarro(carro.nfs) === "ROD" ? "ROD" : "CON"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 sm:space-y-3 px-2 sm:px-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>
                        {carro.colaboradores.length === 1
                          ? carro.colaboradores[0]
                          : `${carro.colaboradores.join(" + ")} (Dupla)`}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {carro.data} • Turno {carro.turno} - {getTurnoLabel(carro.turno)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Destino:</span>
                      <span>{carro.destino_final}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{carro.quantidade_nfs}</div>
                        <div className="text-xs text-gray-500">NFs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{carro.total_volumes}</div>
                        <div className="text-xs text-gray-500">Volumes</div>
                      </div>
                      <div className="text-center">
                         <div className="text-lg font-bold text-purple-600">
                           {carro.posicoes || carro.estimativa_pallets}
                         </div>
                         <div className="text-xs text-gray-500">
                           {carro.posicoes ? 'Posições' : 'Estimativa'}
                         </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Criado em: {new Date(carro.data_criacao).toLocaleString("pt-BR")}
                    </div>

                    {/* Indicador de clique */}
                    <div className="text-center text-xs text-gray-400 group-hover:text-blue-600 transition-colors border-t pt-2 mt-2">
                      <Eye className="h-4 w-4 inline mr-1" />
                      Clique para ver detalhes completos
                    </div>

                    {/* Indicador de última atualização */}
                    {carro.data_finalizacao && (
                      <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Última atualização: {new Date(carro.data_finalizacao).toLocaleString("pt-BR")}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:flex lg:flex-row gap-2 sm:gap-3 items-center justify-center">

                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          console.log('🚀 Botão Lançar clicado para carro:', carro)
                          setCarroParaSAP(carro)
                          setNumerosSAP([])
                          setNovoNumeroSAP("")
                          setModalSAP(true)
                        }}
                        disabled={carro.status_carro === "lancado"}
                        className={`w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8 ${carro.status_carro === "lancado"
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                          } text-white`}
                        size="sm"
                        title={carro.status_carro === "lancado" ? "Carro já foi lançado" : "Lançar carro"}
                      >
                        <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">{carro.status_carro === "lancado" ? "Lançado" : "Lançar"}</span>
                        <span className="sm:hidden">{carro.status_carro === "lancado" ? "✓" : "🚀"}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          imprimirCarro(carro)
                        }}
                      >
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Imprimir</span>
                        <span className="sm:hidden">🖨️</span>
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          copiarNFsParaSAP(carro.nfs)
                        }}
                        variant="outline"
                        className="w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        size="sm"
                      >
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Copiar NFs</span>
                        <span className="sm:hidden">📋</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCarroParaExcluir(carro)
                          setModalExclusaoAberto(true)
                        }}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Excluir</span>
                        <span className="sm:hidden">🗑️</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção: Carros para Lançamento */}
      {carrosLancamentoFiltrados.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span>Carros para Lançamento ({carrosLancamentoFiltrados.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {carrosLancamentoFiltrados.map((carro) => (
                <Card
                  key={carro.id}
                  className="border-purple-200 hover:shadow-lg hover:border-purple-300 transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    console.log('🎯 Card de lançamento clicado, abrindo modal para carro:', carro)
                    // Abrir o modal de detalhes que já existe
                    setCarroLancamentoSelecionado(carro)
                    console.log('🎯 Estado carroLancamentoSelecionado definido:', carro)
                  }}
                >
                  <CardHeader className="pb-2 sm:pb-3 px-2 sm:px-4 pt-2 sm:pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Truck className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-gray-900">
                          {carro.nomeCarro && `${carro.nomeCarro} - `}
                          {carro.colaboradores.length === 1
                            ? carro.colaboradores[0]
                            : `${carro.colaboradores.join(" + ")} (Dupla)`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs ${getStatusColor(carro.status)}`}>
                          {getStatusIcon(carro.status)}
                          <span className="ml-1">{getStatusLabel(carro.status)}</span>
                        </Badge>

                        {/* Badge do tipo do carro */}
                        <Badge
                          className={`text-xs ${determinarTipoCarro(carro.nfs) === "ROD"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-orange-100 text-orange-800 border-orange-200"
                            }`}
                        >
                          {determinarTipoCarro(carro.nfs) === "ROD" ? "🚛 ROD" : "📦 CON"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 sm:space-y-3 px-2 sm:px-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {carro.data} • Turno {carro.turno} - {getTurnoLabel(carro.turno)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Destino:</span>
                      <span>{carro.destinoFinal}</span>
                    </div>

                    {carro.numeroLancamento && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Hash className="h-4 w-4" />
                        <span className="font-medium">Lançamento:</span>
                        <span className="font-mono">{carro.numeroLancamento}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 py-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{carro.quantidadeNFs}</div>
                        <div className="text-xs text-gray-500">NFs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{carro.totalVolumes}</div>
                        <div className="text-xs text-gray-500">Volumes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{carro.posicoes || carro.estimativaPallets}</div>
                        <div className="text-xs text-gray-500">{carro.posicoes ? 'Posições' : 'Estimativa'}</div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Finalizado em: {new Date(carro.dataFinalizacao).toLocaleString("pt-BR")}
                    </div>

                    {/* Indicador de clique */}
                    <div className="text-center text-xs text-gray-400 group-hover:text-purple-600 transition-colors border-t pt-2 mt-2">
                      <Eye className="h-4 w-4 inline mr-1" />
                      Clique para ver detalhes completos
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:flex lg:flex-row gap-2 sm:gap-3">
                      {carro.status === "aguardando_lancamento" && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            iniciarLancamento(carro)
                          }}
                          className="w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8 bg-purple-600 hover:bg-purple-700"
                          size="sm"
                        >
                          <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">Fazer Lançamento</span>
                          <span className="sm:hidden">🚀</span>
                        </Button>
                      )}

                      {carro.status === "em_lancamento" && (
                        <div className="col-span-2 sm:col-span-1 grid grid-cols-2 sm:grid-cols-2 lg:flex lg:flex-row gap-2 w-full">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              iniciarLancamento(carro)
                            }}
                            variant="outline"
                            className="w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8"
                            size="sm"
                          >
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Continuar</span>
                            <span className="sm:hidden">📄</span>
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              alterarStatusCarro(carro.id, "aguardando_lancamento")
                            }}
                            variant="outline"
                            className="w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8"
                            size="sm"
                          >
                            <span className="hidden sm:inline">Cancelar</span>
                            <span className="sm:hidden">❌</span>
                          </Button>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          imprimirCarroLancamento(carro)
                        }}
                      >
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Imprimir</span>
                        <span className="sm:hidden">🖨️</span>
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          copiarNFsParaSAP(carro.nfs)
                        }}
                        variant="outline"
                        className="w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        size="sm"
                      >
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Copiar NFs</span>
                        <span className="sm:hidden">📋</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há carros */}
      {carrosFiltrados.length === 0 && carrosLancamentoFiltrados.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="text-center py-8 text-gray-500">
            {todosCarros.length === 0
              ? "Nenhum carro criado ainda."
              : "Nenhum carro encontrado com os filtros selecionados."}
          </CardContent>
        </Card>
      )}

      {/* Modal de Lançamento */}
      <Dialog open={modalLancamento} onOpenChange={setModalLancamento}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-sm sm:text-base">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <span>
                Fazer Lançamento - {carroLancamentoSelecionado?.nomeCarro || "Carro"} (
                {carroLancamentoSelecionado?.colaboradores.join(" + ")})
              </span>
            </DialogTitle>
          </DialogHeader>

          {carroLancamentoSelecionado && (
            <div className="space-y-6">
              {/* Resumo do Carro */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Data</div>
                  <div className="font-medium">{carroLancamentoSelecionado.data}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Turno</div>
                  <div className="font-medium">
                    {carroLancamentoSelecionado.turno} - {getTurnoLabel(carroLancamentoSelecionado.turno)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">NFs</div>
                  <div className="font-medium">{carroLancamentoSelecionado.quantidadeNFs}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Volumes</div>
                  <div className="font-medium">{carroLancamentoSelecionado.totalVolumes}</div>
                </div>
              </div>

              {/* Campos do Lançamento */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="numeroLancamento">Número do Lançamento *</Label>
                  <Input
                    id="numeroLancamento"
                    placeholder="Ex: LAN-2024-001234"
                    value={numeroLancamento}
                    onChange={(e) => setNumeroLancamento(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Observações sobre o lançamento (opcional)..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button
                  onClick={processarLancamento}
                  disabled={!numeroLancamento.trim() || processandoLancamento}
                  className="flex-1 w-full sm:w-auto text-sm bg-purple-600 hover:bg-purple-700"
                >
                  {processandoLancamento ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Confirmar Lançamento
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setModalLancamento(false)} disabled={processandoLancamento} className="w-full sm:w-auto text-sm">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Lançamento com Números SAP */}
      <Dialog open={modalSAP} onOpenChange={setModalSAP}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-sm sm:text-base">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span>
                Lançar Carro - {carroParaSAP?.numeros_sap && carroParaSAP.numeros_sap.length > 0
                  ? `Carro SAP: ${carroParaSAP.numeros_sap.join(', ')}`
                  : carroParaSAP?.nome_carro || "Carro"
                } (
                {carroParaSAP?.colaboradores.join(" + ")})
              </span>
            </DialogTitle>
          </DialogHeader>

          {carroParaSAP && (
            <div className="space-y-6">
              {/* Resumo do Carro */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Data</div>
                  <div className="font-medium">{carroParaSAP.data}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Turno</div>
                  <div className="font-medium">
                    {carroParaSAP.turno} - {getTurnoLabel(carroParaSAP.turno)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">NFs</div>
                  <div className="font-medium">{carroParaSAP.quantidade_nfs}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Volumes</div>
                  <div className="font-medium">{carroParaSAP.total_volumes}</div>
                </div>
              </div>

              {/* Adicionar Números SAP */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="novoNumeroSAP">Número do Carro SAP *</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="novoNumeroSAP"
                      placeholder="Ex: 176681"
                      value={novoNumeroSAP}
                      onChange={(e) => setNovoNumeroSAP(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          adicionarNumeroSAP()
                        }
                      }}
                      className="font-mono flex-1"
                    />
                    <Button
                      onClick={adicionarNumeroSAP}
                      disabled={!novoNumeroSAP.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Lista de Números SAP */}
                {numerosSAP.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Números SAP Adicionados:</Label>
                    <div className="space-y-2 mt-2">
                      {numerosSAP.map((numero, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                          <span className="font-mono text-sm">{numero}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removerNumeroSAP(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  <p>• Adicione um ou mais números de carro SAP (6 dígitos)</p>
                  <p>• Pressione Enter ou clique no botão + para adicionar</p>
                  <p>• Clique no ícone de lixeira para remover um número</p>
                  <p>• Exemplo: 176681, 123456, 999999</p>
                </div>
              </div>

              {/* Botões */}
              <div className="flex space-x-4">
                <Button
                  onClick={confirmarNumerosSAP}
                  disabled={numerosSAP.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Lançar Carro
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setModalSAP(false)
                    setCarroParaSAP(null)
                    setNumerosSAP([])
                    setNovoNumeroSAP("")
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Carro Selecionado */}
      <Dialog
        open={!!carroSelecionado}
        onOpenChange={(open) => {
          console.log('🔍 Modal onOpenChange:', open, 'carroSelecionado:', carroSelecionado)
          if (!open) setCarroSelecionado(null)
        }}
      >
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-sm sm:text-base">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span>
                Detalhes do Carro - {carroSelecionado?.numeros_sap && carroSelecionado.numeros_sap.length > 0
                  ? `Carro SAP: ${carroSelecionado.numeros_sap.join(', ')}`
                  : carroSelecionado?.nome_carro || "Carro"
                } ({carroSelecionado?.colaboradores.join(" + ")})
              </span>
            </DialogTitle>
          </DialogHeader>

          {carroSelecionado && (
            <div className="space-y-6">
              {/* Resumo do Carro */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <Badge className={`${getStatusColor(carroSelecionado.status_carro)}`}>
                    {getStatusIcon(carroSelecionado.status_carro)}
                    <span className="ml-1">{getStatusLabel(carroSelecionado.status_carro)}</span>
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Data</div>
                  <div className="font-medium">{carroSelecionado.data}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Turno</div>
                  <div className="font-medium">
                    {carroSelecionado.turno} - {getTurnoLabel(carroSelecionado.turno)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Destino</div>
                  <div className="font-medium">{carroSelecionado.destino_final}</div>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">NFs</div>
                  <div className="font-medium text-lg">{carroSelecionado.quantidade_nfs}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Volumes</div>
                  <div className="font-medium text-lg">{carroSelecionado.total_volumes}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{carroSelecionado.posicoes ? 'Posições' : 'Estimativa de pallets'}</div>
                    <div className="font-medium text-lg">{carroSelecionado.posicoes || carroSelecionado.estimativa_pallets}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tipo Carro</div>
                  <div className="font-medium text-lg">
                    <Badge
                      className={`${determinarTipoCarro(carroSelecionado.nfs) === "ROD"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-orange-100 text-orange-800 border-orange-200"
                        }`}
                    >
                      {determinarTipoCarro(carroSelecionado.nfs)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* NFs do Carro */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Notas Fiscais</h3>
                </div>

                <ScrollArea className="h-96">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-2 sm:px-4 py-2 grid grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700">
                      <div className="truncate">NF</div>
                      <div className="truncate text-center">Fornecedor</div>
                      <div className="truncate text-center">Destino</div>
                      <div className="truncate text-center">Volume</div>
                      <div className="truncate text-center">Tipo</div>
                      <div className="truncate text-center">Ações</div>
                    </div>
                    {carroSelecionado.nfs.map((nf, index) => (
                      <div
                        key={nf.id}
                        className={`px-2 sm:px-4 py-2 grid grid-cols-7 gap-2 sm:gap-4 text-xs sm:text-sm ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                      >
                        <div className="font-medium">{nf.numeroNF}</div>
                        <div className="truncate" title={nf.fornecedor}>
                          {nf.fornecedor}
                        </div>
                        <div className="truncate text-center">{nf.destinoFinal}</div>
                        <div className="truncate text-center">{nf.volume}</div>
                        <div className="truncate text-center">{nf.tipo}</div>
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => excluirNotaIndividual(carroSelecionado.carro_id, nf.id)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            title="Remover nota"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="bg-green-50 px-4 py-2 grid grid-cols-7 gap-4 text-sm font-bold text-green-800">
                      <div className="col-span-5">Total do Carro:</div>
                      <div className="text-center">{carroSelecionado.total_volumes}</div>
                      <div></div>
                    </div>
                  </div>
                </ScrollArea>
                {/* Botões de Ação */}
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    onClick={() => copiarNFsParaSAP(carroSelecionado.nfs)}
                    variant="outline"
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar NFs
                  </Button>
                  <Button
                    onClick={() => copiarVolumesParaSAP(carroSelecionado.nfs)}
                    variant="outline"
                    className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Volumes
                  </Button>
                  <Label htmlFor="statusSelect" className="text-sm font-medium whitespace-nowrap text-yellow-800">
                    </Label>
                    <Select
                      value={carroSelecionado.status_carro}
                      onValueChange={(novoStatus) => {
                        console.log('Status alterado para:', novoStatus)
                        alterarStatusCarroEmbalagem(carroSelecionado.carro_id, novoStatus as CarroStatus["status_carro"], true)
                      }}
                    >
                      <SelectTrigger className="w-48 bg-white">
                        <SelectValue placeholder="Selecionar status" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="embalando">🟠 Embalando</SelectItem>
                        <SelectItem value="divergencia">🔴 Divergência</SelectItem>
                        <SelectItem value="aguardando_lancamento">⏳ Aguardando Lançamento</SelectItem>
                        <SelectItem value="finalizado">✅ Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
              </div>

              {/* Informações de Criação */}
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Criado em:</span> {new Date(carroSelecionado.data_criacao).toLocaleString("pt-BR")}
                  </div>
                  {carroSelecionado.data_finalizacao && (
                    <div>
                      <span className="font-medium">Última atualização:</span> {new Date(carroSelecionado.data_finalizacao).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Carro de Lançamento Selecionado */}
      <Dialog
        open={!!carroLancamentoSelecionado}
        onOpenChange={(open) => {
          console.log('🔍 Modal de lançamento onOpenChange:', open, 'carroLancamentoSelecionado:', carroLancamentoSelecionado)
          if (!open) setCarroLancamentoSelecionado(null)
        }}
      >
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-sm sm:text-base">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <span>
                Detalhes do Lançamento - {carroLancamentoSelecionado?.nomeCarro || "Carro"} ({carroLancamentoSelecionado?.colaboradores.join(" + ")})
              </span>
            </DialogTitle>
          </DialogHeader>

          {carroLancamentoSelecionado && (
            <div className="space-y-6">
              {/* Resumo do Carro */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <Badge className={`${getStatusColor(carroLancamentoSelecionado.status)}`}>
                    {getStatusLabel(carroLancamentoSelecionado.status)}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Data</div>
                  <div className="font-medium">{carroLancamentoSelecionado.data}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Turno</div>
                  <div className="font-medium">
                    {carroLancamentoSelecionado.turno} - {getTurnoLabel(carroLancamentoSelecionado.turno)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Destino</div>
                  <div className="font-medium">{carroLancamentoSelecionado.destinoFinal}</div>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-purple-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">NFs</div>
                  <div className="font-medium text-lg">{carroLancamentoSelecionado.quantidadeNFs}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Volumes</div>
                  <div className="font-medium text-lg">{carroLancamentoSelecionado.totalVolumes}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Estimativa Pallets</div>
                  <div className="font-medium text-lg">{carroLancamentoSelecionado.estimativaPallets}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{carroLancamentoSelecionado.posicoes ? 'Posições' : 'Estimativa de pallets'}</div>
                  <div className="font-medium text-lg">{carroLancamentoSelecionado.posicoes || carroLancamentoSelecionado.estimativaPallets || "N/A"}</div>
                </div>
              </div>

              {/* NFs do Carro */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Notas Fiscais</h3>
                  <Badge variant="outline" className="text-sm">
                    {carroLancamentoSelecionado.nfs.length} NFs
                  </Badge>
                </div>

                <ScrollArea className="h-96">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-2 sm:px-4 py-2 grid grid-cols-6 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700">
                      <div>NF</div>
                      <div>Código</div>
                      <div>Fornecedor</div>
                      <div>Destino</div>
                      <div>Volume</div>
                      <div>Tipo</div>
                    </div>
                    {carroLancamentoSelecionado.nfs.map((nf, index) => (
                      <div
                        key={nf.id}
                        className={`px-2 sm:px-4 py-2 grid grid-cols-6 gap-2 sm:gap-4 text-xs sm:text-sm ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                      >
                        <div className="font-medium">{nf.numeroNF}</div>
                        <div className="font-medium text-xs">{nf.codigo}</div>
                        <div className="truncate" title={nf.fornecedor}>
                          {nf.fornecedor}
                        </div>
                        <div className="text-xs">{nf.destinoFinal}</div>
                        <div className="text-center">{nf.volume}</div>
                        <div className="text-xs">{nf.tipo}</div>
                      </div>
                    ))}
                    <div className="bg-purple-50 px-4 py-2 grid grid-cols-6 gap-4 text-sm font-bold text-purple-800">
                      <div className="col-span-4">Total do Carro:</div>
                      <div className="text-center">{carroLancamentoSelecionado.totalVolumes}</div>
                      <div></div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Botões de Ação */}
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    onClick={() => copiarNFsParaSAP(carroLancamentoSelecionado.nfs)}
                    variant="outline"
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar NFs
                  </Button>
                  <Button
                    onClick={() => copiarVolumesParaSAP(carroLancamentoSelecionado.nfs)}
                    variant="outline"
                    className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Volumes
                  </Button>
                </div>
              </div>

              {/* Informações de Finalização */}
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Finalizado em:</span> {new Date(carroLancamentoSelecionado.dataFinalizacao).toLocaleString("pt-BR")}
                  </div>
                  {carroLancamentoSelecionado.dataLancamento && (
                    <div>
                      <span className="font-medium">Lançado em:</span> {new Date(carroLancamentoSelecionado.dataLancamento).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>



      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={modalExclusaoAberto} onOpenChange={setModalExclusaoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o carro "{carroParaExcluir?.numeros_sap && carroParaExcluir.numeros_sap.length > 0
                ? `Carro SAP: ${carroParaExcluir.numeros_sap.join(', ')}`
                : carroParaExcluir?.nome_carro
              }"?
              <br />
              <br />
              <strong>Atenção:</strong> Esta ação não pode ser desfeita e todos os dados do carro serão perdidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setModalExclusaoAberto(false)
                setCarroParaExcluir(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (carroParaExcluir) {
                  handleExcluirCarro(carroParaExcluir)
                  setModalExclusaoAberto(false)
                  setCarroParaExcluir(null)
                }
              }}
            >
              Excluir Carro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toaster para notificações */}
      <Toaster />
    </div>
  )
} 