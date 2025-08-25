"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import {
  MessageCircle,
  Clock,
  Send,
  Shield,
  MessageSquare,
  User,
  CheckCircle2,
  FileText,
  BarChart3,
  Truck,
  Lock,
  AlertTriangle,
  TrendingUp,
  LogOut,
} from "lucide-react"

import GerenciarCarrosSection from "./components/gerenciar-carros-section"
import { useEstatisticas } from "@/hooks/use-estatisticas"

  // Cliente Supabase - será obtido quando necessário
  let supabase: any = null;

interface ChatMessage {
  id: string
  remetenteId: string
  remetenteNome: string
  remetenteTipo: "colaborador" | "admin"
  destinatarioId: string
  mensagem: string
  timestamp: string
  lida: boolean
}

interface Conversa {
  id: string
  colaboradores: string[]
  data: string
  turno: string
  ultimaMensagem: string
  ultimoTimestamp: string
  mensagensNaoLidas: number
}

export default function AdminPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<ChatMessage[]>([])
  const [novaMensagem, setNovaMensagem] = useState("")
  const [filtro, setFiltro] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  
  // Estados para verificação de acesso admin
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  
  const router = useRouter()

  useEffect(() => {
    // Inicializar cliente Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      supabase = getSupabase();
    }
    
    verificarAcessoAdmin()
  }, [])

  const verificarAcessoAdmin = () => {
    try {
      // Verificar se há uma sessão ativa
      const sessionData = localStorage.getItem("sistema_session")
      if (!sessionData) {
        console.log("❌ Nenhuma sessão encontrada")
        router.push("/")
        return
      }

      const session = JSON.parse(sessionData)
      console.log("🔍 Verificando sessão:", session)

      // Verificar se é do setor de embalagem ou admin embalagem
      if (session.area !== "embalagem" && session.area !== "admin-embalagem") {
        console.log("❌ Acesso negado: usuário não é do setor de embalagem ou admin embalagem")
        router.push("/")
        return
      }

      // Se for admin embalagem, não precisa verificar admin_crdk
      if (session.area === "admin-embalagem") {
        console.log("🔐 Usuário do setor Admin Embalagem detectado, solicitando senha...")
        setShowPasswordPrompt(true)
        return
      }

      // Verificar se há um usuário "admin_crdk" na lista de colaboradores (apenas para setor embalagem)
      const hasAdminUser = session.colaboradores.some((colab: string) => 
        colab.toLowerCase().includes("admin_crdk")
      )

      if (!hasAdminUser) {
        console.log("❌ Acesso negado: usuário não é admin_crdk")
        router.push("/")
        return
      }

      // Se chegou até aqui, mostrar prompt de senha
      setShowPasswordPrompt(true)
      console.log("🔐 Usuário admin_crdk detectado, solicitando senha...")
    } catch (error) {
      console.error("❌ Erro ao verificar acesso admin:", error)
      router.push("/")
    }
  }

  const verificarSenhaAdmin = () => {
    if (adminPassword === "crdkes2025") {
      setIsAuthenticated(true)
      setShowPasswordPrompt(false)
      setPasswordError("")
      console.log("✅ Senha admin correta, acesso liberado")
    } else {
      setPasswordError("Senha incorreta. Tente novamente.")
      setAdminPassword("")
      console.log("❌ Senha admin incorreta")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      verificarSenhaAdmin()
    }
  }

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  const handleLogout = () => {
    // Limpar dados de autenticação
    setIsAuthenticated(false)
    setShowPasswordPrompt(false)
    setAdminPassword("")
    setPasswordError("")
    
    // Limpar dados da sessão
    localStorage.removeItem("sistema_session")
    
    // Redirecionar para a página inicial
    router.push("/")
    
    console.log("✅ Logout realizado com sucesso")
  }

  // useEffect para carregar conversas
  useEffect(() => {
    if (isAuthenticated) {
      carregarConversas()
      // Polling para atualizações em tempo real
      const interval = setInterval(carregarConversas, 60000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  // useEffect para carregar mensagens da conversa selecionada
  useEffect(() => {
    if (isAuthenticated && conversaSelecionada) {
      carregarMensagens(conversaSelecionada.id)
      // Polling para mensagens da conversa selecionada
      const interval = setInterval(() => carregarMensagens(conversaSelecionada.id), 1000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, conversaSelecionada])

  // Se não estiver autenticado, mostrar prompt de senha
  if (showPasswordPrompt && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Acesso Administrativo
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Digite a senha para acessar o painel administrativo
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha Administrativa</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Digite a senha"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
            
            {passwordError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {passwordError}
              </div>
            )}
            
            <Button 
              onClick={verificarSenhaAdmin}
              className="w-full"
              size="lg"
            >
              <Shield className="h-4 w-4 mr-2" />
              Acessar Painel Admin
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full"
            >
              Voltar ao Login
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleLogout}
              className="w-full border-red-200 text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair do Sistema
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Se não estiver autenticado, não mostrar nada (está verificando)
  if (!isAuthenticated) {
    return null
  }

  const carregarConversas = () => {
    const chaveListaGeral = "profarma_conversas_admin"
    const conversasSalvas = localStorage.getItem(chaveListaGeral)

    if (conversasSalvas) {
      const conversasArray = JSON.parse(conversasSalvas)
      setConversas(conversasArray)
    }
  }

  const carregarMensagens = async (conversaId: string) => {
    try {
      // Primeiro, tentar carregar do Supabase
      const { data: supabaseMessages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`remetente_id.eq.${conversaId},destinatario_id.eq.${conversaId}`)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Erro ao carregar mensagens do Supabase:', error)
      }

      let mensagensArray: ChatMessage[] = []

      if (supabaseMessages && supabaseMessages.length > 0) {
        // Converter formato do Supabase para o formato local
        mensagensArray = supabaseMessages.map((msg: any) => ({
          id: msg.id,
          remetenteId: msg.remetente_id,
          remetenteNome: msg.remetente_nome,
          remetenteTipo: msg.remetente_tipo,
          destinatarioId: msg.destinatario_id,
          mensagem: msg.mensagem,
          timestamp: msg.timestamp,
          lida: msg.lida,
        }))

        // Salvar no localStorage para cache
        const chaveStorage = `profarma_chat_${conversaId}`
        localStorage.setItem(chaveStorage, JSON.stringify(mensagensArray))
      } else {
        // Fallback para localStorage se não houver dados no Supabase
        const chaveStorage = `profarma_chat_${conversaId}`
        const mensagensSalvas = localStorage.getItem(chaveStorage)
        if (mensagensSalvas) {
          mensagensArray = JSON.parse(mensagensSalvas)
        }
      }

      if (mensagensArray.length > 0) {
        setMensagens(mensagensArray)

        // Marcar mensagens dos colaboradores como lidas
        const mensagensAtualizadas = mensagensArray.map((msg: ChatMessage) => {
          if (msg.remetenteTipo === "colaborador" && !msg.lida) {
            return { ...msg, lida: true }
          }
          return msg
        })

        if (JSON.stringify(mensagensArray) !== JSON.stringify(mensagensAtualizadas)) {
          localStorage.setItem(`profarma_chat_${conversaId}`, JSON.stringify(mensagensAtualizadas))
          setMensagens(mensagensAtualizadas)

          // Atualizar contador na lista de conversas
          atualizarContadorConversa(conversaId)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      // Fallback para localStorage em caso de erro
      const chaveStorage = `profarma_chat_${conversaId}`
      const mensagensSalvas = localStorage.getItem(chaveStorage)
      if (mensagensSalvas) {
        const mensagensArray = JSON.parse(mensagensSalvas)
        setMensagens(mensagensArray)
      }
    }
  }

  const atualizarContadorConversa = (conversaId: string) => {
    const chaveListaGeral = "profarma_conversas_admin"
    const conversasSalvas = localStorage.getItem(chaveListaGeral)

    if (conversasSalvas) {
      const conversasArray = JSON.parse(conversasSalvas)
      const conversaIndex = conversasArray.findIndex((c: Conversa) => c.id === conversaId)

      if (conversaIndex !== -1) {
        conversasArray[conversaIndex].mensagensNaoLidas = 0
        localStorage.setItem(chaveListaGeral, JSON.stringify(conversasArray))
        setConversas(conversasArray)
      }
    }
  }

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada || enviando) return

    setEnviando(true)

    const mensagem: ChatMessage = {
      id: Date.now().toString(),
      remetenteId: "admin",
      remetenteNome: "Administrador",
      remetenteTipo: "admin",
      destinatarioId: conversaSelecionada.id,
      mensagem: novaMensagem.trim(),
      timestamp: new Date().toISOString(),
      lida: false,
    }

    // Adicionar à lista local
    const novasMensagens = [...mensagens, mensagem]
    setMensagens(novasMensagens)

    // Salvar no localStorage
    const chaveStorage = `profarma_chat_${conversaSelecionada.id}`
    localStorage.setItem(chaveStorage, JSON.stringify(novasMensagens))

    // Atualizar lista de conversas
    const chaveListaGeral = "profarma_conversas_admin"
    const conversasSalvas = localStorage.getItem(chaveListaGeral)

    if (conversasSalvas) {
      const conversasArray = JSON.parse(conversasSalvas)
      const conversaIndex = conversasArray.findIndex((c: Conversa) => c.id === conversaSelecionada.id)

      if (conversaIndex !== -1) {
        conversasArray[conversaIndex].ultimaMensagem = mensagem.mensagem
        conversasArray[conversaIndex].ultimoTimestamp = mensagem.timestamp
        localStorage.setItem(chaveListaGeral, JSON.stringify(conversasArray))
        setConversas(conversasArray)
      }
    }

    setNovaMensagem("")
    setEnviando(false)
  }



  const formatarHora = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatarData = (timestamp: string) => {
    const data = new Date(timestamp)
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(hoje.getDate() - 1)

    if (data.toDateString() === hoje.toDateString()) {
      return "Hoje"
    } else if (data.toDateString() === ontem.toDateString()) {
      return "Ontem"
    } else {
      return data.toLocaleDateString("pt-BR")
    }
  }

  const conversasFiltradas = conversas.filter(
    (conversa) =>
      conversa.colaboradores.some((col) => col.toLowerCase().includes(filtro.toLowerCase())) ||
      conversa.data.includes(filtro) ||
      conversa.turno.toLowerCase().includes(filtro.toLowerCase()),
  )

  const totalMensagensNaoLidas = conversas.reduce((total, conversa) => total + conversa.mensagensNaoLidas, 0)

  // Agrupar mensagens por data
  const mensagensAgrupadas = mensagens.reduce((grupos: any, mensagem) => {
    const data = formatarData(mensagem.timestamp)
    if (!grupos[data]) {
      grupos[data] = []
    }
    grupos[data].push(mensagem)
    return grupos
  }, {})

  function ChatSection() {
    // Todo o código atual do chat vai aqui
    return (
      <Card className="lg:col-span-2">
        {conversaSelecionada ? (
          <>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-600" />
                <span>{conversaSelecionada.colaboradores.join(" + ")}</span>
              </CardTitle>
              <div className="text-sm text-gray-600">
                {conversaSelecionada.data} • Turno {conversaSelecionada.turno}
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col h-[500px]">
              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4">
                {Object.keys(mensagensAgrupadas).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma mensagem ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(mensagensAgrupadas).map(([data, mensagensData]: [string, any]) => (
                      <div key={data}>
                        {/* Separador de data */}
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{data}</div>
                        </div>

                        {/* Mensagens do dia */}
                        <div className="space-y-3">
                          {mensagensData.map((mensagem: ChatMessage) => (
                            <div
                              key={mensagem.id}
                              className={`flex ${mensagem.remetenteTipo === "admin" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                  mensagem.remetenteTipo === "admin"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                {mensagem.remetenteTipo === "colaborador" && (
                                  <div className="flex items-center space-x-1 mb-1">
                                    <User className="h-3 w-3" />
                                    <span className="text-xs font-medium">{mensagem.remetenteNome}</span>
                                  </div>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{mensagem.mensagem}</p>
                                <div
                                  className={`flex items-center justify-end space-x-1 mt-1 text-xs ${
                                    mensagem.remetenteTipo === "admin" ? "text-blue-100" : "text-gray-500"
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  <span>{formatarHora(mensagem.timestamp)}</span>
                                  {mensagem.remetenteTipo === "admin" && mensagem.lida && (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Campo de envio */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Digite sua resposta..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={handleChatKeyPress}
                    disabled={enviando}
                    className="flex-1"
                  />
                  <Button
                    onClick={enviarMensagem}
                    disabled={!novaMensagem.trim() || enviando}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {enviando ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Pressione Enter para enviar</p>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-[500px]">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
              <p>Escolha uma conversa da lista ao lado para começar a responder</p>
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  function RelatoriosSection() {
    const {
      estatisticasPorTurno,
      estatisticasPorPeriodo,
      estatisticasGerais,
      loading,
      error,
      dataSelecionada,
      periodoSelecionado,
      setDataSelecionada,
      setPeriodoSelecionado,
      formatarTurno,
      formatarData,
      calcularPorcentagem
    } = useEstatisticas()

    return (
      <div className="space-y-6">
        {/* Estatísticas Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <span>Estatísticas Gerais do Sistema</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-4">{error}</div>
            ) : estatisticasGerais ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{estatisticasGerais.total_carros_sistema}</div>
                  <div className="text-sm text-blue-800">Total de Carros</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{estatisticasGerais.total_notas_sistema}</div>
                  <div className="text-sm text-green-800">Total de Notas</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">{estatisticasGerais.total_volumes_sistema}</div>
                  <div className="text-sm text-purple-800">Total de Volumes</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">{estatisticasGerais.produtividade_media_diaria}</div>
                  <div className="text-sm text-orange-800">Produtividade Média</div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Estatísticas por Turno */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-6 w-6 text-green-600" />
              <span>Produtividade por Turno</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-4">{error}</div>
            ) : estatisticasPorTurno.length > 0 ? (
              <div className="space-y-6">
                {/* Gráfico de Barras por Turno */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Carros por Status - {formatarData(dataSelecionada)}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {estatisticasPorTurno.map((stats: any) => (
                      <div key={stats.turno} className="bg-gray-50 p-4 rounded-lg border">
                        <h4 className="font-semibold text-gray-800 mb-3">{formatarTurno(stats.turno)}</h4>
                        
                        {/* Barra de Progresso para Carros */}
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>Embalando: {stats.carros_embalando}</span>
                            <span className="text-orange-600">{calcularPorcentagem(stats.carros_embalando, stats.total_carros)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full" 
                              style={{ width: `${calcularPorcentagem(stats.carros_embalando, stats.total_carros)}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span>Lançados: {stats.carros_lancados}</span>
                            <span className="text-blue-600">{calcularPorcentagem(stats.carros_lancados, stats.total_carros)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${calcularPorcentagem(stats.carros_lancados, stats.total_carros)}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span>Finalizados: {stats.carros_finalizados}</span>
                            <span className="text-green-600">{calcularPorcentagem(stats.carros_finalizados, stats.total_carros)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${calcularPorcentagem(stats.carros_finalizados, stats.total_carros)}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {/* Estatísticas do Turno */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-600">Total Carros:</div>
                          <div className="font-semibold">{stats.total_carros}</div>
                          <div className="text-gray-600">Total Notas:</div>
                          <div className="font-semibold">{stats.total_notas}</div>
                          <div className="text-gray-600">Total Volumes:</div>
                          <div className="font-semibold">{stats.total_volumes}</div>
                          <div className="text-gray-600">Total Pallets Reais:</div>
                          <div className="font-semibold">{stats.total_pallets}</div>
                          <div className="text-gray-600">Produtividade/h:</div>
                          <div className="font-semibold text-green-600">{stats.produtividade_por_hora}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">Nenhuma estatística disponível para esta data</div>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas por Período */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <span>Produtividade por Período</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <select
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={15}>Últimos 15 dias</option>
                <option value={30}>Últimos 30 dias</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-4">{error}</div>
            ) : estatisticasPorPeriodo.length > 0 ? (
              <div className="space-y-4">
                {/* Gráfico de Linha por Período */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Evolução da Produtividade</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {estatisticasPorPeriodo.slice(0, 4).map((stats: any) => (
                        <div key={stats.periodo} className="text-center">
                          <div className="text-lg font-bold text-purple-600">{stats.total_carros}</div>
                          <div className="text-sm text-gray-600">Carros</div>
                          <div className="text-xs text-gray-500">{formatarData(stats.periodo)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Tabela de Estatísticas */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carros</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volumes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pallets Reais</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produtividade</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {estatisticasPorPeriodo.map((stats: any) => (
                          <tr key={stats.periodo} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatarData(stats.periodo)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stats.total_carros}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stats.total_notas}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stats.total_volumes}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stats.total_pallets}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {stats.produtividade_media}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">Nenhuma estatística disponível para este período</div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-sm text-gray-500">Sistema de Bipagem Embalagem</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Botão flutuante para chat interno */}
              <Button
                onClick={() => setActiveSection("chat")}
                className="relative bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                size="sm"
              >
                <MessageCircle className="h-6 w-6" />
                
                {/* Alerta vermelho com número de mensagens não lidas */}
                {totalMensagensNaoLidas > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                    {totalMensagensNaoLidas > 99 ? '99+' : totalMensagensNaoLidas}
                  </div>
                )}
              </Button>

              {/* Botão Sair */}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800 transition-all duration-200"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activeSection ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> 
            {/* Gerenciar Carros */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-300">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Truck className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">Gerenciar Carros</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Visualizar, excluir, gerenciar e lançamentos</p>
                <Button
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                  onClick={() => setActiveSection("gerenciar-carros")}
                >
                  Gerenciar Carros
                </Button>
              </CardContent>
            </Card>

            {/* Chat Interno */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-indigo-300">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-indigo-100 rounded-full">
                    <MessageSquare className="h-12 w-12 text-indigo-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">Chat Interno</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Comunicação e suporte em tempo real</p>
                <Button
                  className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setActiveSection("chat")}
                >
                  Abrir Chat Interno
                </Button>
              </CardContent>
            </Card>

            {/* Relatórios */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-green-300">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-green-100 rounded-full">
                    <BarChart3 className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">Relatórios</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Visualizar estatisticas e produtividade</p>
                <Button
                  className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                  onClick={() => setActiveSection("relatorios")}
                >
                  Ver Relatórios
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            <Button variant="outline" onClick={() => setActiveSection(null)} className="mb-6">
              ← Voltar ao Menu Principal
            </Button>

            {activeSection === "chat" && <ChatSection />}
            {activeSection === "gerenciar-carros" && <GerenciarCarrosSection />}
            {activeSection === "relatorios" && <RelatoriosSection />}
          </div>
        )}
      </main>
    </div>
  )
}
