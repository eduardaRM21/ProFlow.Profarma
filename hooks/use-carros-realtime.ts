import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { EmbalagemNotasBipadasService, EmbalagemNotaBipada } from '@/lib/embalagem-notas-bipadas-service'

// Interface para carro baseada na tabela embalagem_notas_bipadas
export interface CarroStatus {
  carro_id: string
  nome_carro: string
  colaboradores: string[]
  data: string
  turno: string
  destino_final: string
  quantidade_nfs: number
  total_volumes: number
  data_criacao: string
  data_finalizacao?: string
  numeros_sap?: string[]
  status_carro: 'embalando' | 'divergencia' | 'aguardando_lancamento' | 'pronto' | 'em_producao' | 'finalizado' | 'lancado'
  nfs: any[]
  estimativa_pallets: number
  posicoes?: number | null;
  palletes?: number | null;
  gaiolas?: number | null;
  caixas_mangas?: number | null;
  palletes_reais?: number
  session_id: string
}

export function useCarrosRealtime() {
  const [carros, setCarros] = useState<CarroStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isConnected, setIsConnected] = useState(false)
  
  // Referência para controlar IDs de carros já notificados
  const carrosNotificadosRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Função para reproduzir áudio de notificação
  const reproduzirNotificacao = useCallback(() => {
    try {
      // Criar elemento de áudio se não existir
      if (!audioRef.current) {
        audioRef.current = new Audio('/new-notification-embalagem.mp3')
        audioRef.current.preload = 'auto'
      }
      
      // Reproduzir o áudio
      audioRef.current.play().catch(error => {
        console.warn('⚠️ Erro ao reproduzir áudio de notificação:', error)
      })
      
    } catch (error) {
      console.warn('⚠️ Erro ao configurar áudio de notificação:', error)
    }
  }, [])

  // Converter notas bipadas para formato de carros
  const converterNotasParaCarros = useCallback((notas: EmbalagemNotaBipada[]): CarroStatus[] => {
    const carrosMap = new Map<string, CarroStatus>()

    notas.forEach((nota) => {
      if (!nota.carro_id) return

      if (!carrosMap.has(nota.carro_id)) {
        // Criar novo carro
        carrosMap.set(nota.carro_id, {
          carro_id: nota.carro_id,
          nome_carro: `Carro ${nota.carro_id}`,
          colaboradores: nota.colaboradores ? nota.colaboradores.split(',').map(c => c.trim()) : [],
          data: nota.data,
          turno: nota.turno,
          destino_final: nota.destino,
          quantidade_nfs: 0,
          total_volumes: 0,
          data_criacao: nota.timestamp_bipagem || nota.created_at || new Date().toISOString(),
          status_carro: 'embalando',
          nfs: [],
          estimativa_pallets: 0,
          session_id: nota.session_id
        })
      }

      const carro = carrosMap.get(nota.carro_id)!
      
      // Adicionar NF ao carro
      carro.nfs.push({
        id: nota.id || '',
        numeroNF: nota.numero_nf,
        volume: nota.volumes,
        fornecedor: nota.fornecedor,
        codigo: nota.codigo_completo,
        codigoDestino: nota.destino,
        destinoFinal: nota.destino,
        tipo: nota.tipo_carga,
        codigoCompleto: nota.codigo_completo,
        timestamp: nota.timestamp_bipagem || nota.created_at || new Date().toISOString(),
        status: nota.status === 'bipada' ? 'valida' : 'invalida'
      })

      // Atualizar contadores
      carro.quantidade_nfs = carro.nfs.length
      carro.total_volumes = carro.nfs.reduce((sum, nf) => sum + (nf.volume || 0), 0)
      carro.estimativa_pallets = Math.ceil(carro.total_volumes / 100) // Estimativa: 100 volumes por pallet
    })

    return Array.from(carrosMap.values())
  }, [])

  // Carregar carros iniciais
  const carregarCarros = useCallback(async () => {
    try {
      setLoading(true)
      
      // Buscar todas as notas bipadas da tabela embalagem_notas_bipadas
      const result = await EmbalagemNotasBipadasService.buscarCarrosProduzidos()
      
      if (result.success && result.carros) {
        console.log('📋 Carros recebidos do banco:', result.carros.length)
        
        // Detectar novos carros comparando com os já notificados
        const carrosAtuais = result.carros.map(carro => carro.id)
        const carrosNovos = carrosAtuais.filter(carroId => !carrosNotificadosRef.current.has(carroId))
        
        // Se há novos carros, reproduzir notificação
        if (carrosNovos.length > 0) {
          console.log('🆕 Novos carros detectados:', carrosNovos)
          reproduzirNotificacao()
          
          // Adicionar novos carros à lista de notificados
          carrosNovos.forEach(carroId => {
            carrosNotificadosRef.current.add(carroId)
          })
        }
        
                 // Converter para o formato esperado
         const carrosConvertidos = result.carros.map(carro => {
           console.log(`🔄 Convertendo carro ${carro.id} - Status: ${carro.status}`)
           console.log(`📋 NFs do carro:`, carro.nfs)
           
                       // Determinar o nome do carro baseado nos números SAP ou usar o padrão
            let nomeCarro = `Carro ${carro.id}` // Nome padrão
            
            // Se o carro tem números SAP, usar o primeiro como nome
            if (carro.numeros_sap && carro.numeros_sap.length > 0) {
              const numeroSAP = carro.numeros_sap[0]
              nomeCarro = `Carro ${numeroSAP}`
              console.log(`🔄 Carro ${carro.id} tem número SAP: ${numeroSAP} - Nome: ${nomeCarro}`)
            }
            
            // Se o carro já tem um nome personalizado no banco, usar esse nome
            if (carro.nome_carro && carro.nome_carro !== `Carro ${carro.id}`) {
              nomeCarro = carro.nome_carro
              console.log(`🔄 Carro ${carro.id} já tem nome personalizado: ${nomeCarro}`)
            }
           
                        return {
               carro_id: carro.id,
               nome_carro: nomeCarro, // Nome baseado nos números SAP ou padrão
               colaboradores: carro.colaboradores,
               data: carro.data,
               turno: carro.turno,
               destino_final: carro.destinoFinal,
               quantidade_nfs: carro.quantidadeNFs,
               total_volumes: carro.totalVolumes,
               data_criacao: carro.dataProducao,
               status_carro: carro.status as any || 'embalando',
               numeros_sap: carro.numeros_sap || [], // Incluir números SAP
               data_finalizacao: carro.dataFinalizacao,
               nfs: carro.nfs.map(nf => ({
                 id: nf.id,
                 numeroNF: nf.numeroNF || '', // Campo principal
                 volume: nf.volume || 0,
                 fornecedor: nf.fornecedor || '',
                 codigo: nf.codigo || '',
                 codigoDestino: nf.destino || '',
                 destinoFinal: nf.destino || '',
                 tipo: nf.tipoCarga || '', // Campo principal
                 codigoCompleto: nf.codigo || '',
                 timestamp: carro.dataProducao,
                 status: 'valida'
               })),
               estimativa_pallets: carro.estimativaPallets,
               posicoes: (carro as any).posicoes || null,
               palletes_reais: (carro as any).palletesReais || 0,
               session_id: ''
             }
         })
        
        console.log('✅ Carros convertidos:', carrosConvertidos.length)
        console.log('📊 Status dos carros convertidos:', carrosConvertidos.map(c => ({ id: c.carro_id, status: c.status_carro })))
        
                 // Usar diretamente os carros convertidos do banco (nome já está correto baseado nos números SAP)
         setCarros(carrosConvertidos)
        
        setError(null)
        setLastUpdate(new Date())
      } else {
        setError(result.error || 'Erro ao carregar carros')
      }
    } catch (err) {
      setError('Erro interno ao carregar carros')
    } finally {
      setLoading(false)
    }
  }, [converterNotasParaCarros, reproduzirNotificacao])

  // Configurar subscription em tempo real
  useEffect(() => {
    const supabase = getSupabase()
    
    // Carregar dados iniciais
    carregarCarros()

    // Configurar subscription para mudanças na tabela embalagem_notas_bipadas
    const subscription = supabase
      .channel('embalagem_notas_bipadas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'embalagem_notas_bipadas'
        },
        (payload) => {
          setIsConnected(true)
          setLastUpdate(new Date())
          
          // Recarregar carros quando houver mudanças
          carregarCarros()
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Configurar heartbeat para verificar conectividade e sincronizar
    // Reduzido para 2 minutos para diminuir egress do banco
    const heartbeat = setInterval(() => {
      carregarCarros()
    }, 120000) // Verificar a cada 2 minutos para reduzir egress

    // Cleanup da subscription e heartbeat
    return () => {
      subscription.unsubscribe()
      clearInterval(heartbeat)
    }
  }, [carregarCarros])

  // Funções para manipular carros (adaptadas para embalagem_notas_bipadas)
  const salvarCarro = async (carro: CarroStatus) => {
    try {
      // Para a tabela embalagem_notas_bipadas, não salvamos carros diretamente
      // Os carros são criados automaticamente quando as notas são bipadas
      return { success: true }
    } catch (err) {
      const errorMsg = 'Erro interno ao salvar carro'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const atualizarStatusCarro = async (carroId: string, updates: any) => {
    try {
      // Atualizar status das notas do carro na tabela embalagem_notas_bipadas
      const result = await EmbalagemNotasBipadasService.atualizarStatusCarro(
        carroId, 
        updates.status_carro || 'embalando',
        {
          numeros_sap: updates.numeros_sap,
          data_finalizacao: updates.data_finalizacao,
          novo_carro_id: updates.novo_carro_id
        }
      )
      
      if (result.success) {
        console.log('🔄 Atualizando estado local do carro:', carroId)
        console.log('📊 Novo status:', updates.status_carro)
        console.log('🔑 Novos números SAP:', updates.numeros_sap)
        
        // Atualizar o estado local imediatamente para feedback instantâneo
        setCarros(prevCarros => 
          prevCarros.map(carro => 
            carro.carro_id === carroId 
              ? { 
                  ...carro, 
                  status_carro: updates.status_carro || carro.status_carro,
                  numeros_sap: updates.numeros_sap || carro.numeros_sap,
                  data_finalizacao: updates.data_finalizacao || carro.data_finalizacao
                }
              : carro
          )
        )
        
        console.log('✅ Estado local atualizado com sucesso')
        
        // Recarregar carros do banco para sincronizar com outros usuários
        // Reduzir frequência de sincronização para diminuir egress
        setTimeout(() => {
          console.log('🔄 Recarregando carros do banco para sincronização...')
          carregarCarros()
        }, 10000) // Aumentado para 10 segundos para reduzir egress
        
        return { success: true }
      } else {
        setError(result.error || 'Erro ao atualizar status do carro')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMsg = 'Erro interno ao atualizar status do carro'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const excluirCarro = async (carroId: string) => {
    try {
      console.log(`🗑️ [HOOK] Iniciando exclusão do carro ${carroId}`)
      console.log(`🗑️ [HOOK] Excluindo carro ${carroId} do banco de dados`)
      
      if (!carroId) {
        console.error('❌ [HOOK] ID do carro é undefined ou vazio')
        return { success: false, error: 'ID do carro é obrigatório' }
      }
      
      // Usar o serviço para excluir o carro e todas as suas notas
      console.log(`🔄 [HOOK] Chamando EmbalagemNotasBipadasService.excluirCarro(${carroId})`)
      const result = await EmbalagemNotasBipadasService.excluirCarro(carroId)
      console.log(`📊 [HOOK] Resultado do serviço:`, result)
      
      if (result.success) {
        // Remover o carro do estado local imediatamente
        console.log(`🔄 [HOOK] Removendo carro ${carroId} do estado local`)
        setCarros(prevCarros => {
          const carrosFiltrados = prevCarros.filter(carro => carro.carro_id !== carroId)
          console.log(`📊 [HOOK] Estado local atualizado: ${prevCarros.length} -> ${carrosFiltrados.length} carros`)
          return carrosFiltrados
        })
        
        console.log('✅ [HOOK] Carro excluído com sucesso do banco e estado local')
        
        // Recarregar carros para sincronizar com outros usuários
        setTimeout(() => {
          console.log('🔄 [HOOK] Recarregando carros para sincronização global...')
          carregarCarros()
        }, 500)
        
        return { success: true }
      } else {
        console.error('❌ [HOOK] Erro ao excluir carro:', result.error)
        setError(result.error || 'Erro ao excluir carro')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMsg = 'Erro interno ao excluir carro'
      console.error('❌ [HOOK] Erro inesperado ao excluir carro:', err)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const excluirNotaCarro = async (carroId: string, notaId: string) => {
    try {
      console.log(`🗑️ [HOOK] Iniciando exclusão da nota ${notaId} do carro ${carroId}`)
      
      // Remover nota específica da tabela embalagem_notas_bipadas
      console.log(`🔄 [HOOK] Chamando EmbalagemNotasBipadasService.removerNotaBipada(${notaId})`)
      const result = await EmbalagemNotasBipadasService.removerNotaBipada(notaId)
      console.log(`📊 [HOOK] Resultado da remoção da nota:`, result)
      
      if (result.success) {
        console.log('✅ [HOOK] Nota removida com sucesso do banco, recarregando carros...')
        // Recarregar carros para refletir mudanças
        await carregarCarros()
        console.log('✅ [HOOK] Carros recarregados com sucesso')
        return { success: true }
      } else {
        console.error('❌ [HOOK] Erro ao remover nota:', result.error)
        setError(result.error || 'Erro ao excluir nota do carro')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMsg = 'Erro interno ao excluir nota do carro'
      console.error('❌ [HOOK] Erro inesperado ao excluir nota:', err)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const lancarCarro = async (carroId: string, numerosSAP: string[]) => {
    try {
      console.log(`🚀 Lançando carro ${carroId} com números SAP:`, numerosSAP)
      
      // Usar o serviço para lançar o carro
      const result = await EmbalagemNotasBipadasService.lancarCarro(carroId, numerosSAP)
      
      if (result.success) {
        // Atualizar o estado local imediatamente para feedback instantâneo
        setCarros(prevCarros => 
          prevCarros.map(carro => 
            carro.carro_id === carroId 
              ? { 
                  ...carro, 
                  status_carro: 'lancado',
                  nome_carro: `Carro ${result.numeroCarro || carroId}`,
                  numeros_sap: numerosSAP,
                  data_finalizacao: new Date().toISOString()
                }
              : carro
          )
        )
        
        console.log('✅ Estado local atualizado com sucesso')
        
        // Recarregar carros do banco para sincronizar com outros usuários
        // Aumentar delay para reduzir egress do banco
        setTimeout(() => {
          console.log('🔄 Recarregando carros do banco para sincronização global...')
          carregarCarros()
        }, 5000) // Aumentado para 5 segundos para reduzir egress
        
        return { success: true, numeroCarro: result.numeroCarro }
      } else {
        setError(result.error || 'Erro ao lançar carro')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMsg = 'Erro interno ao lançar carro'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  // Filtrar carros por status
  const carrosPorStatus = (status: string) => {
    return carros.filter(carro => carro.status_carro === status)
  }

  // Buscar carro por ID
  const buscarCarroPorId = (carroId: string) => {
    return carros.find(carro => carro.carro_id === carroId)
  }


  // Estatísticas
  const estatisticas = {
    total: carros.length,
    embalando: carros.filter(c => c.status_carro === 'embalando').length,
    divergencia: carros.filter(c => c.status_carro === 'divergencia').length,
    aguardandoLancamento: carros.filter(c => c.status_carro === 'aguardando_lancamento').length,
    finalizados: carros.filter(c => c.status_carro === 'finalizado').length,
    lancados: carros.filter(c => c.status_carro === 'lancado').length,
    totalNFs: carros.reduce((sum, c) => sum + c.quantidade_nfs, 0),
    totalVolumes: carros.reduce((sum, c) => sum + c.total_volumes, 0),
  }

  return {
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
    carrosPorStatus,
    buscarCarroPorId,
    estatisticas,
    recarregar: carregarCarros,
    reproduzirNotificacao
  }
}
