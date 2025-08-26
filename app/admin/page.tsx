"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
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
  BarChart3,
  Truck,
  Lock,
  AlertTriangle,
  TrendingUp,
  LogOut,
  Search,
} from "lucide-react"

import GerenciarCarrosSection from "./components/gerenciar-carros-section"
import { useEstatisticas } from "@/hooks/use-estatisticas"

// Função para gerar ID único
const gerarIdUnico = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback para navegadores mais antigos
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

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
  // Estado de autenticação (sempre true para acesso direto)
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  // TODOS os outros Hooks vêm DEPOIS da verificação de autenticação
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<ChatMessage[]>([])
  const [novaMensagem, setNovaMensagem] = useState("")
  const [filtro, setFiltro] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  
  // Cliente Supabase - será obtido quando necessário
  const [supabase, setSupabase] = useState<any>(null)
  
  // Referência para o input de mensagem
  const inputRef = useRef<HTMLInputElement>(null)
  
  const router = useRouter()

  useEffect(() => {
    // Inicializar cliente Supabase
    console.log('🔄 Inicializando cliente Supabase...')
    const supabaseClient = getSupabase();
    setSupabase(supabaseClient);
    console.log('✅ Cliente Supabase inicializado:', !!supabaseClient)
    
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

      // Se for admin embalagem, acesso direto permitido
      if (session.area === "admin-embalagem") {
        console.log("🔐 Usuário do setor Admin Embalagem detectado, acesso liberado")
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

      // Se chegou até aqui, acesso direto permitido
      console.log("🔐 Usuário admin_crdk detectado, acesso liberado")
    } catch (error) {
      console.error("❌ Erro ao verificar acesso admin:", error)
      router.push("/")
    }
  }





  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    setNovaMensagem(valor)
  }

  const handleLogout = () => {
    // Limpar dados da sessão
    localStorage.removeItem("sistema_session")
    
    // Redirecionar para a página inicial
    router.push("/")
    
    console.log("✅ Logout realizado com sucesso")
  }

  const carregarConversasDoSupabase = useCallback(async () => {
    try {
      console.log('🔍 Carregando conversas do Supabase...')

      // **Padrão seguro**: use client local
      const client = supabase ?? getSupabase()
      if (!supabase) setSupabase(client)
      
      // Buscar todas as mensagens únicas para criar conversas
      const { data: allMessages, error } = await client
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar mensagens do Supabase:', error)
        console.log('🔄 Tentando usar localStorage como fallback...')
        return
      }

      if (!allMessages || allMessages.length === 0) {
        console.log('ℹ️ Nenhuma mensagem encontrada no Supabase')
        return
      }

      console.log('📊 Mensagens encontradas:', allMessages.length)

      // Agrupar mensagens por conversa
      const conversasMap = new Map()

      allMessages.forEach((msg: any) => {
        const conversaId = msg.remetente_id === 'admin' ? msg.destinatario_id : msg.remetente_id
        
        if (!conversasMap.has(conversaId)) {
          conversasMap.set(conversaId, {
            id: conversaId,
            colaboradores: [msg.remetente_nome || 'Colaborador'],
            data: new Date(msg.timestamp).toISOString().split('T')[0],
            turno: 'manhã', // Default
            ultimaMensagem: msg.mensagem,
            ultimoTimestamp: msg.timestamp,
            mensagensNaoLidas: msg.remetente_tipo === 'colaborador' && !msg.lida ? 1 : 0
          })
        } else {
          const conversa = conversasMap.get(conversaId)
          if (msg.timestamp > conversa.ultimoTimestamp) {
            conversa.ultimaMensagem = msg.mensagem
            conversa.ultimoTimestamp = msg.timestamp
          }
          if (msg.remetente_tipo === 'colaborador' && !msg.lida) {
            conversa.mensagensNaoLidas++
          }
        }
      })

      const conversasArray = Array.from(conversasMap.values())
      console.log('📊 Conversas criadas:', conversasArray.length)
      console.log('📋 Conversas:', conversasArray)

      // Salvar no localStorage
      const chaveListaGeral = "profarma_conversas_admin"
      localStorage.setItem(chaveListaGeral, JSON.stringify(conversasArray))
      
      // Preservar a conversa selecionada se ela ainda existir
      if (conversaSelecionada) {
        const conversaAtualizada = conversasArray.find((c: Conversa) => c.id === conversaSelecionada.id)
        if (conversaAtualizada) {
          console.log('🔄 Atualizando conversa selecionada do Supabase:', conversaAtualizada)
          setConversaSelecionada(conversaAtualizada)
        } else {
          console.log('⚠️ Conversa selecionada não encontrada nas conversas do Supabase')
          setConversaSelecionada(null)
        }
      }
      
      setConversas(conversasArray)
      
    } catch (error) {
      console.error('❌ Erro ao carregar conversas do Supabase:', error)
    }
  }, [supabase])

  const carregarConversas = useCallback(() => {
    const chaveListaGeral = "profarma_conversas_admin"
    const conversasSalvas = localStorage.getItem(chaveListaGeral)

    console.log('🔍 Carregando conversas do localStorage...')
    console.log('📋 Chave:', chaveListaGeral)
    console.log('📋 Dados salvos:', conversasSalvas)

    if (conversasSalvas) {
      const conversasArray = JSON.parse(conversasSalvas)
      console.log('📊 Conversas carregadas:', conversasArray.length)
      console.log('📋 Conversas:', conversasArray)
      
      // Preservar a conversa selecionada se ela ainda existir
      if (conversaSelecionada) {
        const conversaAtualizada = conversasArray.find((c: Conversa) => c.id === conversaSelecionada.id)
        if (conversaAtualizada) {
          console.log('🔄 Atualizando conversa selecionada:', conversaAtualizada)
          setConversaSelecionada(conversaAtualizada)
        } else {
          console.log('⚠️ Conversa selecionada não encontrada nas conversas atualizadas')
          setConversaSelecionada(null)
        }
      }
      
      setConversas(conversasArray)
    } else {
      console.log('⚠️ Nenhuma conversa encontrada no localStorage')
      // Não carregar do Supabase aqui para evitar loop infinito
      setConversas([])
    }
  }, [conversaSelecionada])

  // useEffect para carregar conversas
  useEffect(() => {
    if (isAuthenticated) {
      carregarConversas()
      // Polling para atualizações em tempo real (a cada 5 minutos)
      const interval = setInterval(carregarConversas, 300000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])



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

  const carregarMensagens = useCallback(async (conversaId: string) => {
    try {

      // **Padrão seguro**: use client local
      const client = supabase ?? getSupabase()
      if (!supabase) setSupabase(client)
      
      // Primeiro, tentar carregar do Supabase
      console.log('🔍 Executando consulta para conversa:', conversaId)
      
      const { data: supabaseMessages, error } = await client
        .from('messages')
        .select('*')
        .or(`remetente_id.eq.${conversaId},destinatario_id.eq.${conversaId}`)
        .order('timestamp', { ascending: true })

      console.log('🔍 Buscando mensagens para conversa:', conversaId)
      console.log('📊 Mensagens encontradas no Supabase:', supabaseMessages?.length || 0)
      if (supabaseMessages && supabaseMessages.length > 0) {
        console.log('📋 Primeira mensagem:', supabaseMessages[0])
        console.log('📋 Última mensagem:', supabaseMessages[supabaseMessages.length - 1])
      }

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

      console.log('📊 Mensagens processadas:', mensagensArray.length)
      
      if (mensagensArray.length > 0) {
        console.log('📋 Primeira mensagem:', mensagensArray[0])
        console.log('📋 Última mensagem:', mensagensArray[mensagensArray.length - 1])
        
        // Verificar se o input está focado antes de atualizar as mensagens
        const inputFocado = document.activeElement === inputRef.current
        
        setMensagens(mensagensArray)
        
        // Restaurar o foco se estava focado antes
        if (inputFocado && inputRef.current) {
          setTimeout(() => {
            inputRef.current?.focus()
          }, 0)
        }

        // Marcar mensagens dos colaboradores como lida
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

          // Marcar como lida no Supabase também
          const mensagensParaMarcar = mensagensAtualizadas.filter((msg: ChatMessage) => 
            msg.remetenteTipo === "colaborador" && !msg.lida
          )

          if (mensagensParaMarcar.length > 0) {
            console.log('📝 Marcando mensagens como lidas no Supabase:', mensagensParaMarcar.length)
            
            for (const msg of mensagensParaMarcar) {
              const { error: updateError } = await client
                .from('messages')
                .update({ lida: true })
                .eq('id', msg.id)
              
              if (updateError) {
                console.error('❌ Erro ao marcar mensagem como lida:', updateError)
              }
            }
          }
        }
      } else {
        console.log('⚠️ Nenhuma mensagem encontrada para exibir')
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
  // deps atualizados para refletir usos reais
  }, [supabase, atualizarContadorConversa, /* setSupabase/setMensagens são estáveis */])

  // useEffect para carregar mensagens da conversa selecionada
  useEffect(() => {
    if (isAuthenticated && conversaSelecionada) {
      carregarMensagens(conversaSelecionada.id)
      // Polling para mensagens da conversa selecionada (a cada 3 segundos)
      const interval = setInterval(() => {
        if (conversaSelecionada) {
          carregarMensagens(conversaSelecionada.id)
        }
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, conversaSelecionada?.id])

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada || enviando) return

    setEnviando(true)

    try {
      // **Padrão seguro**: use client local
      const client = supabase ?? getSupabase()
      if (!supabase) setSupabase(client)

      const mensagem: ChatMessage = {
        id: gerarIdUnico(),
        remetenteId: "admin",
        remetenteNome: "Administrador",
        remetenteTipo: "admin",
        destinatarioId: conversaSelecionada.id,
        mensagem: novaMensagem.trim(),
        timestamp: new Date().toISOString(),
        lida: false,
      }

      // Salvar no Supabase primeiro
      const mensagemParaSupabase = {
        id: mensagem.id,
        remetente_id: mensagem.remetenteId,
        remetente_nome: mensagem.remetenteNome,
        remetente_tipo: mensagem.remetenteTipo,
        destinatario_id: mensagem.destinatarioId,
        mensagem: mensagem.mensagem,
        timestamp: mensagem.timestamp,
        lida: mensagem.lida,
      }

      console.log('📤 Enviando mensagem para o Supabase:', mensagemParaSupabase)
      
      const { error } = await client
        .from('messages')
        .insert([mensagemParaSupabase])

      if (error) {
        console.error('❌ Erro ao enviar mensagem para o Supabase:', error)
        alert('Erro ao enviar mensagem: ' + error.message)
        setEnviando(false)
        return
      }

      console.log('✅ Mensagem enviada com sucesso para o Supabase')

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
      console.log('✅ Mensagem processada com sucesso')
      
      // Restaurar foco no input após enviar mensagem
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
      alert('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setEnviando(false)
    }
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

  console.log('🔍 Debug - Estado atual:')
  console.log('📊 Total de mensagens:', mensagens.length)
  console.log('📊 Mensagens agrupadas:', Object.keys(mensagensAgrupadas).length)
  console.log('📊 Conversa selecionada:', conversaSelecionada?.id)
  console.log('📊 Conversas disponíveis:', conversas.length)

  function ChatSection() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Lista de Conversas */}
        <Card className="lg:col-span-1">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span>Conversas</span>
              {totalMensagensNaoLidas > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {totalMensagensNaoLidas}
                </Badge>
              )}
            </CardTitle>
            <div className="relative">
              <Input
                placeholder="Filtrar conversas..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {conversasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversasFiltradas.map((conversa) => (
                    <div
                      key={conversa.id}
                      onClick={() => setConversaSelecionada(conversa)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 border-l-4 transition-all ${
                        conversaSelecionada?.id === conversa.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-transparent"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {conversa.colaboradores.join(" + ")}
                              </p>
                              <p className="text-xs text-gray-500">
                                {conversa.data} • Turno {conversa.turno}
                              </p>
                            </div>
                            {conversa.mensagensNaoLidas > 0 && (
                              <Badge variant="destructive" className="ml-2">
                                {conversa.mensagensNaoLidas}
                              </Badge>
                            )}
                          </div>
                          {conversa.ultimaMensagem && (
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {conversa.ultimaMensagem}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Área de Chat */}
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
                      ref={inputRef}
                      placeholder="Digite sua resposta..."
                      value={novaMensagem}
                      onChange={handleInputChange}
                      onKeyDown={handleChatKeyPress}
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
      </div>
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
                <h1 className="text-lg font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-sm text-gray-500 hidden sm:inline">Sistema de Bipagem Embalagem</p>
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

  // Se não estiver autenticado, não mostrar nada (está verificando)
  if (!isAuthenticated) {
    return null
  }
}
