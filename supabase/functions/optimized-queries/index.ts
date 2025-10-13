// =====================================================
// EDGE FUNCTION PARA CONSULTAS OTIMIZADAS
// =====================================================

/// <reference path="../deno.d.ts" />

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =====================================================
// TIPOS
// =====================================================

interface QueryParams {
  table: string
  select?: string
  filters?: Record<string, any>
  orderBy?: string
  limit?: number
  offset?: number
}

interface OptimizedResponse<T> {
  data: T[]
  totalCount: number
  hasMore: boolean
  executionTime: number
  cacheHit: boolean
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const CACHE_TTL = 300 // 5 minutos
const MAX_LIMIT = 1000
const DEFAULT_LIMIT = 50

// Cache simples em memória
const cache = new Map<string, { data: any, timestamp: number, ttl: number }>()

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function getCacheKey(params: QueryParams): string {
  return JSON.stringify(params)
}

function getCachedData(key: string): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any, ttl: number = CACHE_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

function cleanExpiredCache(): void {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > value.ttl * 1000) {
      cache.delete(key)
    }
  }
}

// =====================================================
// CONSULTAS OTIMIZADAS
// =====================================================

async function getDivergenciasOptimized(
  supabase: any,
  params: QueryParams
): Promise<OptimizedResponse<any>> {
  const startTime = Date.now()
  
  // Campos otimizados - apenas o necessário
  const selectFields = params.select || `
    id,
    nota_fiscal_id,
    tipo,
    descricao,
    volumes_informados,
    volumes_reais,
    observacoes,
    created_at
  `

  let query = supabase
    .from('divergencias')
    .select(selectFields, { count: 'exact' })

  // Aplicar filtros
  if (params.filters?.nota_fiscal_id) {
    query = query.eq('nota_fiscal_id', params.filters.nota_fiscal_id)
  }
  
  if (params.filters?.tipo) {
    query = query.eq('tipo', params.filters.tipo)
  }

  // Ordenação otimizada
  query = query.order('created_at', { ascending: false })

  // Paginação
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT)
  const offset = params.offset || 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  const executionTime = Date.now() - startTime

  return {
    data: data || [],
    totalCount: count || 0,
    hasMore: (offset + limit) < (count || 0),
    executionTime,
    cacheHit: false
  }
}

async function getCarrosOptimized(
  supabase: any,
  params: QueryParams
): Promise<OptimizedResponse<any>> {
  const startTime = Date.now()
  
  // Consulta otimizada para carros
  const { data: notas, error, count } = await supabase
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
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(params.offset || 0, (params.offset || 0) + (params.limit || DEFAULT_LIMIT) - 1)

  if (error) throw error

  // Processar dados em memória
  const carrosMap = new Map()
  
  notas?.forEach((nota: any) => {
    if (!nota.carro_id) return
    
    if (!carrosMap.has(nota.carro_id)) {
      carrosMap.set(nota.carro_id, {
        carro_id: nota.carro_id,
        nome_carro: nota.nome_carro || `Carro ${nota.carro_id}`,
        colaboradores: nota.colaboradores ? nota.colaboradores.split(',').map((c: string) => c.trim()) : [],
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
    carro.total_volumes += nota.volumes || 0
    carro.estimativa_pallets = Math.ceil(carro.total_volumes / 100)
  })

  const executionTime = Date.now() - startTime

  return {
    data: Array.from(carrosMap.values()),
    totalCount: count || 0,
    hasMore: ((params.offset || 0) + (params.limit || DEFAULT_LIMIT)) < (count || 0),
    executionTime,
    cacheHit: false
  }
}

async function getRelatoriosOptimized(
  supabase: any,
  params: QueryParams
): Promise<OptimizedResponse<any>> {
  const startTime = Date.now()
  
  // Consulta otimizada para relatórios
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
    `, { count: 'exact' })

  // Aplicar filtros
  if (params.filters?.area) {
    if (params.filters.area === 'custos') {
      query = query.eq('area', 'recebimento')
    } else {
      query = query.eq('area', params.filters.area)
    }
  }
  
  if (params.filters?.data) {
    query = query.eq('data', params.filters.data)
  }
  
  if (params.filters?.turno) {
    query = query.eq('turno', params.filters.turno)
  }

  query = query.order('created_at', { ascending: false })

  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT)
  const offset = params.offset || 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  const executionTime = Date.now() - startTime

  return {
    data: data || [],
    totalCount: count || 0,
    hasMore: (offset + limit) < (count || 0),
    executionTime,
    cacheHit: false
  }
}

// =====================================================
// HANDLER PRINCIPAL
// =====================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const url = new URL(req.url)
    const table = url.searchParams.get('table') || undefined
    const select = url.searchParams.get('select') || undefined
    const filters = url.searchParams.get('filters') ? JSON.parse(url.searchParams.get('filters')!) : {}
    const orderBy = url.searchParams.get('orderBy') || undefined
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : DEFAULT_LIMIT
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0

    if (!table) {
      return new Response(
        JSON.stringify({ error: 'Parâmetro table é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const params: QueryParams = {
      table,
      select,
      filters,
      orderBy,
      limit,
      offset
    }

    // Verificar cache
    const cacheKey = getCacheKey(params)
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      return new Response(
        JSON.stringify({
          ...cachedData,
          cacheHit: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Executar consulta otimizada
    let result: OptimizedResponse<any>

    switch (table) {
      case 'divergencias':
        result = await getDivergenciasOptimized(supabaseClient, params)
        break
      case 'carros':
        result = await getCarrosOptimized(supabaseClient, params)
        break
      case 'relatorios':
        result = await getRelatoriosOptimized(supabaseClient, params)
        break
      default:
        return new Response(
          JSON.stringify({ error: `Tabela ${table} não suportada` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    // Armazenar no cache
    setCachedData(cacheKey, result)

    // Limpar cache expirado periodicamente
    if (Math.random() < 0.1) { // 10% de chance
      cleanExpiredCache()
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
