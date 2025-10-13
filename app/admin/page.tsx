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
  KeyRound,
  ArrowLeft,
} from "lucide-react"
import ChangePasswordModal from "@/components/admin/change-password-modal"
import AdminNavbar from "@/components/admin/admin-navbar"

import GerenciarCarrosSection from "./components/gerenciar-carros-section"
import PesquisaNotasSection from "./components/pesquisa-notas-section"
import DashboardEstatisticas from "./components/dashboard-estatisticas"
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

  // Estado para armazenar dados da sessão do usuário
  const [sessionData, setSessionData] = useState<any>(null)

  // TODOS os outros Hooks vêm DEPOIS da verificação de autenticação
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<ChatMessage[]>([])
  const [novaMensagem, setNovaMensagem] = useState("")
  const [filtro, setFiltro] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [usuarioDigitando, setUsuarioDigitando] = useState(false)
  const [timeoutDigitacao, setTimeoutDigitacao] = useState<NodeJS.Timeout | null>(null)
  const [inputFocado, setInputFocado] = useState(false)
  const lastTsRef = useRef<string>("")


  // Debug do estado enviando
  useEffect(() => {
    console.log('🔄 Estado enviando mudou para:', enviando, 'Stack trace:', new Error().stack)
  }, [enviando])

  // Debug do estado digitando
  useEffect(() => {
    console.log('⌨️ Usuário digitando mudou para:', usuarioDigitando)
  }, [usuarioDigitando])

  const [ultimaAtualizacaoMensagens, setUltimaAtualizacaoMensagens] = useState<string>("")
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)


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

    // Restaurar seção ativa do localStorage
    const secaoSalva = localStorage.getItem("profarma_admin_active_section")
    if (secaoSalva) {
      console.log('🔄 Restaurando seção ativa:', secaoSalva)
      setActiveSection(secaoSalva)
    }
  }, [])

  const verificarAcessoAdmin = async () => {
    try {
      console.log('🔍 Verificando acesso admin...')

      // Primeiro tentar buscar sessão do banco usando o sistema corrigido
      try {
        const { useSession } = await import("@/hooks/use-database")
        const { useConnectivity } = await import("@/hooks/use-database")

        // Criar uma instância temporária dos hooks
        const sessionHook = useSession()
        const connectivityHook = useConnectivity()

        const session = await sessionHook.getSession("current")

        if (session) {
          console.log("📊 Sessão do banco encontrada:", session)

          // Verificar se é do setor de embalagem ou admin embalagem
          if (session.area !== "embalagem" && session.area !== "admin-embalagem") {
            console.log("❌ Acesso negado: usuário não é do setor de embalagem ou admin embalagem")
            setIsAuthenticated(false)
            return
          }

          // Se for admin embalagem, acesso direto permitido
          if (session.area === "admin-embalagem") {
            console.log("🔐 Usuário do setor Admin Embalagem detectado, acesso liberado")
            setSessionData(session)
            setIsAuthenticated(true)
            return
          }

          // Verificar se há um usuário "admin_crdk" na lista de colaboradores (apenas para setor embalagem)
          const hasAdminUser = session.colaboradores.some((colab: string) =>
            colab.toLowerCase().includes("admin_crdk")
          )

          if (!hasAdminUser) {
            console.log("❌ Acesso negado: usuário não é admin_crdk")
            setIsAuthenticated(false)
            return
          }

          // Se chegou até aqui, acesso direto permitido
          console.log("🔐 Usuário admin_crdk detectado, acesso liberado")
          setSessionData(session)
          setIsAuthenticated(true)
          return
        }
      } catch (error) {
        console.log("⚠️ Erro ao buscar sessão do banco, usando localStorage:", error)
      }

      // Fallback para localStorage
      const sessionData = localStorage.getItem("sistema_session")
      if (!sessionData) {
        console.log("❌ Nenhuma sessão encontrada")
        setIsAuthenticated(false)
        return
      }

      const session = JSON.parse(sessionData)
      console.log("📋 Sessão local encontrada:", session)

      // Verificar se é do setor de embalagem ou admin embalagem
      if (session.area !== "embalagem" && session.area !== "admin-embalagem") {
        console.log("❌ Acesso negado: usuário não é do setor de embalagem ou admin embalagem")
        setIsAuthenticated(false)
        return
      }

      // Se for admin embalagem, acesso direto permitido
      if (session.area === "admin-embalagem") {
        console.log("🔐 Usuário do setor Admin Embalagem detectado, acesso liberado")
        setSessionData(session)
        setIsAuthenticated(true)
        return
      }

      // Verificar se há um usuário "admin_crdk" na lista de colaboradores (apenas para setor embalagem)
      const hasAdminUser = session.colaboradores.some((colab: string) =>
        colab.toLowerCase().includes("admin_crdk")
      )

      if (!hasAdminUser) {
        console.log("❌ Acesso negado: usuário não é admin_crdk")
        setIsAuthenticated(false)
        return
      }

      // Se chegou até aqui, acesso direto permitido
      console.log("🔐 Usuário admin_crdk detectado, acesso liberado")
      setSessionData(session)
      setIsAuthenticated(true)
    } catch (error) {
      console.error("❌ Erro ao verificar acesso admin:", error)
      setIsAuthenticated(false)
    }
  }





  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    console.log('⌨️ Tecla pressionada:', e.key, 'enviando:', enviando)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      console.log('📤 Enter pressionado, chamando enviarMensagem')
      enviarMensagem()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    console.log('📝 Input change:', valor, 'enviando:', enviando, 'readOnly:', e.target.readOnly)
    setNovaMensagem(valor)

    // Marcar que usuário está digitando
    setUsuarioDigitando(true)

    // Limpar timeout anterior
    if (timeoutDigitacao) {
      clearTimeout(timeoutDigitacao)
    }

    // Definir novo timeout para resetar estado de digitação
    const novoTimeout = setTimeout(() => {
      console.log('⏰ Timeout de digitação - resetando estado')
      setUsuarioDigitando(false)
    }, 1000) // 1 segundo de inatividade (mais responsivo)

    setTimeoutDigitacao(novoTimeout)
  }

  const handleLogout = () => {
    // Limpar localStorage
    localStorage.clear();

    // Limpar sessionStorage
    sessionStorage.clear();

    // Limpar cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });

    // Limpar cache do navegador (se suportado)
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Redirecionar para a página inicial
    router.push("/");

    console.log("✅ Logout realizado com sucesso - Cache e cookies limpos");
  }


  const handleSectionChange = (section: string | null) => {
    setActiveSection(section)
    if (section) {
      localStorage.setItem("profarma_admin_active_section", section)
      console.log('💾 Seção salva no localStorage:', section)
    } else {
      localStorage.removeItem("profarma_admin_active_section")
      console.log('🗑️ Seção removida do localStorage')
    }
  }


  const carregarConversas = useCallback(async () => {
    try {
      console.log('🔍 Carregando conversas coletivas do Supabase...')

      // **Padrão seguro**: use client local
      const client = supabase ?? getSupabase()
      if (!supabase) setSupabase(client)

      // Buscar todas as mensagens para criar conversas coletivas
      const { data: allMessages, error } = await client
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar mensagens do Supabase:', error)
        setConversas([])
        return
      }

      if (!allMessages || allMessages.length === 0) {
        console.log('ℹ️ Nenhuma mensagem encontrada no Supabase')
        setConversas([])
        return
      }

      console.log('📊 Mensagens encontradas:', allMessages.length)

      // Agrupar mensagens por conversa coletiva (data + turno)
      const conversasMap = new Map()

      allMessages.forEach((msg: any) => {
        // Usar a mesma lógica do setor embalagem: chat_coletivo_${data}_${turno}
        let conversaId = msg.remetente_id

        // Se for mensagem do admin, usar o destinatario_id
        if (msg.remetente_tipo === 'admin') {
          conversaId = msg.destinatario_id
        }

        // Extrair data e turno do ID da conversa (formato: chat_coletivo_YYYY-MM-DD_turno)
        const match = conversaId.match(/chat_coletivo_(\d{4}-\d{2}-\d{2})_(.+)/)
        if (!match) {
          console.log('⚠️ ID de conversa não reconhecido:', conversaId)
          return
        }

        const [, data, turno] = match
        const idConversaColetiva = `chat_coletivo_${data}_${turno}`

        if (!conversasMap.has(idConversaColetiva)) {
          console.log('🔍 Criando conversa coletiva:', {
            idConversaColetiva,
            data,
            turno,
            remetente_tipo: msg.remetente_tipo,
            remetente_nome: msg.remetente_nome
          })

          conversasMap.set(idConversaColetiva, {
            id: idConversaColetiva,
            colaboradores: msg.remetente_tipo === 'colaborador' ? [msg.remetente_nome] : ['Colaboradores'],
            data: data,
            turno: turno,
            ultimaMensagem: msg.mensagem,
            ultimoTimestamp: msg.timestamp,
            mensagensNaoLidas: msg.remetente_tipo === 'colaborador' && !msg.lida ? 1 : 0
          })
        } else {
          const conversa = conversasMap.get(idConversaColetiva)
          if (msg.timestamp > conversa.ultimoTimestamp) {
            conversa.ultimaMensagem = msg.mensagem
            conversa.ultimoTimestamp = msg.timestamp
          }
          if (msg.remetente_tipo === 'colaborador' && !msg.lida) {
            conversa.mensagensNaoLidas++
          }

          // Atualizar lista de colaboradores se necessário
          if (msg.remetente_tipo === 'colaborador' && !conversa.colaboradores.includes(msg.remetente_nome)) {
            conversa.colaboradores.push(msg.remetente_nome)
          }
        }
      })

      const conversasArray = Array.from(conversasMap.values())
      console.log('📊 Conversas coletivas criadas:', conversasArray.length)
      console.log('📋 Conversas:', conversasArray)

      // Salvar no localStorage
      const chaveListaGeral = "profarma_conversas_admin"
      localStorage.setItem(chaveListaGeral, JSON.stringify(conversasArray))

      // Preservar a conversa selecionada se ela ainda existir
      if (conversaSelecionada) {
        const conversaAtualizada = conversasArray.find((c: Conversa) => c.id === conversaSelecionada.id)
        if (conversaAtualizada) {
          // Só atualizar se houver mudanças reais
          const hasChanges = JSON.stringify(conversaSelecionada) !== JSON.stringify(conversaAtualizada)
          if (hasChanges) {
            console.log('🔄 Atualizando conversa selecionada do Supabase:', conversaAtualizada)
            setConversaSelecionada(conversaAtualizada)
          } else {
            console.log('ℹ️ Conversa selecionada sem mudanças, mantendo estado atual')
          }
        } else {
          console.log('⚠️ Conversa selecionada não encontrada nas conversas do Supabase')
          setConversaSelecionada(null)
        }
      }

      const ultimoTs = conversasArray.length ? conversasArray[conversasArray.length - 1].ultimoTimestamp : ""
      const hasChanges = ultimoTs !== lastTsRef.current

      if (hasChanges) {
        lastTsRef.current = ultimoTs
        setUltimaAtualizacaoMensagens(ultimoTs)
      } else {
        console.log('ℹ️ Nenhuma mudança nas conversas, mantendo estado atual')
      }
      setConversas(conversasArray)

    } catch (error) {
      console.error('❌ Erro ao carregar conversas do Supabase:', error)
      setConversas([])
    }
  }, [supabase, conversaSelecionada])

  // useEffect para carregar conversas
  useEffect(() => {
    if (isAuthenticated) {
      carregarConversas()
      // Polling para atualizações em tempo real (a cada 5 minutos)
      const interval = setInterval(carregarConversas, 300000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])



  const atualizarContadorConversa = useCallback((conversaId: string) => {
    // Atualizar contador localmente
    setConversas(prevConversas =>
      prevConversas.map(conversa =>
        conversa.id === conversaId
          ? { ...conversa, mensagensNaoLidas: 0 }
          : conversa
      )
    )
  }, [])

  const carregarMensagens = useCallback(async (conversaId: string) => {
    try {
      // **Padrão seguro**: use client local
      const client = supabase ?? getSupabase()
      if (!supabase) setSupabase(client)

      console.log('🔍 Carregando mensagens da conversa coletiva:', conversaId)
      console.log('🔍 Query SQL que será executada:', `remetente_id.eq.${conversaId},destinatario_id.eq.${conversaId}`)

      // Buscar mensagens da conversa coletiva usando a mesma lógica do setor embalagem
      const { data: supabaseMessages, error } = await client
        .from('messages')
        .select('*')
        .or(`remetente_id.eq.${conversaId},destinatario_id.eq.${conversaId}`)
        .order('timestamp', { ascending: true })

      console.log('📊 Mensagens encontradas no Supabase:', supabaseMessages?.length || 0)
      console.log('📊 Dados brutos do Supabase:', supabaseMessages)

      if (error) {
        console.error('❌ Erro ao carregar mensagens do Supabase:', error)
        setMensagens([])
        return
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

        console.log('📊 Mensagens processadas:', mensagensArray.length)
        console.log('📊 Primeira mensagem processada:', mensagensArray[0])
        console.log('📊 Última mensagem processada:', mensagensArray[mensagensArray.length - 1])

        // Sempre atualizar as mensagens quando carregar uma nova conversa
        console.log('🔄 Atualizando estado das mensagens...')
        setMensagens(mensagensArray)
        setUltimaAtualizacaoMensagens(mensagensArray.length > 0 ? mensagensArray[mensagensArray.length - 1].timestamp : "")

        // Marcar mensagens dos colaboradores como lida
        const idsParaMarcar = mensagensArray
          .filter((m) => m.remetenteTipo === "colaborador" && !m.lida)
          .map((m) => m.id)

        if (idsParaMarcar.length > 0) {
          console.log('📝 Marcando mensagens como lidas:', idsParaMarcar.length)

          // Atualizar estado local (sinalizando lidas)
          const mensagensAtualizadas = mensagensArray.map((msg) =>
            msg.remetenteTipo === "colaborador" ? { ...msg, lida: true } : msg
          )

          setMensagens(mensagensAtualizadas)
          atualizarContadorConversa(conversaId)

          // Marcar como lida no Supabase (em lote)
          const { error: updateError } = await client
            .from('messages')
            .update({ lida: true })
            .in('id', idsParaMarcar)

          if (updateError) {
            console.error('❌ Erro ao marcar mensagens como lidas:', updateError)
          }
        }
      } else {
        console.log('⚠️ Nenhuma mensagem encontrada para exibir')
        setMensagens([])
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error)
      setMensagens([])
    }
  }, [supabase, atualizarContadorConversa])

  // useEffect para carregar mensagens da conversa selecionada
  useEffect(() => {
    if (isAuthenticated && conversaSelecionada) {
      const conversaId = conversaSelecionada.id
      console.log('🔄 useEffect: Carregando mensagens iniciais para conversa:', conversaId)
      console.log('🔄 useEffect: Estado atual das mensagens antes do carregamento:', mensagens.length)
      carregarMensagens(conversaId)
    } else {
      console.log('🔄 useEffect: Condições não atendidas para carregar mensagens:', {
        isAuthenticated,
        conversaSelecionada: !!conversaSelecionada,
        conversaId: conversaSelecionada?.id
      })
    }
  }, [isAuthenticated, conversaSelecionada?.id])

  // useEffect separado para gerenciar polling baseado no estado de digitação
  useEffect(() => {
    if (isAuthenticated && conversaSelecionada && !usuarioDigitando && !enviando && !inputFocado) {
      const conversaId = conversaSelecionada.id
      const interval = setInterval(() => {
        console.log('🔄 Polling de mensagens executando...')
        carregarMensagens(conversaId)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, conversaSelecionada?.id, carregarMensagens, usuarioDigitando, enviando, inputFocado])

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada || enviando) return

    console.log('📤 Iniciando envio de mensagem coletiva, setEnviando(true)')
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
        destinatarioId: conversaSelecionada.id, // ID da conversa coletiva (chat_coletivo_YYYY-MM-DD_turno)
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

      console.log('📤 Enviando mensagem coletiva para o Supabase:', mensagemParaSupabase)

      const { error } = await client
        .from('messages')
        .insert([mensagemParaSupabase])

      if (error) {
        console.error('❌ Erro ao enviar mensagem para o Supabase:', error)
        alert('Erro ao enviar mensagem: ' + error.message)
        console.log('❌ Erro no envio, setEnviando(false)')
        setEnviando(false)
        return
      }

      console.log('✅ Mensagem coletiva enviada com sucesso para o Supabase')

      // Adicionar à lista local
      const novasMensagens = [...mensagens, mensagem]
      setMensagens(novasMensagens)
      setUltimaAtualizacaoMensagens(mensagem.timestamp)

      // Atualizar lista de conversas localmente
      setConversas(prevConversas =>
        prevConversas.map(conversa =>
          conversa.id === conversaSelecionada.id
            ? {
              ...conversa,
              ultimaMensagem: mensagem.mensagem,
              ultimoTimestamp: mensagem.timestamp
            }
            : conversa
        )
      )

      setNovaMensagem("")
      setUsuarioDigitando(false) // Resetar estado de digitação
      console.log('✅ Mensagem coletiva processada com sucesso')

      // Restaurar foco no input após enviar mensagem
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
      alert('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      console.log('✅ Finalizando envio, setEnviando(false)')
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
  console.log('📊 Array de mensagens:', mensagens)
  console.log('📊 Objeto mensagensAgrupadas:', mensagensAgrupadas)

  function ChatSection() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Lista de Conversas */}
        <Card className="lg:col-span-1">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span>Chats Coletivos</span>
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
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {conversasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversasFiltradas.map((conversa) => (
                    <div
                      key={conversa.id}
                      onClick={() => setConversaSelecionada(conversa)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 transition-all ${conversaSelecionada?.id === conversa.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-transparent"
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {conversa.colaboradores.join(" + ")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
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
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
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
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {conversaSelecionada.data} • Turno {conversaSelecionada.turno}
                </div>
              </CardHeader>

              <CardContent className="p-0 flex flex-col h-[500px]">
                {/* Mensagens */}
                <ScrollArea className="flex-1 p-4">
                  {(() => {
                    console.log('🔍 Renderizando mensagens - Debug:', {
                      mensagensLength: mensagens.length,
                      mensagensAgrupadasKeys: Object.keys(mensagensAgrupadas).length,
                      mensagensAgrupadas: mensagensAgrupadas,
                      conversaSelecionada: conversaSelecionada?.id
                    })
                    return null
                  })()}
                  {Object.keys(mensagensAgrupadas).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p>Nenhuma mensagem ainda.</p>
                      <p className="text-xs mt-2">Debug: {mensagens.length} mensagens carregadas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(mensagensAgrupadas).map(([data, mensagensData]: [string, any]) => (
                        <div key={data}>
                          {/* Separador de data */}
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">{data}</div>
                          </div>

                          {/* Mensagens do dia */}
                          <div className="space-y-3">
                            {mensagensData.map((mensagem: ChatMessage) => (
                              <div
                                key={mensagem.id}
                                className={`flex ${mensagem.remetenteTipo === "admin" ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-3 py-2 ${mensagem.remetenteTipo === "admin"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                                    className={`flex items-center justify-end space-x-1 mt-1 text-xs ${mensagem.remetenteTipo === "admin" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
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
                <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
                  <div className="flex space-x-2">
                    <Input
                      ref={inputRef}
                      placeholder="Digite sua mensagem..."
                      value={novaMensagem}
                      onChange={(e) => setNovaMensagem(e.target.value)}
                      onKeyPress={handleChatKeyPress}
                      disabled={enviando}
                      className="flex-1"
                    />
                    <Button
                       onClick={enviarMensagem}
                       disabled={!novaMensagem.trim() || enviando}
                      // disabled={!novaMensagem.trim() || enviando} // desabilite só o botão
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {enviando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pressione Enter para enviar</p>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px]">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
                <p>Escolha uma conversa da lista ao lado para começar a responder</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }


  // Se não estiver autenticado, mostrar tela de acesso negado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Você não tem permissão para acessar esta área.</p>
          <Button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700">
            Voltar ao Início
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <AdminNavbar
        sessionData={sessionData}
        onLogout={handleLogout}
        onPasswordChange={() => setShowChangePassword(true)}
        onBackToMain={() => setActiveSection(null)}
        showBackButton={activeSection !== null}
      />

      {/* Botão flutuante para chat interno */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => handleSectionChange("chat")}
          className="relative bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          size="lg"
        >
          <MessageCircle className="h-6 w-6" />

          {/* Alerta vermelho com número de mensagens não lidas */}
          {totalMensagensNaoLidas > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
              {totalMensagensNaoLidas > 99 ? '99+' : totalMensagensNaoLidas}
            </div>
          )}
        </Button>
      </div>

      {!activeSection ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Gerenciar Carros */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-300 dark:bg-gray-900 dark:border-blue-500/50 dark:hover:border-blue-300">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:border-blue-500/50">
                    <Truck className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Gerenciar Carros</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-6">Visualizar, excluir, gerenciar e lançar</p>
                <Button
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleSectionChange("gerenciar-carros")}
                >
                  Gerenciar Carros
                </Button>
              </CardContent>
            </Card>

            {/* Chat Interno */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-indigo-300 dark:bg-gray-900 dark:border-indigo-500/50 dark:hover:border-indigo-300">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-indigo-100 rounded-full dark:bg-indigo-900/30 dark:border-indigo-500/50">
                    <MessageSquare className="h-12 w-12 text-indigo-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Chat Coletivo</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-6">Comunicação e suporte em tempo real</p>
                <Button
                  className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => handleSectionChange("chat")}
                >
                  Abrir Chat Coletivo
                </Button>
              </CardContent>
            </Card>

            {/* Relatórios */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-green-300 dark:bg-gray-900 dark:border-green-500/50 dark:hover:border-green-300">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-green-100 rounded-full dark:bg-green-900/30 dark:border-green-500/50">
                    <BarChart3 className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-6">Estatísticas, produtividade e destaques</p>
                <Button
                  className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                  onClick={() => handleSectionChange("relatorios")}
                >
                  Abrir Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      ) : (
        <div>
          {/* Botão Voltar ao Menu Principal */}
          {/* <div className="pt-20 pb-4 px-4 sm:px-6 lg:px-8">
            <Button
              variant="outline"
              onClick={() => setActiveSection(null)}
              className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border- gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Menu Principal</span>
            </Button>
          </div> */}

          {activeSection === "chat" && (
            <div className="max-w-[80%] mx-auto pt-24">
              <ChatSection />
            </div>
          )}
          {activeSection === "gerenciar-carros" && (
            <div className="pt-24">
              <GerenciarCarrosSection />
            </div>
          )}
          {activeSection === "relatorios" && (
            <div className="max-w-[80%] mx-auto pt-24">
              <DashboardEstatisticas />
            </div>
          )}
        </div>
      )}

      {/* Modal de Alterar Senha */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        usuario={sessionData?.colaboradores?.[0] || "admin_embalagem"}
        area={sessionData?.area || "admin-embalagem"}
        onSuccess={() => {
          alert("Senha alterada com sucesso!")
        }}
      />
    </div>
  )
}
