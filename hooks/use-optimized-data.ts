import useSWR from 'swr'
import { getSupabase } from '@/lib/supabase-client'

// =====================================================
// CONFIGURAÇÕES GLOBAIS DO SWR
// =====================================================

const SWR_CONFIG = {
  revalidateOnFocus: false, // Não revalidar ao focar na janela
  revalidateOnReconnect: true, // Revalidar ao reconectar
  dedupingInterval: 10000, // Deduplicar requisições por 10s
  errorRetryCount: 3, // Tentar 3 vezes em caso de erro
  errorRetryInterval: 5000, // Intervalo de 5s entre tentativas
}

// =====================================================
// FETCHERS OTIMIZADOS
// =====================================================

// Fetcher para divergências com cache inteligente
const fetchDivergencias = async (key: string) => {
  const [, notaFiscalId, relatorioId] = key.split('_')
  const supabase = getSupabase()
  
  if (notaFiscalId && notaFiscalId !== 'all') {
    // Buscar divergências de uma nota específica
    const { data, error } = await supabase
      .from('divergencias')
      .select('*')
      .eq('nota_fiscal_id', notaFiscalId)
    
    if (error) throw error
    return data || []
  }
  
  if (relatorioId && relatorioId !== 'all') {
    // Buscar divergências de um relatório com processamento otimizado
    const { data: relatorioNotas } = await supabase
      .from('relatorio_notas')
      .select('nota_fiscal_id')
      .eq('relatorio_id', relatorioId)
    
    if (relatorioNotas && relatorioNotas.length > 0) {
      const notaIds = relatorioNotas.map(rn => rn.nota_fiscal_id)
      
      // Usar lotes muito pequenos para evitar problemas de URL
      const BATCH_SIZE = 5
      const batches = []
      for (let i = 0; i < notaIds.length; i += BATCH_SIZE) {
        batches.push(notaIds.slice(i, i + BATCH_SIZE))
      }
      
      console.log(`🔍 Processando ${notaIds.length} notas em ${batches.length} lotes de ${BATCH_SIZE}`)
      
      const allDivergencias = []
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        try {
          console.log(`🔍 Processando lote ${i + 1}/${batches.length} (${batch.length} IDs)`)
          
          const { data: batchData, error: batchError } = await supabase
            .from('divergencias')
            .select('*')
            .in('nota_fiscal_id', batch)
          
          if (batchError) {
            console.warn(`⚠️ Erro no lote ${i + 1}:`, batchError.message)
            errorCount++
            continue
          }
          
          if (batchData && batchData.length > 0) {
            allDivergencias.push(...batchData)
            successCount++
            console.log(`✅ Lote ${i + 1}: ${batchData.length} divergências encontradas`)
          } else {
            console.log(`ℹ️ Lote ${i + 1}: nenhuma divergência encontrada`)
          }
          
          // Delay progressivo entre requisições para evitar sobrecarga
          if (i < batches.length - 1) {
            const delay = Math.min(1000, 200 + (i * 50)) // Aumenta delay progressivamente
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          
        } catch (fetchError) {
          console.warn(`⚠️ Erro de conectividade no lote ${i + 1}:`, (fetchError as Error).message)
          errorCount++
          
          // Delay maior em caso de erro
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      }
      
      console.log(`📊 Processamento concluído: ${successCount} lotes sucesso, ${errorCount} erros, ${allDivergencias.length} divergências totais`)
      
      return allDivergencias
    }
    return []
  }
  
  // Buscar todas as divergências
  const { data, error } = await supabase
    .from('divergencias')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100) // Limitar a 100 registros para performance
  
  if (error) throw error
  return data || []
}

// Fetcher para carros com dados otimizados
const fetchCarros = async () => {
  const supabase = getSupabase()
  
  // Buscar apenas campos necessários para performance
  const { data, error } = await supabase
    .from('embalagem_notas_bipadas')
    .select(`
      carro_id,
      nome_carro,
      colaboradores,
      data,
      turno,
      destino,
      status,
      numeros_sap,
      data_finalizacao,
      posicoes,
      palletes,
      gaiolas,
      caixas_mangas,
      palletes_reais,
      session_id,
      created_at
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  // Processar dados em memória para criar carros
  const carrosMap = new Map()
  
  data?.forEach((nota) => {
    if (!nota.carro_id) return
    
    if (!carrosMap.has(nota.carro_id)) {
      carrosMap.set(nota.carro_id, {
        carro_id: nota.carro_id,
        nome_carro: nota.nome_carro || `Carro ${nota.carro_id}`,
        colaboradores: typeof nota.colaboradores === 'string' ? nota.colaboradores.split(',').map(c => c.trim()) : [],
        data: nota.data,
        turno: nota.turno,
        destino_final: nota.destino,
        status_carro: nota.status || 'embalando',
        numeros_sap: nota.numeros_sap || [],
        data_finalizacao: nota.data_finalizacao,
        posicoes: nota.posicoes,
        palletes: nota.palletes,
        gaiolas: nota.gaiolas,
        caixas_mangas: nota.caixas_mangas,
        palletes_reais: nota.palletes_reais,
        session_id: nota.session_id,
        quantidade_nfs: 0,
        total_volumes: 0,
        estimativa_pallets: 0,
        nfs: []
      })
    }
    
    const carro = carrosMap.get(nota.carro_id)
    carro.quantidade_nfs++
    carro.total_volumes += (nota as any).volumes || 0
    carro.estimativa_pallets = Math.ceil(carro.total_volumes / 100)
  })
  
  return Array.from(carrosMap.values())
}

// Fetcher para relatórios otimizado
const fetchRelatorios = async (key: string) => {
  const [, area, data, turno] = key.split('_')
  const supabase = getSupabase()
  
  let query = supabase
    .from('relatorios')
    .select(`
      id,
      nome,
      area,
      data,
      turno,
      quantidade_notas,
      soma_volumes,
      status,
      data_finalizacao,
      created_at
    `)
  
  if (area && area !== 'all') {
    if (area === 'custos') {
      query = query.eq('area', 'recebimento')
    } else {
      query = query.eq('area', area)
    }
  }
  
  if (data && data !== 'all') {
    query = query.eq('data', data)
  }
  
  if (turno && turno !== 'all') {
    query = query.eq('turno', turno)
  }
  
  const { data: relatorios, error } = await query
    .order('created_at', { ascending: false })
    .limit(50) // Limitar a 50 relatórios para performance
  
  if (error) throw error
  return relatorios || []
}

// =====================================================
// HOOKS OTIMIZADOS COM SWR
// =====================================================

// Hook para divergências com SWR
export const useDivergenciasOptimized = (
  notaFiscalId?: string,
  relatorioId?: string,
  options: {
    refreshInterval?: number
    staleTime?: number
  } = {}
) => {
  const key = `divergencias_${notaFiscalId || 'all'}_${relatorioId || 'all'}`
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    fetchDivergencias,
    {
      ...SWR_CONFIG,
      refreshInterval: options.refreshInterval || 60000, // 1 minuto por padrão
      dedupingInterval: options.staleTime || 30000, // 30s de stale time
    }
  )
  
  return {
    data: data || [],
    isLoading,
    error,
    mutate, // Para invalidar cache manualmente
    refresh: () => mutate()
  }
}

// Hook para carros com SWR
export const useCarrosOptimized = (options: {
  refreshInterval?: number
  staleTime?: number
} = {}) => {
  const { data, error, isLoading, mutate } = useSWR(
    'carros',
    fetchCarros,
    {
      ...SWR_CONFIG,
      refreshInterval: options.refreshInterval || 30000, // 30 segundos por padrão
      dedupingInterval: options.staleTime || 15000, // 15s de stale time
    }
  )
  
  // Estatísticas calculadas
  const estatisticas = data ? {
    total: data.length,
    embalando: data.filter(c => c.status_carro === 'embalando').length,
    divergencia: data.filter(c => c.status_carro === 'divergencia').length,
    aguardandoLancamento: data.filter(c => c.status_carro === 'aguardando_lancamento').length,
    finalizados: data.filter(c => c.status_carro === 'finalizado').length,
    lancados: data.filter(c => c.status_carro === 'lancado').length,
    totalNFs: data.reduce((sum, c) => sum + c.quantidade_nfs, 0),
    totalVolumes: data.reduce((sum, c) => sum + c.total_volumes, 0),
  } : {
    total: 0,
    embalando: 0,
    divergencia: 0,
    aguardandoLancamento: 0,
    finalizados: 0,
    lancados: 0,
    totalNFs: 0,
    totalVolumes: 0,
  }
  
  return {
    carros: data || [],
    isLoading,
    error,
    estatisticas,
    mutate,
    refresh: () => mutate()
  }
}

// Hook para relatórios com SWR
export const useRelatoriosOptimized = (
  area?: string,
  data?: string,
  turno?: string,
  options: {
    refreshInterval?: number
    staleTime?: number
  } = {}
) => {
  const key = `relatorios_${area || 'all'}_${data || 'all'}_${turno || 'all'}`
  
  const { data: relatorios, error, isLoading, mutate } = useSWR(
    key,
    fetchRelatorios,
    {
      ...SWR_CONFIG,
      refreshInterval: options.refreshInterval || 120000, // 2 minutos por padrão
      dedupingInterval: options.staleTime || 60000, // 1 minuto de stale time
    }
  )
  
  return {
    data: relatorios || [],
    isLoading,
    error,
    mutate,
    refresh: () => mutate()
  }
}

// =====================================================
// HOOK PARA LAZY LOADING
// =====================================================

// Hook para carregar dados sob demanda
export const useLazyData = <T>(
  fetcher: () => Promise<T>,
  options: {
    enabled?: boolean
    staleTime?: number
  } = {}
) => {
  const { data, error, isLoading, mutate } = useSWR(
    options.enabled ? 'lazy-data' : null,
    fetcher,
    {
      ...SWR_CONFIG,
      dedupingInterval: options.staleTime || 30000,
    }
  )
  
  return {
    data,
    isLoading,
    error,
    mutate,
    load: () => mutate()
  }
}

// =====================================================
// UTILITÁRIOS DE CACHE
// =====================================================

// Função para invalidar cache global
export const invalidateAllCache = () => {
  // SWR tem cache global, mas podemos usar mutate para invalidar
  if (typeof window !== 'undefined') {
    // Limpar localStorage se necessário
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('swr-cache-')) {
        localStorage.removeItem(key)
      }
    })
  }
}

// Função para obter estatísticas de cache
export const getCacheStats = () => {
  if (typeof window === 'undefined') return null
  
  const keys = Object.keys(localStorage)
  const swrKeys = keys.filter(key => key.startsWith('swr-cache-'))
  
  return {
    totalCacheEntries: swrKeys.length,
    cacheSize: swrKeys.reduce((size, key) => {
      return size + (localStorage.getItem(key)?.length || 0)
    }, 0)
  }
}
