import { useState, useEffect, useCallback } from 'react'
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
  session_id: string
}

export function useCarrosRealtime() {
  const [carros, setCarros] = useState<CarroStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isConnected, setIsConnected] = useState(false)

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
        
        // Converter para o formato esperado
        const carrosConvertidos = result.carros.map(carro => {
          console.log(`🔄 Convertendo carro ${carro.id} - Status: ${carro.status}`)
          
          return {
            carro_id: carro.id,
            nome_carro: `Carro ${carro.id}`,
            colaboradores: carro.colaboradores,
            data: carro.data,
            turno: carro.turno,
            destino_final: carro.destinoFinal,
            quantidade_nfs: carro.quantidadeNFs,
            total_volumes: carro.totalVolumes,
            data_criacao: carro.dataProducao,
            status_carro: carro.status as any || 'embalando',
            nfs: carro.nfs.map(nf => ({
              id: nf.id,
              numeroNF: nf.numeroNF,
              volume: nf.volume,
              fornecedor: nf.fornecedor,
              codigo: nf.codigo,
              codigoDestino: nf.destino,
              destinoFinal: nf.destino,
              tipo: nf.tipoCarga,
              codigoCompleto: nf.codigo,
              timestamp: carro.dataProducao,
              status: 'valida'
            })),
            estimativa_pallets: carro.estimativaPallets,
            session_id: ''
          }
        })
        
        console.log('✅ Carros convertidos:', carrosConvertidos.length)
        console.log('📊 Status dos carros convertidos:', carrosConvertidos.map(c => ({ id: c.carro_id, status: c.status_carro })))
        
        // Preservar estado local de carros que foram recentemente atualizados
        setCarros(prevCarros => {
          const carrosAtualizados = carrosConvertidos.map(carroConvertido => {
            const carroLocal = prevCarros.find(c => c.carro_id === carroConvertido.carro_id)
            
            // Se o carro local tem um status mais recente (lancado), preservar
            if (carroLocal && carroLocal.status_carro === 'lancado' && carroConvertido.status_carro !== 'lancado') {
              console.log(`🔄 Preservando status local 'lancado' para carro ${carroConvertido.carro_id}`)
              return {
                ...carroConvertido,
                status_carro: carroLocal.status_carro,
                numeros_sap: carroLocal.numeros_sap,
                data_finalizacao: carroLocal.data_finalizacao
              }
            }
            
            return carroConvertido
          })
          
          return carrosAtualizados
        })
        
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
  }, [converterNotasParaCarros])

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
    const heartbeat = setInterval(() => {
      carregarCarros()
    }, 15000) // Verificar a cada 15 segundos para sincronização mais frequente

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
        // Aumentar o delay para dar tempo do banco processar a atualização
        setTimeout(() => {
          console.log('🔄 Recarregando carros do banco para sincronização...')
          carregarCarros()
        }, 3000) // Aumentado para 3 segundos
        
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
      // Para excluir um carro, precisamos remover todas as suas notas
      
      // Recarregar carros para refletir mudanças
      await carregarCarros()
      
      return { success: true }
    } catch (err) {
      const errorMsg = 'Erro interno ao excluir carro'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const excluirNotaCarro = async (carroId: string, notaId: string) => {
    try {
      // Remover nota específica da tabela embalagem_notas_bipadas
      const result = await EmbalagemNotasBipadasService.removerNotaBipada(notaId)
      
      if (result.success) {
        // Recarregar carros para refletir mudanças
        await carregarCarros()
        return { success: true }
      } else {
        setError(result.error || 'Erro ao excluir nota do carro')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMsg = 'Erro interno ao excluir nota do carro'
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
    carrosPorStatus,
    buscarCarroPorId,
    estatisticas,
    recarregar: carregarCarros
  }
}
