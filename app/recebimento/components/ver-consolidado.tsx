"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarIcon, BarChart3, ArrowLeft, LogOut, Download, Filter, Search, Package, Trash2, RefreshCw, User, Sun, Moon, Monitor, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSupabase } from "@/lib/supabase-client"
import { useTheme } from "@/contexts/theme-context"

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
  status?: string
}

interface VerConsolidadoProps {
  usuario: Usuario
  onVoltar: () => void
  onLogout: () => void
}

export default function VerConsolidado({ usuario, onVoltar, onLogout }: VerConsolidadoProps) {
  const [notas, setNotas] = useState<NotaFiscal[]>([])
  const [notasFiltradas, setNotasFiltradas] = useState<NotaFiscal[]>([])
  const [notasBipadas, setNotasBipadas] = useState<Set<string>>(new Set())

  // Hook do tema
  const { theme, setTheme } = useTheme()

  // Filtros
  const [dataInicio, setDataInicio] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [filtroTransportadora, setFiltroTransportadora] = useState("all")
  const [filtroDestino, setFiltroDestino] = useState("all")
  const [filtroFornecedor, setFiltroFornecedor] = useState("all")
  const [filtroTipo, setFiltroTipo] = useState("all")
  const [filtroStatus, setFiltroStatus] = useState("all")
  const [busca, setBusca] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [fonteDados, setFonteDados] = useState<'local' | 'banco'>('local')
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(50)

  useEffect(() => {
    carregarNotas()
    carregarNotasBipadas()
  }, [])

  // Resetar filtros quando o período de data for alterado
  useEffect(() => {
    // Calcular opções baseadas no período atual
    let notasParaFiltro = [...notas]

    // Se há filtro de data, usar apenas notas do período
    if (dataInicio && dataFim) {
      notasParaFiltro = notasParaFiltro.filter((nota) => {
        const dataEntrada = parseISO(nota.dataEntrada)
        return isWithinInterval(dataEntrada, {
          start: startOfDay(dataInicio),
          end: endOfDay(dataFim),
        })
      })
    }

    const opcoesAtuais = {
      transportadoras: [...new Set(notasParaFiltro.map((n) => n.transportadora))].sort(),
      destinos: [...new Set(notasParaFiltro.map((n) => n.destino))].sort(),
      fornecedores: [...new Set(notasParaFiltro.map((n) => n.fornecedor))].sort(),
      tipos: [...new Set(notasParaFiltro.map((n) => n.tipo))].sort(),
      status: [...new Set(notasParaFiltro.map((n) => n.status || 'deu entrada'))].sort()
    }

    // Resetar filtros que não existem mais no período selecionado
    if (filtroTransportadora !== "all" && !opcoesAtuais.transportadoras.includes(filtroTransportadora)) {
      setFiltroTransportadora("all")
    }
    if (filtroDestino !== "all" && !opcoesAtuais.destinos.includes(filtroDestino)) {
      setFiltroDestino("all")
    }
    if (filtroFornecedor !== "all" && !opcoesAtuais.fornecedores.includes(filtroFornecedor)) {
      setFiltroFornecedor("all")
    }
    if (filtroTipo !== "all" && !opcoesAtuais.tipos.includes(filtroTipo)) {
      setFiltroTipo("all")
    }
    if (filtroStatus !== "all" && !opcoesAtuais.status.includes(filtroStatus)) {
      setFiltroStatus("all")
    }
  }, [dataInicio, dataFim, notas, filtroTransportadora, filtroDestino, filtroFornecedor, filtroTipo, filtroStatus])

  useEffect(() => {
    aplicarFiltros()
    // Resetar para primeira página quando os filtros mudarem
    setPaginaAtual(1)
  }, [
    notas,
    dataInicio,
    dataFim,
    filtroTransportadora,
    filtroDestino,
    filtroFornecedor,
    filtroTipo,
    filtroStatus,
    busca,
  ])

  const carregarNotas = async () => {
    setCarregando(true)

    try {
      // Tentar carregar do banco de dados primeiro
      const supabase = getSupabase()
      
      // Buscar todas as notas usando paginação automática
      // O Supabase tem limite padrão de 1000 registros, então precisamos buscar em lotes
      let todasNotasBanco: any[] = []
      let offset = 0
      const pageSize = 1000
      let hasMore = true

      console.log('🔄 Iniciando carregamento de notas do banco...')

      while (hasMore) {
        const { data: notasBanco, error, count } = await supabase
          .from('notas_consolidado')
          .select('*', { count: 'exact' })
          .order('data_entrada', { ascending: false })
          .range(offset, offset + pageSize - 1)

        if (error) {
          console.warn('⚠️ Erro ao carregar do banco, usando localStorage:', error.message)
          // Fallback para localStorage
          carregarDoLocalStorage()
          setFonteDados('local')
          return
        }

        if (notasBanco && notasBanco.length > 0) {
          todasNotasBanco = [...todasNotasBanco, ...notasBanco]
          offset += pageSize
          
          // Verificar se há mais registros para buscar
          const totalRegistros = count || 0
          hasMore = offset < totalRegistros
          
          console.log(`📦 Carregadas ${todasNotasBanco.length} de ${totalRegistros} notas...`)
        } else {
          hasMore = false
        }
      }

      if (todasNotasBanco.length > 0) {
        // Converter dados do banco para o formato esperado
        const notasConvertidas = todasNotasBanco.map((nota: any) => ({
          id: nota.id,
          data: nota.data,
          nota: nota.numero_nf,
          volume: nota.volumes,
          destino: nota.destino,
          fornecedor: nota.fornecedor,
          clienteDestino: nota.cliente_destino,
          tipo: nota.tipo_carga,
          transportadora: nota.transportadora,
          usuario: nota.usuario,
          dataEntrada: nota.data_entrada,
          codigoCompleto: nota.codigo_completo,
          status: nota.status
        }))

        setNotas(notasConvertidas)
        setFonteDados('banco')
        console.log(`✅ ${notasConvertidas.length} notas carregadas do banco de dados`)
      } else {
        // Nenhuma nota no banco, tentar localStorage
        carregarDoLocalStorage()
        setFonteDados('local')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar notas:', error)
      carregarDoLocalStorage()
      setFonteDados('local')
    } finally {
      setCarregando(false)
    }
  }

  const carregarDoLocalStorage = () => {
    const notasSalvas = localStorage.getItem("sistema_notas_consolidado")
    const notasCarregadas = notasSalvas ? JSON.parse(notasSalvas) : []

    // Ordenar por data de entrada (mais recente primeiro)
    notasCarregadas.sort(
      (a: NotaFiscal, b: NotaFiscal) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime(),
    )

    setNotas(notasCarregadas)
    console.log(`📦 ${notasCarregadas.length} notas carregadas do localStorage`)
  }

  const carregarNotasBipadas = async () => {
    try {
      const supabase = getSupabase()
      
      // Buscar todas as notas bipadas usando paginação automática
      let todasNotasBipadas: any[] = []
      let offset = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: notasBipadasData, error, count } = await supabase
          .from('notas_bipadas')
          .select('numero_nf', { count: 'exact' })
          .eq('area_origem', 'recebimento')
          .range(offset, offset + pageSize - 1)

        if (error) {
          console.warn('⚠️ Erro ao carregar notas bipadas:', error.message)
          return
        }

        if (notasBipadasData && notasBipadasData.length > 0) {
          todasNotasBipadas = [...todasNotasBipadas, ...notasBipadasData]
          offset += pageSize
          
          // Verificar se há mais registros para buscar
          const totalRegistros = count || 0
          hasMore = offset < totalRegistros
        } else {
          hasMore = false
        }
      }

      if (todasNotasBipadas.length > 0) {
        const numerosBipadas = new Set(todasNotasBipadas.map((nota: any) => nota.numero_nf as string))
        setNotasBipadas(numerosBipadas)
        console.log(`✅ ${numerosBipadas.size} notas bipadas carregadas`)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar notas bipadas:', error)
    }
  }

  const aplicarFiltros = () => {
    let notasProcessadas = [...notas]

    // Filtro por período
    if (dataInicio && dataFim) {
      notasProcessadas = notasProcessadas.filter((nota) => {
        const dataEntrada = parseISO(nota.dataEntrada)
        return isWithinInterval(dataEntrada, {
          start: startOfDay(dataInicio),
          end: endOfDay(dataFim),
        })
      })
    }

    // Filtros por campos específicos
    if (filtroTransportadora !== "all") {
      notasProcessadas = notasProcessadas.filter((nota) =>
        nota.transportadora.toLowerCase().includes(filtroTransportadora.toLowerCase()),
      )
    }

    if (filtroDestino !== "all") {
      notasProcessadas = notasProcessadas.filter((nota) =>
        nota.destino.toLowerCase().includes(filtroDestino.toLowerCase()),
      )
    }

    if (filtroFornecedor !== "all") {
      notasProcessadas = notasProcessadas.filter((nota) =>
        nota.fornecedor.toLowerCase().includes(filtroFornecedor.toLowerCase()),
      )
    }

    if (filtroTipo !== "all") {
      notasProcessadas = notasProcessadas.filter((nota) => nota.tipo.toLowerCase().includes(filtroTipo.toLowerCase()))
    }

    if (filtroStatus !== "all") {
      notasProcessadas = notasProcessadas.filter((nota) => {
        const statusNota = nota.status || 'deu entrada'
        return statusNota.toLowerCase().includes(filtroStatus.toLowerCase())
      })
    }

    // Busca geral
    if (busca) {
      notasProcessadas = notasProcessadas.filter(
        (nota) =>
          nota.nota.includes(busca) ||
          nota.transportadora.toLowerCase().includes(busca.toLowerCase()) ||
          nota.fornecedor.toLowerCase().includes(busca.toLowerCase()) ||
          nota.destino.toLowerCase().includes(busca.toLowerCase()) ||
          nota.clienteDestino.toLowerCase().includes(busca.toLowerCase()) ||
          nota.tipo.toLowerCase().includes(busca.toLowerCase()),
      )
    }

    setNotasFiltradas(notasProcessadas)
  }

  const limparFiltros = () => {
    setDataInicio(undefined)
    setDataFim(undefined)
    setFiltroTransportadora("all")
    setFiltroDestino("all")
    setFiltroFornecedor("all")
    setFiltroTipo("all")
    setFiltroStatus("all")
    setBusca("")
  }

  const excluirNota = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.")) {
      try {
        if (fonteDados === 'banco') {
          // Excluir do banco de dados
          const supabase = getSupabase()
          const { error } = await supabase
            .from('notas_consolidado')
            .delete()
            .eq('id', id)

          if (error) {
            console.error('❌ Erro ao excluir do banco:', error)
            alert('Erro ao excluir nota do banco de dados.')
            return
          }
          console.log('✅ Nota excluída do banco de dados')
        }

        // Atualizar estado local
        const notasAtualizadas = notas.filter((nota) => nota.id !== id)
        setNotas(notasAtualizadas)

        // Atualizar localStorage também
        localStorage.setItem("sistema_notas_consolidado", JSON.stringify(notasAtualizadas))

        console.log('✅ Nota excluída com sucesso')
      } catch (error) {
        console.error('❌ Erro ao excluir nota:', error)
        alert('Erro ao excluir nota.')
      }
    }
  }

  const atualizarDoBanco = async () => {
    setCarregando(true)
    try {
      await carregarNotas()
      await carregarNotasBipadas()
      console.log('✅ Dados atualizados do banco de dados')
    } catch (error) {
      console.error('❌ Erro ao atualizar do banco:', error)
      alert('Erro ao atualizar dados do banco.')
    } finally {
      setCarregando(false)
    }
  }


  const exportarCSV = () => {
    if (notasFiltradas.length === 0) {
      alert("Não há dados para exportar.")
      return
    }

    const headers = [
      "Data Entrada",
      "Data NF",
      "Transportadora",
      "Nota",
      "Volume",
      "Destino",
      "Fornecedor",
      "Cliente Destino",
      "Tipo",
      "Status",
      "Usuário",
    ]

    const csvContent = [
      headers.join(","),
      ...notasFiltradas.map((nota) =>
        [
          new Date(nota.dataEntrada).toLocaleString("pt-BR"),
          nota.data,
          `"${nota.transportadora}"`,
          nota.nota,
          nota.volume,
          nota.destino,
          `"${nota.fornecedor}"`,
          nota.clienteDestino,
          nota.tipo,
          nota.status || 'deu entrada',
          `"${nota.usuario}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `consolidado_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Obter listas únicas para filtros
  // Função para calcular opções de filtro baseadas no período selecionado
  const calcularOpcoesFiltro = useCallback(() => {
    let notasParaFiltro = [...notas]

    // Se há filtro de data, usar apenas notas do período
    if (dataInicio && dataFim) {
      notasParaFiltro = notasParaFiltro.filter((nota) => {
        const dataEntrada = parseISO(nota.dataEntrada)
        return isWithinInterval(dataEntrada, {
          start: startOfDay(dataInicio),
          end: endOfDay(dataFim),
        })
      })
    }

    return {
      transportadoras: [...new Set(notasParaFiltro.map((n) => n.transportadora))].sort(),
      destinos: [...new Set(notasParaFiltro.map((n) => n.destino))].sort(),
      fornecedores: [...new Set(notasParaFiltro.map((n) => n.fornecedor))].sort(),
      tipos: [...new Set(notasParaFiltro.map((n) => n.tipo))].sort(),
      status: [...new Set(notasParaFiltro.map((n) => n.status || 'deu entrada'))].sort()
    }
  }, [notas, dataInicio, dataFim])

  const opcoesFiltro = calcularOpcoesFiltro()

  // Manter compatibilidade com código existente
  const transportadorasUnicas = opcoesFiltro.transportadoras
  const destinosUnicos = opcoesFiltro.destinos
  const fornecedoresUnicos = opcoesFiltro.fornecedores
  const tiposUnicos = opcoesFiltro.tipos
  const statusUnicos = opcoesFiltro.status

  // Estatísticas
  const totalNotas = notasFiltradas.length
  const totalVolumes = notasFiltradas.reduce((sum, nota) => sum + nota.volume, 0)
  const notasBipadasFiltradas = notasFiltradas.filter(nota => notasBipadas.has(nota.nota)).length

  // Cálculos de paginação
  const totalPaginas = Math.ceil(totalNotas / itensPorPagina)
  const indiceInicio = (paginaAtual - 1) * itensPorPagina
  const indiceFim = indiceInicio + itensPorPagina
  const notasPaginadas = notasFiltradas.slice(indiceInicio, indiceFim)

  // Funções de navegação
  const irParaPagina = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaAtual(pagina)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const irParaProximaPagina = () => {
    if (paginaAtual < totalPaginas) {
      irParaPagina(paginaAtual + 1)
    }
  }

  const irParaPaginaAnterior = () => {
    if (paginaAtual > 1) {
      irParaPagina(paginaAtual - 1)
    }
  }

  // Calcular números de páginas para exibir
  const getPaginasParaExibir = () => {
    const paginas: (number | string)[] = []
    const maxPaginas = 7 // Máximo de números de páginas a exibir

    if (totalPaginas <= maxPaginas) {
      // Se há poucas páginas, mostrar todas
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i)
      }
    } else {
      // Sempre mostrar primeira página
      paginas.push(1)

      if (paginaAtual > 3) {
        paginas.push('...')
      }

      // Mostrar páginas ao redor da atual
      const inicio = Math.max(2, paginaAtual - 1)
      const fim = Math.min(totalPaginas - 1, paginaAtual + 1)

      for (let i = inicio; i <= fim; i++) {
        if (!paginas.includes(i)) {
          paginas.push(i)
        }
      }

      if (paginaAtual < totalPaginas - 2) {
        paginas.push('...')
      }

      // Sempre mostrar última página
      if (!paginas.includes(totalPaginas)) {
        paginas.push(totalPaginas)
      }
    }

    return paginas
  }

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-950">
      {/* Header */}
      <div role="banner" className="bg-white dark:bg-gray-900 shadow-sm border-b border-blue-100 dark:border-blue-900/20">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-200">Consolidado - Ver Dados</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Visualizar e exportar dados consolidados</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={onVoltar} className="bg-transparent hover:bg-blue-50 border-blue-200 dark:hover:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              {/* Dropdown do usuário com seletor de tema */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {usuario.nome}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Consolidado
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                        {usuario.nome}
                      </p>
                      <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                        Setor: Consolidado
                      </p>
                      <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                        Login: {new Date(usuario.loginTime).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

                  {/* Opções de Tema */}
                  <DropdownMenuLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aparência
                  </DropdownMenuLabel>

                  <DropdownMenuItem
                    onClick={() => setTheme('light')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Sun className="h-4 w-4" />
                    <span>Modo Claro</span>
                    {theme === 'light' && <span className="ml-auto text-blue-600">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Moon className="h-4 w-4" />
                    <span>Modo Escuro</span>
                    {theme === 'dark' && <span className="ml-auto text-blue-600">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme('system')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Sistema</span>
                    {theme === 'system' && <span className="ml-auto text-blue-600">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center space-x-2 cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50">
            <CardContent className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalNotas}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total de Notas</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:bg-gray-900 dark:border-green-500/50">
            <CardContent className="text-center p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{notasBipadasFiltradas}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Notas Bipadas</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 dark:bg-gray-900 dark:border-emerald-500/50">
            <CardContent className="text-center p-4">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalVolumes}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total de Volumes</div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 dark:bg-gray-900 dark:border-purple-500/50">
            <CardContent className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{transportadorasUnicas.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Transportadoras</div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 dark:bg-gray-900 dark:border-orange-500/50">
            <CardContent className="text-center p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statusUnicos.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Status</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-200">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <span>Filtros</span>
              </div>

            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Período */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-900 dark:text-gray-200">Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 dark:bg-gray-800 dark:border-gray-600">
                    <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-900 dark:text-gray-200">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 dark:bg-gray-800 dark:border-gray-600">
                    <Calendar mode="single" selected={dataFim} onSelect={setDataFim} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Transportadora */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-900 dark:text-gray-200">
                  Transportadora

                </Label>
                <Select value={filtroTransportadora} onValueChange={setFiltroTransportadora}>
                  <SelectTrigger className="bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                    <SelectItem value="all">Todas</SelectItem>
                    {transportadorasUnicas.map((transportadora) => (
                      <SelectItem key={transportadora} value={transportadora}>
                        {transportadora}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destino */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-900 dark:text-gray-200">
                  Destino

                </Label>
                <Select value={filtroDestino} onValueChange={setFiltroDestino}>
                  <SelectTrigger className="bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                    <SelectItem value="all">Todos</SelectItem>
                    {destinosUnicos.map((destino) => (
                      <SelectItem key={destino} value={destino}>
                        {destino}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fornecedor */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-900 dark:text-gray-200">
                  Fornecedor

                </Label>
                <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                  <SelectTrigger className="bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                    <SelectItem value="all">Todos</SelectItem>
                    {fornecedoresUnicos.map((fornecedor) => (
                      <SelectItem key={fornecedor} value={fornecedor}>
                        {fornecedor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-900 dark:text-gray-200">
                  Tipo

                </Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                    <SelectItem value="all">Todos</SelectItem>
                    {tiposUnicos.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-900 dark:text-gray-200">
                  Status

                </Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                    <SelectItem value="all">Todos</SelectItem>
                    {statusUnicos.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Busca */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-900 dark:text-gray-200">Busca Geral</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Nota, transportadora..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10 bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button onClick={limparFiltros} variant="outline" size="sm" className="bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                Limpar Filtros
              </Button>
              <Button
                onClick={atualizarDoBanco}
                disabled={carregando}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
                {carregando ? "Atualizando..." : "Atualizar do Banco"}
              </Button>
              <Button
                onClick={exportarCSV}
                disabled={notasFiltradas.length === 0}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV ({notasFiltradas.length} registros)
              </Button>
              <div className="flex items-center space-x-2">
                <Label className="text-sm text-gray-600 dark:text-gray-300">Itens por página:</Label>
                <Select 
                  value={itensPorPagina.toString()} 
                  onValueChange={(value) => {
                    setItensPorPagina(Number(value))
                    setPaginaAtual(1)
                  }}
                >
                  <SelectTrigger className="w-20 h-8 bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Mostrando {notasFiltradas.length > 0 ? indiceInicio + 1 : 0} - {Math.min(indiceFim, notasFiltradas.length)} de {notasFiltradas.length} registros ({notas.length} total)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center text-gray-900 dark:text-gray-200">
              Dados Consolidados
              {carregando && (
                <div className="ml-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Carregando...
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-medium mb-2">Nenhum registro encontrado</h3>
                <p>Tente ajustar os filtros ou adicionar novos dados.</p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[600px]">
                  <div className="border rounded-lg overflow-hidden dark:border-gray-600">
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 grid grid-cols-12 gap-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                      <div>Data Entrada</div>
                      <div>Data NF</div>
                      <div>Transportadora</div>
                      <div>Nota</div>
                      <div>Volume</div>
                      <div>Destino</div>
                      <div>Fornecedor</div>
                      <div>Cliente Destino</div>
                      <div>Tipo</div>
                      <div>Status</div>
                      <div>Usuário</div>
                      <div className="text-center">Ações</div>
                    </div>
                    {notasPaginadas.map((nota, index) => {
                      const indexGlobal = indiceInicio + index
                    const foiBipada = notasBipadas.has(nota.nota)
                    return (
                      <div
                        key={nota.id}
                        className={`px-4 py-2 grid grid-cols-12 gap-4 text-sm ${foiBipada
                          ? "bg-green-100 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400"
                          : indexGlobal % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"
                          }`}
                      >
                        <div className="text-xs">{new Date(nota.dataEntrada).toLocaleString("pt-BR")}</div>
                        <div className="font-medium">{nota.data}</div>
                        <div className="font-medium">{nota.transportadora}</div>
                        <div className="font-medium flex items-center">
                          {nota.nota}
                          {foiBipada && (
                            <span className="ml-2 text-green-600 text-xs font-bold">BIPADA</span>
                          )}
                        </div>
                        <div className="text-center font-medium">{nota.volume}</div>
                        <div className="font-medium">{nota.destino}</div>
                        <div className="truncate" title={nota.fornecedor}>
                          {nota.fornecedor}
                        </div>
                        <div>{nota.clienteDestino}</div>
                        <div>{nota.tipo}</div>
                        <div className="text-xs">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${nota.status === 'recebida'
                            ? 'bg-green-200 text-green-800'
                            : nota.status === 'deu entrada'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {nota.status || 'deu entrada'}
                          </span>
                        </div>
                        <div className="text-xs">{nota.usuario}</div>
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => excluirNota(nota.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 grid grid-cols-12 gap-4 text-sm font-bold text-blue-800 dark:text-blue-300">
                    <div className="col-span-4">Total:</div>
                    <div className="text-center">{totalVolumes}</div>
                    <div className="col-span-7"></div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Controles de Paginação */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between mt-4 px-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Página {paginaAtual} de {totalPaginas}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={irParaPaginaAnterior}
                        disabled={paginaAtual === 1}
                        className="bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>

                      <div className="flex items-center space-x-1">
                        {getPaginasParaExibir().map((pagina, idx) => {
                          if (pagina === '...') {
                            return (
                              <span key={`ellipsis-${idx}`} className="px-2 text-gray-500 dark:text-gray-400">
                                ...
                              </span>
                            )
                          }

                          const numPagina = pagina as number
                          return (
                            <Button
                              key={numPagina}
                              variant={paginaAtual === numPagina ? "default" : "outline"}
                              size="sm"
                              onClick={() => irParaPagina(numPagina)}
                              className={
                                paginaAtual === numPagina
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                              }
                            >
                              {numPagina}
                            </Button>
                          )
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={irParaProximaPagina}
                        disabled={paginaAtual === totalPaginas}
                        className="bg-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {totalNotas.toLocaleString('pt-BR')} registro{totalNotas !== 1 ? 's' : ''} no total
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
