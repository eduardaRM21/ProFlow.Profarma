"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  Scan,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Truck,
  LogOut,
  Calendar,
  Users,
  Camera,
  CameraOff,
  Play,
  ArrowBigLeft,
  FileText,
  Filter,
} from "lucide-react"
import BarcodeScanner from "@/app/recebimento/components/barcode-scanner"
import { EmbalagemService } from "@/lib/embalagem-service"
import { EmbalagemNotasBipadasService } from "@/lib/embalagem-notas-bipadas-service"
import { WMSService } from "@/lib/wms-service"
import { getSupabase } from "@/lib/supabase-client"
import { PrinterService } from "@/lib/printer-service"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-database"
import type { SessionData, NotaFiscal } from "@/lib/database-service"
import { Loader } from "@/components/ui/loader"
import { motion, AnimatePresence } from "framer-motion"

type StatusCarro = "aguardando_colagem" | "em_conferencia" | "liberado" | "embalando" | "em_producao"

interface NFBipada {
  id: string
  codigoCompleto: string
  codigo: string
  numeroNF: string
  volume: number
  codigoDestino: string
  nomeFornecedor: string
  destinoFinal: string
  tipo: string
  timestamp: string
  status: "valida" | "formato_incorreto" | "destino_divergente" | "duplicada" | "volume_invalido" | "invalida"
  erro?: string
}

interface Carro {
  id: string
  nome: string
  destinoFinal: string
  nfs: NFBipada[]
  statusCarro: StatusCarro
  dataInicio: string
  ativo: boolean
}

interface CarroProduzido {
  id: string
  nomeCarro: string
  colaboradores: string[]
  data: string
  turno: string
  destinoFinal: string
  quantidadeNFs: number
  totalVolumes: number
  dataCriacao: string
  dataInicioEmbalagem?: string
  nfs?: NFBipada[]
  status?: "embalando" | "finalizado"
  posicoes?: number | null
  palletes?: number | null
  gaiolas?: number | null
  caixasMangas?: number | null
  dataFinalizacao?: string
}

export default function WMSEmbalagemPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { getSession } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [codigoInput, setCodigoInput] = useState("")
  const [scannerAtivo, setScannerAtivo] = useState(false)
  const [carros, setCarros] = useState<Carro[]>([])
  const [carroAtivo, setCarroAtivo] = useState<Carro | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [notasDuplicadas, setNotasDuplicadas] = useState<Array<{ numeroNF: string; carros: string[] }>>([])
  const [modalNovoCarroAberto, setModalNovoCarroAberto] = useState(false)
  const [nomeNovoCarro, setNomeNovoCarro] = useState("")
  const [carrosProduzidos, setCarrosProduzidos] = useState<CarroProduzido[]>([])
  const [modalPallets, setModalPallets] = useState<{
    aberto: boolean
    carroId: string
    nomeCarro: string
  }>({ aberto: false, carroId: "", nomeCarro: "" })
  const [quantidadePosicoes, setQuantidadePosicoes] = useState("")
  const [tiposPosicao, setTiposPosicao] = useState<{
    paletes: boolean
    gaiolas: boolean
    caixaManga: boolean
  }>({ paletes: false, gaiolas: false, caixaManga: false })
  const [quantidadePaletesReais, setQuantidadePaletesReais] = useState("")
  const [quantidadeGaiolas, setQuantidadeGaiolas] = useState("")
  const [quantidadeCaixaManga, setQuantidadeCaixaManga] = useState("")
  const [finalizandoEmbalagem, setFinalizandoEmbalagem] = useState(false)

  useEffect(() => {
    verificarSessao()
  }, [])

  useEffect(() => {
    if (carros.length === 0 && sessionData) {
      criarPrimeiroCarro()
    }
  }, [sessionData])

  useEffect(() => {
    if (carros.length > 0 && sessionData) {
      const chaveStorage = `wms_carros_${sessionData.colaboradores.join("_")}_${sessionData.data}_${sessionData.turno}`
      const dados = {
        carros,
        ultimaAtualizacao: new Date().toISOString(),
      }
      localStorage.setItem(chaveStorage, JSON.stringify(dados))
    }
  }, [carros, sessionData])

  useEffect(() => {
    carregarCarrosProduzidos()
    const interval = setInterval(() => {
      verificarNotasDuplicadas()
      carregarCarrosProduzidos()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Bloquear scroll do body quando modal estiver aberto
  useEffect(() => {
    if (modalPallets.aberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [modalPallets.aberto])

  const verificarSessao = async () => {
    try {
      const session = await getSession("current")
      if (!session) {
        router.push("/")
        return
      }
      if (session.area !== "wms") {
        router.push("/")
        return
      }
      setSessionData(session)
    } catch (error) {
      console.error("Erro ao verificar sessão:", error)
      router.push("/")
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    router.push("/")
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

  const getTurnoColor = (turno: string) => {
    switch (turno) {
      case "A":
        return "bg-yellow-100 text-yellow-800"
      case "B":
        return "bg-orange-100 text-orange-800"
      case "C":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const verificarNFEmRelatorios = async (numeroNF: string): Promise<boolean> => {
    try {
      const { getSupabase, retryWithBackoff } = await import('@/lib/supabase-client')
      
      const { data: nfData } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('notas_fiscais')
          .select('*')
          .eq('numero_nf', numeroNF)
          .limit(1)
      })
      
      if (nfData && nfData.length > 0) {
        return true
      }
      
      // Verificar localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i)
        if (chave && chave.startsWith("recebimento_")) {
          try {
            const notasRecebimento = JSON.parse(localStorage.getItem(chave) || "[]")
            const notaEncontrada = notasRecebimento.find((nota: any) => nota.numeroNF === numeroNF)
            if (notaEncontrada) {
              return true
            }
          } catch (error) {
            console.error("Erro ao verificar recebimento:", error)
          }
        }
      }
      
      return false
    } catch (error) {
      console.error("Erro na validação:", error)
      return false
    }
  }

  const verificarNotaEmTodosCarros = (codigoCompleto: string): { jaBipada: boolean; carroNome?: string; timestamp?: string } => {
    // Verificar no estado local
    for (const carro of carros) {
      const notaEncontrada = carro.nfs.find((nf) => nf.codigoCompleto === codigoCompleto)
      if (notaEncontrada) {
        return {
          jaBipada: true,
          carroNome: carro.nome,
          timestamp: notaEncontrada.timestamp
        }
      }
    }

    // Verificar no localStorage
    const chaveStorage = `wms_carros_${sessionData?.colaboradores.join("_")}_${sessionData?.data}_${sessionData?.turno}`
    const dadosSalvos = localStorage.getItem(chaveStorage)
    if (dadosSalvos) {
      try {
        const dados = JSON.parse(dadosSalvos)
        const carrosSalvos = dados.carros || []
        for (const carro of carrosSalvos) {
          if (carro.nfs && Array.isArray(carro.nfs)) {
            const notaEncontrada = carro.nfs.find((nf: any) => nf.codigoCompleto === codigoCompleto)
            if (notaEncontrada) {
              return {
                jaBipada: true,
                carroNome: carro.nome,
                timestamp: notaEncontrada.timestamp
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao verificar localStorage:", error)
      }
    }

    return { jaBipada: false }
  }

  const verificarNotasDuplicadas = () => {
    const todasNotas: {[key: string]: string[]} = {}
    
    carros.forEach((carro) => {
      carro.nfs.forEach((nf) => {
        if (nf.numeroNF) {
          if (!todasNotas[nf.numeroNF]) {
            todasNotas[nf.numeroNF] = []
          }
          todasNotas[nf.numeroNF].push(carro.nome)
        }
      })
    })

    const duplicatas = Object.entries(todasNotas)
      .filter(([numeroNF, carros]) => carros.length > 1)
      .map(([numeroNF, carros]) => ({
        numeroNF,
        carros: carros as string[]
      }))

    setNotasDuplicadas(duplicatas)
  }

  const criarPrimeiroCarro = () => {
    if (!sessionData) return
    
    const primeiroCarro: Carro = {
      id: `carro_1_${Date.now()}`,
      nome: "Carro 1",
      destinoFinal: "",
      nfs: [],
      statusCarro: "aguardando_colagem",
      dataInicio: new Date().toISOString(),
      ativo: true,
    }

    setCarros([primeiroCarro])
    setCarroAtivo(primeiroCarro)
  }

  const criarNovoCarro = () => {
    if (!nomeNovoCarro.trim()) {
      alert("Nome do carro é obrigatório!")
      return
    }

    if (carros.some((c) => c.nome.toLowerCase() === nomeNovoCarro.trim().toLowerCase())) {
      alert("Já existe um carro com esse nome!")
      return
    }

    const novoCarro: Carro = {
      id: `carro_${carros.length + 1}_${Date.now()}`,
      nome: nomeNovoCarro.trim(),
      destinoFinal: "",
      nfs: [],
      statusCarro: "aguardando_colagem",
      dataInicio: new Date().toISOString(),
      ativo: false,
    }

    const carrosAtualizados = carros.map((c) => ({ ...c, ativo: false }))
    carrosAtualizados.push({ ...novoCarro, ativo: true })

    setCarros(carrosAtualizados)
    setCarroAtivo(novoCarro)
    setModalNovoCarroAberto(false)
    setNomeNovoCarro("")

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }

  const trocarCarro = (carroId: string) => {
    const carro = carros.find((c) => c.id === carroId)
    if (carro) {
      if (carro.statusCarro === "embalando" || carro.statusCarro === "em_producao") {
        alert("Este carro está em embalagem e não pode ser selecionado.")
        return
      }
      
      const carrosAtualizados = carros.map((c) => ({
        ...c,
        ativo: c.id === carroId,
      }))

      setCarros(carrosAtualizados)
      setCarroAtivo(carro)

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }

  const validarCodigo = async (codigo: string): Promise<{ valido: boolean; nf?: NFBipada; erro?: string }> => {
    if (!carroAtivo) {
      return { valido: false, erro: "Nenhum carro ativo selecionado" }
    }

    const partes = codigo.split("|")

    if (partes.length !== 7) {
      return {
        valido: false,
        erro: `Código deve ter 7 partes separadas por "|". Encontradas: ${partes.length}`,
      }
    }

    const [codigoParte, numeroNF, volumeStr, codigoDestino, nomeFornecedor, destinoFinal, tipo] = partes

    const volume = Number.parseInt(volumeStr)
    if (isNaN(volume) || volume <= 0) {
      return {
        valido: false,
        erro: `Volume deve ser um número válido maior que 0. Recebido: "${volumeStr}"`,
      }
    }

    // Verificar duplicidade no carro ativo
    const jaBipada = carroAtivo.nfs.find((nf) => nf.codigoCompleto === codigo)
    if (jaBipada) {
      return {
        valido: false,
        erro: `NF já foi bipada neste carro em ${new Date(jaBipada.timestamp).toLocaleString("pt-BR")}`,
      }
    }

    // Validação: ROD e CON não podem estar no mesmo carro
    const tipoNormalizado = tipo.trim().toUpperCase()
    const nfsValidasCarro = carroAtivo.nfs.filter((nf) => nf.status === "valida")
    const tiposExistentes = [...new Set(nfsValidasCarro.map((nf) => nf.tipo.trim().toUpperCase()))]
    
    if (tiposExistentes.length > 0) {
      const temROD = tiposExistentes.includes("ROD")
      const temCON = tiposExistentes.includes("CON")
      const ehROD = tipoNormalizado === "ROD"
      const ehCON = tipoNormalizado === "CON"
      
      if ((ehROD && temCON) || (ehCON && temROD)) {
        return {
          valido: false,
          erro: `Cargas ROD (Rodoviária) não podem ser embaladas com CON (Controlado) no mesmo carro. Esta nota é ${tipoNormalizado} e o carro já possui notas ${temROD ? "ROD" : "CON"}. Use um carro diferente.`,
        }
      }
    }

    // Verificar se a NF está em algum relatório finalizado
    const nfEmRelatorio = await verificarNFEmRelatorios(numeroNF)
    
    if (!nfEmRelatorio) {
      return {
        valido: false,
        erro: `NF ${numeroNF} não foi encontrada em relatórios de recebimento. Para embalar uma nota fiscal, ela deve ter sido processada anteriormente no setor de recebimento.`,
      }
    }

    // Verificar coerência do destino no carro ativo
    const nfsDoLote = carroAtivo.nfs.filter((nf) => nf.status === "valida")
    let statusValidacao: NFBipada["status"] = "valida"
    let erro: string | undefined

    // Validação específica para destinos RJ05, RJ08, SP08, SP15
    const destinosEspeciais = ['RJ05', 'RJ08', 'SP08', 'SP15']
    if (destinosEspeciais.includes(codigoDestino) && nfsDoLote.length > 0) {
      const destinosExistentes = [...new Set(nfsDoLote.map((nf) => nf.codigoDestino))]
      if (!destinosExistentes.includes(codigoDestino)) {
        statusValidacao = "destino_divergente"
        erro = `Destino "${codigoDestino}" diverge dos destinos do carro: ${destinosExistentes.join(", ")}`
      }
      
      if (statusValidacao === "valida") {
        const destinosFinaisExistentes = [...new Set(nfsDoLote.map((nf) => nf.destinoFinal))]
        if (!destinosFinaisExistentes.includes(destinoFinal)) {
          statusValidacao = "destino_divergente"
          erro = `Destino final "${destinoFinal}" diverge dos destinos finais do carro: ${destinosFinaisExistentes.join(", ")}`
        }
      }
    }

    // Verificar coerência do destino final no carro ativo
    if (statusValidacao === "valida" && nfsDoLote.length > 0) {
      const destinosExistentes = [...new Set(nfsDoLote.map((nf) => nf.destinoFinal))]
      if (!destinosExistentes.includes(destinoFinal)) {
        statusValidacao = "destino_divergente"
        erro = `Destino "${destinoFinal}" diverge dos destinos do carro: ${destinosExistentes.join(", ")}`
      }
    }

    const nf: NFBipada = {
      id: Date.now().toString(),
      codigoCompleto: codigo,
      codigo: codigoParte,
      numeroNF,
      volume,
      codigoDestino,
      nomeFornecedor,
      destinoFinal,
      tipo,
      timestamp: new Date().toISOString(),
      status: statusValidacao,
      erro,
    }

    return { valido: true, nf }
  }

  const handleBipagem = async () => {
    if (!codigoInput.trim() || !carroAtivo) return

    if (carroAtivo.statusCarro === "embalando" || carroAtivo.statusCarro === "em_producao") {
      alert("Este carro está em embalagem e não pode mais ser modificado.")
      return
    }

    const codigoParaVerificar = codigoInput.trim()

    // Verificar no banco de dados
    const verificarNota = await EmbalagemNotasBipadasService.verificarNotaJaBipada(codigoParaVerificar)
    
    if (verificarNota.success && verificarNota.jaBipada) {
      const mensagemErro = `⚠️ Esta nota já foi bipada no carro "${verificarNota.carroInfo?.carro_nome}" em ${new Date(verificarNota.carroInfo?.timestamp_bipagem || '').toLocaleString()}. Não é possível bipar a mesma nota em outro carro.`
      alert(mensagemErro)
      setCodigoInput("")
      return
    }

    // Verificar localmente
    const verificarLocal = verificarNotaEmTodosCarros(codigoParaVerificar)
    
    if (verificarLocal.jaBipada) {
      const timestamp = verificarLocal.timestamp ? new Date(verificarLocal.timestamp).toLocaleString("pt-BR") : "horário desconhecido"
      const mensagemErro = `⚠️ Esta nota já foi bipada no carro "${verificarLocal.carroNome}" em ${timestamp}. Não é possível bipar a mesma nota em outro carro.`
      alert(mensagemErro)
      setCodigoInput("")
      return
    }

    const resultado = await validarCodigo(codigoParaVerificar)

    if (resultado.valido && resultado.nf) {
      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo?.id) {
          const nfsAtualizadas = [resultado.nf!, ...c.nfs]
          const destinoAtualizado =
            nfsAtualizadas.filter((nf) => nf.status === "valida").length > 0
              ? [...new Set(nfsAtualizadas.filter((nf) => nf.status === "valida").map((nf) => nf.destinoFinal))].join(", ")
              : ""

          return {
            ...c,
            nfs: nfsAtualizadas,
            destinoFinal: destinoAtualizado,
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      const carroAtualizado = carrosAtualizados.find((c) => c.id === carroAtivo?.id)
      if (carroAtualizado) setCarroAtivo(carroAtualizado)
      setCodigoInput("")

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    } else {
      const nfInvalida: NFBipada = {
        id: Date.now().toString(),
        codigoCompleto: codigoInput.trim(),
        codigo: "",
        numeroNF: "",
        volume: 0,
        codigoDestino: "",
        nomeFornecedor: "",
        destinoFinal: "",
        tipo: "",
        timestamp: new Date().toISOString(),
        status: "invalida",
        erro: resultado.erro,
      }

      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo?.id) {
          return {
            ...c,
            nfs: [nfInvalida, ...c.nfs],
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      const carroAtualizado2 = carrosAtualizados.find((c) => c.id === carroAtivo?.id)
      if (carroAtualizado2) setCarroAtivo(carroAtualizado2)
      setCodigoInput("")

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBipagem()
    }
  }

  const handleCodigoEscaneado = async (codigo: string) => {
    setCodigoInput(codigo)
    setScannerAtivo(false)
    await handleBipagem()
  }

  const removerNF = (id: string) => {
    if (!carroAtivo) return

    if (carroAtivo.statusCarro === "embalando" || carroAtivo.statusCarro === "em_producao") {
      alert("Este carro está em embalagem e não pode mais ser modificado.")
      return
    }

    const carrosAtualizados = carros.map((c) => {
      if (c.id === carroAtivo.id) {
        return {
          ...c,
          nfs: c.nfs.filter((nf) => nf.id !== id),
        }
      }
      return c
    })

    setCarros(carrosAtualizados)
    if (carroAtivo) {
      setCarroAtivo(carrosAtualizados.find((c) => c.id === carroAtivo.id)!)
    }
  }

  const getStatusIcon = (status: NFBipada["status"]) => {
    switch (status) {
      case "valida":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "destino_divergente":
      case "formato_incorreto":
      case "volume_invalido":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "duplicada":
      case "invalida":
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusColor = (status: NFBipada["status"]) => {
    switch (status) {
      case "valida":
        return "border-l-green-500 bg-green-50"
      case "destino_divergente":
      case "formato_incorreto":
      case "volume_invalido":
        return "border-l-yellow-500 bg-yellow-50"
      case "duplicada":
      case "invalida":
        return "border-l-red-500 bg-red-50"
      default:
        return "border-l-red-500 bg-red-50"
    }
  }

  const getStatusCarroLabel = (status: StatusCarro) => {
    switch (status) {
      case "aguardando_colagem":
        return "Bipagem"
      case "em_conferencia":
        return "Em Conferência"
      case "liberado":
        return "Liberado"
      case "embalando":
        return "Embalando"
      case "em_producao":
        return "Concluído"
    }
  }

  const getStatusCarroColor = (status: StatusCarro) => {
    switch (status) {
      case "aguardando_colagem":
        return "bg-gray-100 text-gray-800"
      case "em_conferencia":
        return "bg-blue-100 text-blue-800"
      case "liberado":
        return "bg-green-100 text-green-800"
      case "embalando":
        return "bg-orange-100 text-orange-800"
      case "em_producao":
        return "bg-purple-100 text-purple-800"
    }
  }

  const nfsValidas = carroAtivo?.nfs.filter((nf) => nf.status === "valida") || []
  const totalVolumes = nfsValidas.reduce((sum, nf) => sum + nf.volume, 0)
  const destinosUnicos = [...new Set(nfsValidas.map((nf) => nf.destinoFinal))].filter(Boolean)
  const nfsFiltradas =
    filtroStatus === "todos" ? carroAtivo?.nfs || [] : carroAtivo?.nfs.filter((nf) => nf.status === filtroStatus) || []

  const temDivergencias = () => {
    if (!carroAtivo) return false
    
    const nfsInvalidas = carroAtivo.nfs.filter(nf => 
      nf.status === "destino_divergente" || 
      nf.status === "invalida" || 
      nf.status === "formato_incorreto" ||
      nf.status === "duplicada" ||
      nf.status === "volume_invalido"
    )
    
    return nfsInvalidas.length > 0
  }

  const carroFinalizadoPronto = () => {
    if (!carroAtivo) return false
    const isLiberado = carroAtivo.statusCarro === "liberado"
    const hasNfs = nfsValidas.length > 0
    const semDivergencias = !temDivergencias()
    
    return isLiberado && hasNfs && semDivergencias
  }

  const finalizarBipagem = () => {
    if (!carroAtivo || nfsValidas.length === 0) {
      alert("Não há NFs válidas para finalizar neste carro!")
      return
    }

    if (temDivergencias()) {
      alert("Não é possível finalizar a bipagem. Existem divergências que precisam ser corrigidas primeiro.")
      return
    }

    const confirmacao = confirm(
      `Confirma a finalização da bipagem do ${carroAtivo.nome}?\n\n` +
        `NFs válidas: ${nfsValidas.length}\n` +
        `Total de volumes: ${totalVolumes}\n` +
        `Destinos: ${destinosUnicos.join(", ")}\n\n` +
        `Após confirmar, o carro ficará pronto para embalar.`,
    )

    if (confirmacao) {
      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo.id) {
          return {
            ...c,
            statusCarro: "liberado" as StatusCarro,
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      const carroFinalizado = carrosAtualizados.find((c) => c.id === carroAtivo.id)!
      setCarroAtivo(carroFinalizado)

      toast({
        title: "Sucesso",
        description: `${carroFinalizado.nome} finalizado com sucesso! Agora você pode embalar o carro.`
      })
    }
  }

  const embalarCarro = async () => {
    if (!carroAtivo || !carroFinalizadoPronto()) {
      alert("Carro não está pronto para embalar!")
      return
    }

    const confirmacao = confirm(
      `Confirma o início do embalamento do ${carroAtivo.nome}?\n\n` +
        `NFs válidas: ${nfsValidas.length}\n` +
        `Total de volumes: ${totalVolumes}\n` +
        `Destinos: ${destinosUnicos.join(", ")}\n\n` +
        `Após confirmar, o carro será enviado para a seção "Carros Produzidos" onde você poderá finalizar o embalamento e armazenar no WMS.`,
    )

    if (confirmacao) {
      // Salvar todas as notas bipadas no banco
      const salvarNotasNoBanco = async () => {
        try {
          const notasParaSalvar = carroAtivo.nfs.filter(nf => nf.status === 'valida')
          
          // Gerar carro_id único para WMS com prefixo
          const wmsCarroId = `WMS_${carroAtivo.id}`
          
          for (const nf of notasParaSalvar) {
            try {
              const notaBipada = {
                numero_nf: nf.numeroNF,
                codigo_completo: nf.codigoCompleto,
                carro_id: wmsCarroId, // ID diferenciado com prefixo WMS_
                session_id: `wms_${sessionData?.data}_${sessionData?.turno}`,
                colaboradores: sessionData?.colaboradores.join(', ') || '',
                data: sessionData?.data || '',
                turno: sessionData?.turno || '',
                volumes: nf.volume,
                destino: nf.destinoFinal,
                fornecedor: nf.nomeFornecedor,
                cliente_destino: nf.destinoFinal,
                tipo_carga: nf.tipo,
                status: 'bipada',
                observacoes: `NF bipada no carro WMS: ${carroAtivo.nome}`
              }

              await EmbalagemNotasBipadasService.salvarNotaBipada(notaBipada)
            } catch (error) {
              console.error(`Erro ao salvar nota ${nf.numeroNF}:`, error)
            }
          }
        } catch (error) {
          console.error('Erro geral ao salvar notas no banco:', error)
        }
      }
      
      salvarNotasNoBanco()

      // Alterar status do carro ativo para "embalando"
      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo.id) {
          return {
            ...c,
            statusCarro: "embalando" as StatusCarro,
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      setCarroAtivo(carrosAtualizados.find((c) => c.id === carroAtivo.id)!)

      // Salvar na lista de carros para embalagem
      await salvarCarroParaEmbalagem()

      // Criar automaticamente um novo carro após embalar o atual
      const novoCarro: Carro = {
        id: `carro_${carrosAtualizados.length + 1}_${Date.now()}`,
        nome: `Carro ${carrosAtualizados.length + 1}`,
        destinoFinal: "",
        nfs: [],
        statusCarro: "aguardando_colagem",
        dataInicio: new Date().toISOString(),
        ativo: true,
      }

      const carrosComNovo = [...carrosAtualizados, novoCarro]
      setCarros(carrosComNovo)
      setCarroAtivo(novoCarro)

      alert(`${carroAtivo.nome} enviado para embalagem!\n\nUm novo carro foi criado automaticamente para continuar a bipagem.\n\nVá para a seção "Carros Produzidos" para finalizar o embalamento e armazenar no WMS.`)
    }
  }

  const salvarCarroParaEmbalagem = async () => {
    if (!carroAtivo || !sessionData) return

    // Gerar carro_id único para WMS com prefixo (mesmo usado nas notas)
    const wmsCarroId = `WMS_${carroAtivo.id}`

    const carroParaEmbalagem = {
      id: wmsCarroId, // Usar ID com prefixo WMS_ para identificar carros bipados no WMS
      nomeCarro: carroAtivo.nome,
      colaboradores: sessionData.colaboradores,
      data: sessionData.data,
      turno: sessionData.turno,
      destinoFinal: destinosUnicos.join(", "),
      quantidadeNFs: nfsValidas.length,
      totalVolumes,
      dataCriacao: carroAtivo.dataInicio || new Date().toISOString(),
      dataInicioEmbalagem: new Date().toISOString(),
      nfs: nfsValidas.map((nf) => ({
        id: nf.id,
        numeroNF: nf.numeroNF,
        volume: nf.volume,
        fornecedor: nf.nomeFornecedor,
        codigo: nf.codigo,
        codigoDestino: nf.codigoDestino,
        destinoFinal: nf.destinoFinal,
        tipo: nf.tipo,
        codigoCompleto: nf.codigoCompleto,
        timestamp: nf.timestamp,
        status: nf.status,
      })),
      status: "embalando" ,
      estimativaPallets: Math.ceil(totalVolumes / 100),
      palletesReais: null,
      posicoes: null,
      dataFinalizacao: null,
    }

    // Salvar no backend para sincronização entre dispositivos
    try {
      await WMSService.salvarCarroProduzido({
        id: carroParaEmbalagem.id, // Já inclui o prefixo WMS_
        nomeCarro: carroParaEmbalagem.nomeCarro,
        colaboradores: carroParaEmbalagem.colaboradores,
        data: carroParaEmbalagem.data,
        turno: carroParaEmbalagem.turno,
        destinoFinal: carroParaEmbalagem.destinoFinal,
        quantidadeNFs: carroParaEmbalagem.quantidadeNFs,
        totalVolumes: carroParaEmbalagem.totalVolumes,
        dataInicioEmbalagem: carroParaEmbalagem.dataInicioEmbalagem,
        nfs: carroParaEmbalagem.nfs,
        status: carroParaEmbalagem.status as "embalando" | "finalizado",
        palletes: carroParaEmbalagem.palletesReais,
        posicoes: carroParaEmbalagem.posicoes
      })
      console.log('✅ Carro produzido salvo no backend com ID WMS:', wmsCarroId)
    } catch (error) {
      console.error('❌ Erro ao salvar carro produzido:', error)
      // Fallback para localStorage em caso de erro
      const chaveCarrosEmbalagem = "wms_carros_embalagem"
      const carrosExistentes = localStorage.getItem(chaveCarrosEmbalagem)
      const carros = carrosExistentes ? JSON.parse(carrosExistentes) : []

      const carroExistente = carros.findIndex((c: any) => c.id === carroParaEmbalagem.id)

      if (carroExistente !== -1) {
        carros[carroExistente] = carroParaEmbalagem
      } else {
        carros.push(carroParaEmbalagem)
      }

      carros.sort((a: any, b: any) => new Date(b.dataInicioEmbalagem).getTime() - new Date(a.dataInicioEmbalagem).getTime())

      localStorage.setItem(chaveCarrosEmbalagem, JSON.stringify(carros))
    }
  }

  const carregarCarrosProduzidos = async () => {
    try {
      // Carregar do backend para sincronização entre dispositivos
      const carros = await WMSService.carregarCarrosProduzidos()
      setCarrosProduzidos(carros)
      console.log('✅ Carros produzidos carregados do backend:', carros.length)
    } catch (error) {
      console.error("❌ Erro ao carregar carros produzidos do backend:", error)
      // Fallback para localStorage em caso de erro
      const chaveCarrosEmbalagem = "wms_carros_embalagem"
      const carrosEmbalagem = localStorage.getItem(chaveCarrosEmbalagem)
      
      if (carrosEmbalagem) {
        try {
          const carros = JSON.parse(carrosEmbalagem)
          setCarrosProduzidos(carros.filter((c: any) => c.status === "embalando" || c.status === "finalizado" || c.status === "aguardando_lancamento"))
        } catch (parseError) {
          console.error("Erro ao parsear carros do localStorage:", parseError)
        }
      }
    }
  }

  const finalizarEmbalagem = async () => {
    if (
      !quantidadePosicoes.trim() ||
      isNaN(Number(quantidadePosicoes)) ||
      Number(quantidadePosicoes) <= 0
    ) {
      alert("Por favor, informe uma quantidade válida de posições!")
      return
    }

    const posicoes = Number(quantidadePosicoes)
    const carro = carrosProduzidos.find(c => c.id === modalPallets.carroId)

    if (!carro) {
      alert("Carro não encontrado!")
      return
    }

    // Ativar loading
    setFinalizandoEmbalagem(true)

    try {
      // Validar destino antes de criar carga
      const destinoFinal = carro.destinoFinal?.split(", ")[0]?.trim() || ""
      if (!destinoFinal) {
        alert("Erro: O destino final do carro está vazio. Não é possível criar a carga.")
        console.error('❌ Destino final vazio para o carro:', carro)
        return
      }

      console.log('📦 Criando carga para carro:', {
        carroId: modalPallets.carroId,
        nomeCarro: modalPallets.nomeCarro,
        destinoFinal: destinoFinal,
        destinoOriginal: carro.destinoFinal
      })

      // Criar carga no WMS (verifica se já existe para evitar duplicatas)
      const carga = await WMSService.criarCarga({
        cliente_destino: destinoFinal,
        destino: destinoFinal,
        carro_id: modalPallets.carroId // Passar ID do carro para evitar duplicatas
      })

      console.log('✅ Carga criada/obtida:', carga)

      const paletes: any[] = []

      // Preparar todas as notas uma única vez (otimização)
      const todasNotas: NotaFiscal[] = carro.nfs ? carro.nfs.map((nfData: any) => ({
        id: nfData.id || nfData.codigoCompleto || `NF-${nfData.numeroNF}`,
        numeroNF: nfData.numeroNF,
        codigoCompleto: nfData.codigoCompleto || "",
        volumes: nfData.volume || 0,
        fornecedor: nfData.nomeFornecedor || "",
        clienteDestino: nfData.destinoFinal || "",
        destino: nfData.codigoDestino || "",
        tipoCarga: nfData.tipo || "",
        data: nfData.data || new Date().toISOString().split('T')[0],
        timestamp: nfData.timestamp || new Date().toISOString(),
        status: (nfData.status || 'ok') as 'ok' | 'divergencia' | 'devolvida',
        observacoes: nfData.observacoes,
        divergencia: nfData.divergencia
      })) : []

      console.log(`📦 Preparando ${todasNotas.length} nota(s) para ${posicoes} palete(s)`)

      // Se tiver mais de uma posição, criar múltiplos paletes
      if (posicoes > 1) {
        // Gerar código base uma única vez para todos os paletes
        // Todos os paletes compartilharão o mesmo número base (ex: PAL-00004)
        let codigoBase = ''
        try {
          const { data: codigoData, error: codigoError } = await getSupabase()
            .rpc('gerar_codigo_palete')
          
          if (codigoError) {
            console.error('❌ Erro ao gerar código base do palete:', codigoError)
            // Fallback para timestamp
            codigoBase = `PAL-${Date.now()}`
          } else if (codigoData) {
            codigoBase = codigoData as string
          } else {
            codigoBase = `PAL-${Date.now()}`
          }
        } catch (error) {
          console.error('❌ Erro ao gerar código base:', error)
          codigoBase = `PAL-${Date.now()}`
        }
        
        console.log(`📦 Código base gerado para ${posicoes} paletes: ${codigoBase}`)
        
        // Criar todos os paletes com sufixos (_1-3, _2-3, etc.)
        const promessasPaletes = []
        for (let i = 1; i <= posicoes; i++) {
          const codigoComSufixo = `${codigoBase}_${i}-${posicoes}`
          promessasPaletes.push(
            WMSService.criarPalete({
              carga_id: carga.id,
              codigo_palete: codigoComSufixo,
            })
          )
        }
        const paletesCriados = await Promise.all(promessasPaletes)
        paletes.push(...paletesCriados)

        // Distribuir notas entre os paletes de forma sequencial
        if (todasNotas.length > 0 && paletesCriados.length > 0) {
          const notasPorPalete = Math.ceil(todasNotas.length / paletesCriados.length)
          const promessasNotas = paletesCriados.map((palete, index) => {
            const inicio = index * notasPorPalete
            const fim = Math.min(inicio + notasPorPalete, todasNotas.length)
            const notasDoPalete = todasNotas.slice(inicio, fim)
            return notasDoPalete.length > 0
              ? WMSService.adicionarNotasAoPalete(palete.id, notasDoPalete)
              : Promise.resolve()
          })
          await Promise.all(promessasNotas)
        }

        // Atualizar todos os paletes com todas as notas do carro
        console.log('🔄 Atualizando todos os paletes com todas as notas do carro...')
        await WMSService.atualizarTodasNotasEmTodosPaletes(carga.id)
        console.log('✅ Todos os paletes atualizados com todas as notas do carro')

        // Finalizar todos os paletes em paralelo
        const promessasFinalizar = paletesCriados.map(palete =>
          WMSService.finalizarPalete(palete.id, {
            quantidade_paletes: quantidadePaletesReais ? Number(quantidadePaletesReais) : 1,
            quantidade_gaiolas: quantidadeGaiolas ? Number(quantidadeGaiolas) : undefined,
            quantidade_caixas_mangas: quantidadeCaixaManga ? Number(quantidadeCaixaManga) : undefined,
            quantidade_posicoes: 1, // Cada palete ocupa 1 posição
          })
        )
        await Promise.all(promessasFinalizar)
      } else {
        // Se tiver apenas 1 posição, criar um único palete (comportamento original)
        const palete = await WMSService.criarPalete({
          carga_id: carga.id,
        })
        paletes.push(palete)

        // Adicionar todas as NFs ao palete de uma vez (otimizado)
        if (todasNotas.length > 0) {
          await WMSService.adicionarNotasAoPalete(palete.id, todasNotas)
        }

        // Atualizar todos os paletes com todas as notas do carro (mesmo com 1 palete, garante consistência)
        console.log('🔄 Atualizando todos os paletes com todas as notas do carro...')
        await WMSService.atualizarTodasNotasEmTodosPaletes(carga.id)
        console.log('✅ Todos os paletes atualizados com todas as notas do carro')

        // Finalizar palete no WMS
        await WMSService.finalizarPalete(palete.id, {
          quantidade_paletes: quantidadePaletesReais ? Number(quantidadePaletesReais) : 1,
          quantidade_gaiolas: quantidadeGaiolas ? Number(quantidadeGaiolas) : 0,
          quantidade_caixas_mangas: quantidadeCaixaManga ? Number(quantidadeCaixaManga) : 0,
          quantidade_posicoes: 1,
        })
      }

      // Atualizar campo notas na carga UMA ÚNICA VEZ no final (otimização crítica)
      console.log('🔄 Atualizando campo notas da carga (batch final)...')
      await WMSService.atualizarNotasCarga(carga.id)
      console.log('✅ Campo notas da carga atualizado com sucesso')
      
      // Recalcular contadores da carga para garantir valores corretos
      console.log('🔄 Recalculando contadores da carga...')
      await WMSService.recalcularContadoresCarga(carga.id)
      console.log('✅ Contadores da carga recalculados')
      
      // Buscar carga atualizada para usar os valores corretos na impressão
      const cargaAtualizada = await WMSService.buscarCarga(carga.id)
      console.log('📊 Carga atualizada:', cargaAtualizada)

      // Atualizar carro no backend
      try {
        await WMSService.finalizarCarroProduzido(modalPallets.carroId, {
          posicoes: posicoes,
          palletes: quantidadePaletesReais ? Number(quantidadePaletesReais) : undefined,
          gaiolas: quantidadeGaiolas ? Number(quantidadeGaiolas) : undefined,
          caixasMangas: quantidadeCaixaManga ? Number(quantidadeCaixaManga) : undefined
        })
        console.log('✅ Carro finalizado no backend')
      } catch (error) {
        console.error('❌ Erro ao finalizar carro no backend:', error)
        // Fallback para localStorage em caso de erro
        const chaveCarrosEmbalagem = "wms_carros_embalagem"
        const carrosEmbalagem = localStorage.getItem(chaveCarrosEmbalagem)
        if (carrosEmbalagem) {
          const carros = JSON.parse(carrosEmbalagem)
          const carroIndex = carros.findIndex((c: any) => c.id === modalPallets.carroId)

          if (carroIndex !== -1) {
            carros[carroIndex] = {
              ...carros[carroIndex],
              status: "finalizado",
              posicoes: posicoes,
              palletes: quantidadePaletesReais ? Number(quantidadePaletesReais) : null,
              gaiolas: quantidadeGaiolas ? Number(quantidadeGaiolas) : null,
              caixasMangas: quantidadeCaixaManga ? Number(quantidadeCaixaManga) : null,
              dataFinalizacao: new Date().toISOString(),
            }

            localStorage.setItem(chaveCarrosEmbalagem, JSON.stringify(carros))
          }
        }
      }

      // Atualizar lista de carros produzidos
      await carregarCarrosProduzidos()

      // Imprimir etiquetas para cada palete criado
      console.log('📦 Paletes criados:', paletes)
      const codigosPaletes = paletes.map(p => p.codigo_palete).filter(codigo => codigo)
      console.log('🏷️ Códigos dos paletes para impressão:', codigosPaletes)
      
      if (codigosPaletes.length > 0) {
        console.log(`🖨️ Iniciando impressão de ${codigosPaletes.length} etiqueta(s)...`)
        try {
          // Preparar dados adicionais para a etiqueta
          // Usar dados da carga atualizada (valores corretos) em vez dos dados do carro
          // Gerar ID WMS no formato: WMS-001-{timestamp}
          const idWMS = `WMS-001-${Date.now()}`
          const dadosEtiqueta = {
            quantidadeNFs: cargaAtualizada?.total_nfs || carro.quantidadeNFs || 0,
            totalVolumes: cargaAtualizada?.total_volumes || carro.totalVolumes || 0,
            destino: cargaAtualizada?.destino || (carro.destinoFinal ? carro.destinoFinal.split(", ")[0] : ''),
            posicoes: posicoes || null,
            quantidadePaletes: quantidadePaletesReais ? Number(quantidadePaletesReais) : null,
            codigoCarga: cargaAtualizada?.codigo_carga || carga?.codigo_carga || '',
            idWMS: idWMS
          }
          console.log('📋 Dados da etiqueta:', dadosEtiqueta)
          
          const resultadoImpressao = await PrinterService.imprimirEtiquetasPaletes(codigosPaletes, dadosEtiqueta)
          
          if (resultadoImpressao.success) {
            toast({
              title: "Impressão concluída",
              description: `${resultadoImpressao.sucessos} etiqueta(s) impressa(s) com sucesso`,
            })
            console.log(`✅ ${resultadoImpressao.sucessos} etiqueta(s) impressa(s) com sucesso`)
          } else {
            toast({
              title: "Aviso de impressão",
              description: `${resultadoImpressao.sucessos} sucesso(s), ${resultadoImpressao.falhas} falha(s). Verifique o console para detalhes.`,
              variant: "destructive",
            })
            console.warn(`⚠️ Impressão: ${resultadoImpressao.sucessos} sucesso(s), ${resultadoImpressao.falhas} falha(s)`)
            resultadoImpressao.mensagens.forEach(msg => console.log(msg))
          }
        } catch (error) {
          console.error('Erro ao imprimir etiquetas:', error)
          toast({
            title: "Erro na impressão",
            description: "Não foi possível imprimir as etiquetas. O carro foi finalizado, mas você pode tentar imprimir manualmente.",
            variant: "destructive",
          })
          // Não bloquear a finalização se a impressão falhar
        }
      }

      // Fechar modal e limpar campos
      setModalPallets({ aberto: false, carroId: "", nomeCarro: "" })
      setQuantidadePosicoes("")
      setTiposPosicao({ paletes: false, gaiolas: false, caixaManga: false })
      setQuantidadePaletesReais("")
      setQuantidadeGaiolas("")
      setQuantidadeCaixaManga("")

      const mensagem = posicoes > 1 
        ? `${modalPallets.nomeCarro} finalizado e armazenado no WMS com sucesso! ${posicoes} paletes criados.`
        : `${modalPallets.nomeCarro} finalizado e armazenado no WMS com sucesso!`
      alert(mensagem)
    } catch (error) {
      console.error('❌ Erro ao finalizar embalagem:', error)
      if (error instanceof Error) {
        console.error('❌ Mensagem de erro:', error.message)
        console.error('❌ Stack trace:', error.stack)
        alert(`Erro ao finalizar embalagem:\n\n${error.message}\n\nVerifique o console para mais detalhes.`)
      } else {
        console.error('❌ Erro desconhecido:', JSON.stringify(error))
        alert(`Erro ao finalizar embalagem: Erro desconhecido\n\nVerifique o console para mais detalhes.`)
      }
    } finally {
      // Desativar loading
      setFinalizandoEmbalagem(false)
    }
  }

  const abrirModalPallets = (carroId: string, nomeCarro: string) => {
    setModalPallets({ aberto: true, carroId, nomeCarro })
    setQuantidadePosicoes("")
    setTiposPosicao({ paletes: false, gaiolas: false, caixaManga: false })
    setQuantidadePaletesReais("")
    setQuantidadeGaiolas("")
    setQuantidadeCaixaManga("")
  }

  if (!sessionData) {
    return <Loader text="Carregando..." duration={0} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-teal-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Package className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-teal-600" />
              <div>
                <h1 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900">
                  Profarma Distribuição
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 sm:block">
                  WMS - Embalagem
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 sm:flex-none">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-teal-600" />
                  <span className="font-medium truncate text-xs sm:text-sm">
                    {sessionData.colaboradores.length === 1
                      ? sessionData.colaboradores[0]
                      : `${sessionData.colaboradores.join(" + ")} (Dupla)`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{sessionData.data}</span>
                </div>
                <Badge
                  className={`text-xs px-1.5 sm:px-2.5 py-0.5 ${getTurnoColor(sessionData.turno)}`}
                >
                  <span className="sm:inline">Turno&nbsp;</span>
                  {sessionData.turno}
                  <span className="sm:inline">
                    {" "}
                    &nbsp;- {getTurnoLabel(sessionData.turno)}
                  </span>
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/wms")}
                className="flex items-center gap-1 sm:gap-2 bg-transparent hover:bg-teal-50 border-teal-200 px-2 sm:px-4 flex-shrink-0 text-xs sm:text-sm"
              >
                <ArrowBigLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Voltar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2 bg-transparent hover:bg-teal-50 border-teal-200 px-2 sm:px-4 flex-shrink-0 text-xs sm:text-sm"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="space-y-6">
          {/* Header com informações do carro */}
          <Card className="border-teal-200">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex flex-col space-y-2">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base lg:text-lg truncate">Bipagem de Notas Fiscais</span>
                </CardTitle>
                {carroAtivo && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-gray-600 bg-teal-50 p-2 rounded-lg">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="font-medium truncate">{carroAtivo.nome}</span>
                    </div>
                    <Badge className={`text-xs self-start sm:self-center flex-shrink-0 ${getStatusCarroColor(carroAtivo.statusCarro)}`}>
                      {getStatusCarroLabel(carroAtivo.statusCarro)}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-teal-600">{carroAtivo?.nfs.length || 0}</div>
                  <div className="text-xs text-gray-600 leading-tight">Total Bipadas</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-emerald-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">{nfsValidas.length}</div>
                  <div className="text-xs text-gray-600 leading-tight">NFs Válidas</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-teal-600">{totalVolumes}</div>
                  <div className="text-xs text-gray-600 leading-tight">Total Volumes</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{destinosUnicos.length}</div>
                  <div className="text-xs text-gray-600 leading-tight">Destinos</div>
                </div>
              </div>

              {destinosUnicos.length > 0 && (
                <div className="mb-3 sm:mb-4">
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">Destinos do Lote:</Label>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                    {destinosUnicos.map((destino, index) => (
                      <Badge key={index} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs truncate max-w-[120px] sm:max-w-none">
                        {destino}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Alerta de Validação */}
              <div className="mb-3 sm:mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    ⚠️ Validação Obrigatória de Notas Fiscais
                  </span>
                </div>
                <div className="text-xs text-orange-700">
                  <p className="mb-1">
                    <strong>REGRAS DE VALIDAÇÃO:</strong> Apenas notas que tenham sido processadas no setor de recebimento podem ser embaladas.
                  </p>
                </div>
              </div>

              {/* Alerta de Notas Duplicadas */}
              {notasDuplicadas.length > 0 && (
                <div className="mb-3 sm:mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      ⚠️ {notasDuplicadas.length} nota(s) duplicada(s) detectada(s)
                    </span>
                  </div>
                  <div className="text-xs text-red-700">
                    <p className="mb-2">As seguintes notas fiscais aparecem em múltiplos carros:</p>
                    <div className="space-y-1">
                      {notasDuplicadas.slice(0, 3).map((duplicata, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="font-mono bg-red-100 px-2 py-1 rounded">
                            {duplicata.numeroNF}
                          </span>
                          <span>em {duplicata.carros.length} carro(s)</span>
                        </div>
                      ))}
                      {notasDuplicadas.length > 3 && (
                        <p className="text-red-600 font-medium">
                          +{notasDuplicadas.length - 3} mais...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button
                  onClick={finalizarBipagem}
                  disabled={nfsValidas.length === 0 || carroAtivo?.statusCarro === "em_producao" || temDivergencias() || carroAtivo?.statusCarro === "embalando"}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 flex-1 sm:flex-none"
                  size="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Finalizar Bipagem</span>
                  <span className="sm:hidden">Finalizar</span>
                  <span className="ml-1">({nfsValidas.length})</span>
                </Button>

                <Button
                  onClick={embalarCarro}
                  disabled={!carroFinalizadoPronto() || carroAtivo?.statusCarro === "em_producao" || carroAtivo?.statusCarro === "embalando"}
                  className="bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-400 flex-1 sm:flex-none"
                  size="default"
                >
                  <Package className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Embalar Carro</span>
                  <span className="sm:hidden">Embalar</span>
                </Button>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                {carroAtivo?.statusCarro === "embalando" && (
                  <Badge className="bg-orange-100 text-orange-800 text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    Em Embalagem
                  </Badge>
                )}

                {temDivergencias() && (
                  <Badge className="bg-red-100 text-red-800 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Divergências Encontradas</span>
                    <span className="sm:hidden">Divergências</span>
                  </Badge>
                )}

                {carroFinalizadoPronto() && carroAtivo?.statusCarro !== "em_producao" && carroAtivo?.statusCarro !== "embalando" && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Pronto para Embalar</span>
                    <span className="sm:hidden">Pronto</span>
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seletor de Carros */}
          <Card className="border-blue-200">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base lg:text-lg truncate">Gerenciar Carros</span>
                </CardTitle>
                <Button 
                  onClick={() => setModalNovoCarroAberto(true)} 
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Novo Carro</span>
                  <span className="sm:hidden">Adicionar</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {carros
                    .filter((carro) => carro.statusCarro !== "embalando" && carro.statusCarro !== "em_producao")
                    .map((carro) => {
                      const nfsValidasCarro = carro.nfs.filter((nf) => nf.status === "valida")
                      const volumesCarro = nfsValidasCarro.reduce((sum, nf) => sum + nf.volume, 0)

                      return (
                        <div
                          key={carro.id}
                          onClick={() => trocarCarro(carro.id)}
                          className={`p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            carro.ativo
                              ? "border-teal-500 bg-teal-50"
                              : "border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-25"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2">
                            <span className="font-medium text-gray-900 text-sm truncate flex-1">{carro.nome}</span>
                            {carro.ativo && <Badge className="bg-teal-100 text-teal-800 text-xs self-start sm:self-center flex-shrink-0">Ativo</Badge>}
                          </div>

                          <div className="text-xs text-gray-600 space-y-1">
                            <div className="flex flex-wrap gap-1">
                              <span>NFs: {nfsValidasCarro.length}</span>
                              <span>•</span>
                              <span>Vols: {volumesCarro}</span>
                            </div>
                            <div className="truncate text-xs">{carro.destinoFinal || "Sem destino definido"}</div>
                            <div>
                              <Badge className={`text-xs ${getStatusCarroColor(carro.statusCarro)}`}>
                                {getStatusCarroLabel(carro.statusCarro)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {carros.filter((carro) => carro.statusCarro !== "embalando" && carro.statusCarro !== "em_producao").length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Nenhum carro disponível</h3>
                    <p className="text-sm">
                      Todos os carros estão em embalagem ou foram finalizados. 
                      <br />
                      Eles aparecem na seção "Carros Produzidos".
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Campo de bipagem */}
          <Card className="border-teal-200">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
                <Scan className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 flex-shrink-0" />
                <span className="text-sm sm:text-base lg:text-lg truncate">Bipar Código de Barras</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              {scannerAtivo ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-medium">Scanner de Código de Barras</h3>
                    <Button
                      variant="outline"
                      onClick={() => setScannerAtivo(false)}
                      className="text-red-600 hover:text-red-700 w-full sm:w-auto"
                    >
                      <CameraOff className="h-4 w-4 mr-2" />
                      Fechar Scanner
                    </Button>
                  </div>
                  
                  <BarcodeScanner
                    onScan={handleCodigoEscaneado}
                    onError={(error: string) => {
                      console.error("Erro no scanner:", error)
                      alert("Erro no Scanner: " + error)
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        ref={inputRef}
                        placeholder={carroAtivo?.statusCarro === "embalando" || carroAtivo?.statusCarro === "em_producao" ? "Carro embalado - não pode mais ser editado" : "Digite ou escaneie o código de barras..."}
                        value={codigoInput}
                        onChange={(e) => setCodigoInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={carroAtivo?.statusCarro === "embalando" || carroAtivo?.statusCarro === "em_producao"}
                        className="text-sm sm:text-base h-11 font-mono disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setScannerAtivo(true)} 
                        disabled={carroAtivo?.statusCarro === "embalando" || carroAtivo?.statusCarro === "em_producao"}
                        className="h-11 flex-1 sm:flex-none sm:px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Scanner</span>
                        <span className="sm:hidden">Scan</span>
                      </Button>
                      <Button
                        onClick={handleBipagem}
                        disabled={!codigoInput.trim() || carroAtivo?.statusCarro === "embalando" || carroAtivo?.statusCarro === "em_producao"}
                        className="h-11 flex-1 sm:flex-none sm:px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Bipar
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {carroAtivo?.statusCarro === "embalando" || carroAtivo?.statusCarro === "em_producao"
                      ? "Carro embalado - não pode mais ser editado"
                      : "Digite manualmente, use o scanner ou pressione Enter para bipar. ⚠️ Apenas notas processadas em algum setor podem ser embaladas."
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de NFs */}
          <Card className="border-teal-200">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <CardTitle className="text-sm sm:text-base lg:text-lg truncate">Lista de NFs Bipadas</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label className="text-xs sm:text-sm hidden sm:inline">Filtrar:</Label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-full sm:w-40 h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="valida">✅ Válidas</SelectItem>
                      <SelectItem value="destino_divergente">⚠️ Destino Divergente</SelectItem>
                      <SelectItem value="invalida">❌ Inválidas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              {nfsFiltradas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {filtroStatus === "todos"
                    ? "Nenhuma NF bipada ainda. Use o campo acima para começar a bipar."
                    : "Nenhuma NF encontrada com o filtro selecionado."}
                </div>
              ) : (
                <div className="space-y-3">
                  {nfsFiltradas.map((nf) => (
                    <div key={nf.id} className={`p-3 sm:p-4 border-l-4 rounded-r-lg ${getStatusColor(nf.status)}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 mt-0.5">
                            {getStatusIcon(nf.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            {nf.status === "invalida" ? (
                              <div>
                                <div className="font-mono text-xs sm:text-sm text-gray-600 break-all">{nf.codigoCompleto}</div>
                                <div className="text-red-600 text-xs sm:text-sm mt-1">❌ {nf.erro}</div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                  <div className="font-semibold text-gray-900 text-sm sm:text-base">NF: {nf.numeroNF}</div>
                                  <div className="flex flex-wrap gap-1 sm:gap-2">
                                    <Badge variant="outline" className="bg-white text-xs">
                                      Vol: {nf.volume}
                                    </Badge>
                                    <Badge variant="outline" className="bg-white text-xs truncate max-w-[120px] sm:max-w-none">
                                      {nf.destinoFinal}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                                  <div className="truncate">
                                    <strong>Fornecedor:</strong> {nf.nomeFornecedor}
                                  </div>
                                  <div>
                                    <strong>Código:</strong> {nf.codigo} | <strong>Tipo:</strong> {nf.tipo}
                                  </div>
                                  <div className="font-mono text-xs text-gray-500 break-all">{nf.codigoCompleto}</div>
                                </div>
                                {nf.erro && <div className="text-yellow-600 text-xs sm:text-sm mt-2">⚠️ {nf.erro}</div>}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(nf.timestamp).toLocaleString("pt-BR")}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removerNF(nf.id)}
                          disabled={carroAtivo?.statusCarro === "embalando" || carroAtivo?.statusCarro === "em_producao"}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 disabled:text-gray-400 disabled:hover:bg-white self-start sm:self-center flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seção Carros Produzidos */}
          <Card className="border-orange-200">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                <span className="text-sm sm:text-base lg:text-lg truncate">Carros Produzidos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              {carrosProduzidos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhum carro produzido</h3>
                  <p className="text-sm">
                    Os carros que você embalar aparecerão aqui.
                    <br />
                    Você poderá finalizar o embalamento e armazenar no WMS.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrosProduzidos.map((carro, index) => {
                    // Gerar ID único WMS baseado no índice e data
                    const wmsId = `WMS-${String(index + 1).padStart(3, '0')}-${carro.id.slice(-6).toUpperCase()}`
                    
                    return (
                      <div
                        key={carro.id}
                        className="p-4 bg-white rounded-lg border-2 border-teal-300 hover:shadow-md transition-shadow relative"
                      >
                        {/* Badge WMS no canto superior direito */}
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-teal-600 text-white font-bold text-xs px-2 py-1">
                            WMS
                          </Badge>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-16">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{carro.nomeCarro}</span>
                              <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-300 font-mono text-xs">
                                ID: {wmsId}
                              </Badge>
                              <Badge className={carro.status === "embalando" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>
                                {carro.status === "embalando" ? "Embalando" : "Finalizado"}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                <strong>NFs:</strong> {carro.quantidadeNFs} | <strong>Volumes:</strong> {carro.totalVolumes} | <strong>Destino:</strong> {carro.destinoFinal}
                              </div>
                              {carro.posicoes && (
                                <div>
                                  <strong>Posições:</strong> {carro.posicoes}
                                  {carro.palletes && ` | Paletes: ${carro.palletes}`}
                                  {carro.gaiolas && ` | Gaiolas: ${carro.gaiolas}`}
                                  {carro.caixasMangas && ` | Caixas Manga: ${carro.caixasMangas}`}
                                </div>
                              )}
                            </div>
                          </div>
                          {carro.status === "embalando"  && (
                            <Button
                              onClick={() => abrirModalPallets(carro.id, carro.nomeCarro)}
                              className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Finalizar e Armazenar
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal para Novo Carro */}
      <Dialog open={modalNovoCarroAberto} onOpenChange={setModalNovoCarroAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <span>Criar Novo Carro</span>
            </DialogTitle>
            <DialogDescription>
              Crie um novo carro para organizar suas notas fiscais
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nomeCarro">Nome do Carro *</Label>
              <Input
                id="nomeCarro"
                placeholder="Ex: Carro 2, Carro SP, Carro RJ..."
                value={nomeNovoCarro}
                onChange={(e) => setNomeNovoCarro(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    criarNovoCarro()
                  }
                }}
              />
            </div>

            <div className="text-sm text-gray-600">
              <p>• Cada carro pode ter destinos diferentes</p>
              <p>• Você pode alternar entre carros a qualquer momento</p>
              <p>• O novo carro será ativado automaticamente</p>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={criarNovoCarro}
                disabled={!nomeNovoCarro.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Carro
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setModalNovoCarroAberto(false)
                  setNomeNovoCarro("")
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Finalizar Embalagem */}
      <Dialog open={modalPallets.aberto} onOpenChange={(open) => !finalizandoEmbalagem && setModalPallets({ ...modalPallets, aberto: open })}>
        <DialogContent className="max-w-md relative">
          {finalizandoEmbalagem && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[101] flex flex-col items-center justify-center rounded-lg">
              <div className="text-center relative z-10 max-w-sm w-full">
                <div className="relative w-32 h-32 sm:w-48 sm:h-48 mx-auto mb-6 sm:mb-8">
                  <svg 
                    width="200" 
                    height="200" 
                    viewBox="0 0 512 512" 
                    xmlns="http://www.w3.org/2000/svg" 
                    role="img" 
                    className="w-full h-full loader-logo animate-pulse-custom drop-shadow-2xl"
                  >
                    <circle cx="256" cy="256" r="216" fill="#48C142"/>
                    <rect x="196" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
                    <rect x="236" y="120" width="24" height="272" rx="8" fill="#FFFFFF"/>
                    <rect x="280" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
                    <rect x="316" y="160" width="16" height="192" rx="8" fill="#FFFFFF"/>
                  </svg>
                </div>
                
                <div className="text-gray-800 text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">
                  Finalizando
                </div>
                
                <div className="text-gray-800 text-lg sm:text-xl md:text-2xl h-6 sm:h-8 mb-4 sm:mb-5">
                  <span className="animate-blink">.</span>
                  <span className="animate-blink-delay-1">.</span>
                  <span className="animate-blink-delay-2">.</span>
                </div>

                <div className="w-full max-w-xs sm:max-w-sm md:max-w-md h-1 bg-green-200 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full animate-loading"></div>
                </div>
              </div>
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-teal-600" />
              <span>Finalizar Embalagem - {modalPallets.nomeCarro}</span>
            </DialogTitle>
            <DialogDescription>
              Informe a quantidade de posições e tipos para armazenar no WMS
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="quantidadePosicoes">Quantidade de Posições *</Label>
              <Input
                id="quantidadePosicoes"
                type="number"
                min="1"
                placeholder="Ex: 5"
                value={quantidadePosicoes}
                onChange={(e) => setQuantidadePosicoes(e.target.value)}
              />
            </div>

            <div>
              <Label>Tipo de Posição</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="paletes"
                    checked={tiposPosicao.paletes}
                    onChange={(e) => setTiposPosicao({ ...tiposPosicao, paletes: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="paletes" className="cursor-pointer">Paletes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="gaiolas"
                    checked={tiposPosicao.gaiolas}
                    onChange={(e) => setTiposPosicao({ ...tiposPosicao, gaiolas: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="gaiolas" className="cursor-pointer">Gaiolas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="caixaManga"
                    checked={tiposPosicao.caixaManga}
                    onChange={(e) => setTiposPosicao({ ...tiposPosicao, caixaManga: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="caixaManga" className="cursor-pointer">Caixa Manga</Label>
                </div>
              </div>
            </div>

            {tiposPosicao.paletes && (
              <div>
                <Label htmlFor="quantidadePaletesReais">Quantidade de Paletes Reais</Label>
                <Input
                  id="quantidadePaletesReais"
                  type="number"
                  min="0"
                  placeholder="Ex: 3"
                  value={quantidadePaletesReais}
                  onChange={(e) => setQuantidadePaletesReais(e.target.value)}
                />
              </div>
            )}

            {tiposPosicao.gaiolas && (
              <div>
                <Label htmlFor="quantidadeGaiolas">Quantidade de Gaiolas</Label>
                <Input
                  id="quantidadeGaiolas"
                  type="number"
                  min="0"
                  placeholder="Ex: 2"
                  value={quantidadeGaiolas}
                  onChange={(e) => setQuantidadeGaiolas(e.target.value)}
                />
              </div>
            )}

            {tiposPosicao.caixaManga && (
              <div>
                <Label htmlFor="quantidadeCaixaManga">Quantidade de Caixas Manga</Label>
                <Input
                  id="quantidadeCaixaManga"
                  type="number"
                  min="0"
                  placeholder="Ex: 1"
                  value={quantidadeCaixaManga}
                  onChange={(e) => setQuantidadeCaixaManga(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <div className="flex space-x-4">
                <Button
                  onClick={finalizarEmbalagem}
                  disabled={!quantidadePosicoes.trim() || finalizandoEmbalagem}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar 
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setModalPallets({ aberto: false, carroId: "", nomeCarro: "" })}
                  disabled={finalizandoEmbalagem}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
