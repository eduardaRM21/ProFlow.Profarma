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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { notaIds, relatorioId } = await req.json()

    if (!notaIds || !Array.isArray(notaIds)) {
      return new Response(
        JSON.stringify({ error: 'notaIds deve ser um array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Dividir em lotes menores para evitar problemas de URL
    const BATCH_SIZE = 50
    const batches = []
    for (let i = 0; i < notaIds.length; i += BATCH_SIZE) {
      batches.push(notaIds.slice(i, i + BATCH_SIZE))
    }

    // Buscar divergências em lotes
    const allDivergencias = []
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      
      const { data: batchData, error: batchError } = await supabaseClient
        .from('divergencias')
        .select('*')
        .in('nota_fiscal_id', batch)
      
      if (batchError) {
        console.warn(`Erro ao buscar lote ${i + 1}:`, batchError)
        continue
      }
      
      if (batchData) {
        allDivergencias.push(...batchData)
      }
    }

    return new Response(
      JSON.stringify({ 
        data: allDivergencias,
        total: allDivergencias.length,
        batchesProcessed: batches.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
