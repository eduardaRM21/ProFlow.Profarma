import { getSupabase, retryWithBackoff } from './supabase-client'

export interface EstatisticasProdutividade {
  data: string
  turno: string
  total_carros: number
  carros_embalando: number
  carros_lancados: number
  carros_finalizados: number
  total_notas: number
  total_volumes: number
  total_pallets: number
  tempo_medio_embalagem: number // em minutos
  produtividade_por_hora: number // carros por hora
}

export interface EstatisticasPorPeriodo {
  periodo: string
  total_carros: number
  total_notas: number
  total_volumes: number
  total_pallets: number
  produtividade_media: number
}

export class EstatisticasService {
  /**
   * Busca estatísticas de produtividade por turno para uma data específica
   */
  static async buscarEstatisticasPorTurno(data: string): Promise<{
    success: boolean
    estatisticas?: EstatisticasProdutividade[]
    error?: string
  }> {
    try {
      console.log('📊 Buscando estatísticas de produtividade por turno para:', data)

      // Buscar estatísticas da tabela carros_status
      console.log('🔍 Buscando carros na tabela carros_status para data:', data)
      const { data: carrosData, error: carrosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .select('*')
          .eq('data', data)
          .order('turno', { ascending: true })
      })

      if (carrosError) throw carrosError
      
      console.log('📊 Carros encontrados:', carrosData?.length || 0)
      if (carrosData && carrosData.length > 0) {
        console.log('🔍 Primeiro carro:', carrosData[0])
        console.log('🔍 Último carro:', carrosData[carrosData.length - 1])
      }

      // Buscar estatísticas da tabela embalagem_notas_bipadas
      console.log('🔍 Buscando notas na tabela embalagem_notas_bipadas para data:', data)
      const { data: notasData, error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('*')
          .eq('data', data)
          .order('turno', { ascending: true })
      })

      if (notasError) throw notasError
      
      console.log('📊 Notas encontradas:', notasData?.length || 0)
      if (notasData && notasData.length > 0) {
        console.log('🔍 Primeira nota:', notasData[0])
        console.log('🔍 Última nota:', notasData[notasData.length - 1])
      }

      // Agrupar por turno
      const estatisticasPorTurno = new Map<string, EstatisticasProdutividade>()
      
      // Inicializar estatísticas para cada turno
      const turnos = ['A', 'B', 'C'] // A=Manhã, B=Tarde, C=Noite
      turnos.forEach(turno => {
        estatisticasPorTurno.set(turno, {
          data,
          turno,
          total_carros: 0,
          carros_embalando: 0,
          carros_lancados: 0,
          carros_finalizados: 0,
          total_notas: 0,
          total_volumes: 0,
          total_pallets: 0,
          tempo_medio_embalagem: 0,
          produtividade_por_hora: 0
        })
      })

      // Processar carros
      carrosData?.forEach((carro: any) => {
        const turno = String(carro.turno || 'A')
        const stats = estatisticasPorTurno.get(turno)
        if (stats) {
          stats.total_carros++
          
          switch (carro.status_carro) {
            case 'embalando':
              stats.carros_embalando++
              break
            case 'lancado':
              stats.carros_lancados++
              break
            case 'finalizado':
              stats.carros_finalizados++
              break
          }
        }
      })

      // Processar notas
      notasData?.forEach((nota: any) => {
        const turno = String(nota.turno || 'A')
        const stats = estatisticasPorTurno.get(turno)
        if (stats) {
          stats.total_notas++
          stats.total_volumes += Number(nota.volumes || 0)
          
          // Adicionar pallets reais se disponível na nota
          if (nota.palletes_reais) {
            stats.total_pallets += Number(nota.palletes_reais)
          }
        }
      })

      // Calcular pallets e produtividade
      estatisticasPorTurno.forEach(stats => {
        // Se já temos pallets reais das notas, usar eles
        if (stats.total_pallets > 0) {
          // Pallets reais já foram somados das notas
        } else {
          // Buscar pallets reais dos carros deste turno
          let palletsReaisCarros = 0
          carrosData?.forEach((carro: any) => {
            if (carro.turno === stats.turno && carro.palletes_reais) {
              palletsReaisCarros += Number(carro.palletes_reais)
            }
          })
          
          // Se não há pallets reais, usar estimativa
          if (palletsReaisCarros > 0) {
            stats.total_pallets = palletsReaisCarros
          } else {
            stats.total_pallets = Math.ceil(stats.total_volumes / 100) // Estimativa: 100 volumes por pallet
          }
        }
        
        // Calcular tempo médio de embalagem (estimativa baseada no número de notas)
        if (stats.total_notas > 0) {
          stats.tempo_medio_embalagem = Math.round((stats.total_notas * 2) / 60) // 2 min por nota
        }
        
        // Calcular produtividade por hora (carros por hora)
        if (stats.total_carros > 0) {
          const horasTurno = turnos.indexOf(stats.turno) === 1 ? 8 : 8 // 8 horas por turno
          stats.produtividade_por_hora = Math.round((stats.total_carros / horasTurno) * 100) / 100
        }
      })

      const estatisticas = Array.from(estatisticasPorTurno.values())
      console.log('✅ Estatísticas calculadas:', estatisticas)

      return {
        success: true,
        estatisticas
      }
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas por turno:', error)
      return {
        success: false,
        error: `Erro ao buscar estatísticas: ${error}`
      }
    }
  }

  /**
   * Busca estatísticas de produtividade por período (últimos 7 dias, 30 dias, etc.)
   */
  static async buscarEstatisticasPorPeriodo(dias: number = 7): Promise<{
    success: boolean
    estatisticas?: EstatisticasPorPeriodo[]
    error?: string
  }> {
    try {
      console.log(`📊 Buscando estatísticas de produtividade dos últimos ${dias} dias`)

      const dataInicio = new Date()
      dataInicio.setDate(dataInicio.getDate() - dias)
      const dataInicioStr = dataInicio.toISOString().split('T')[0]

      // Buscar carros dos últimos dias
      const { data: carrosData, error: carrosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .select('*')
          .gte('data', dataInicioStr)
          .order('data', { ascending: false })
      })

      if (carrosError) throw carrosError

      // Agrupar por data
      const estatisticasPorData = new Map<string, EstatisticasPorPeriodo>()
      
      carrosData?.forEach((carro: any) => {
        const data = String(carro.data)
        if (!estatisticasPorData.has(data)) {
          estatisticasPorData.set(data, {
            periodo: data,
            total_carros: 0,
            total_notas: 0,
            total_volumes: 0,
            total_pallets: 0,
            produtividade_media: 0
          })
        }
        
        const stats = estatisticasPorData.get(data)!
        stats.total_carros++
      })

      // Buscar notas dos últimos dias
      const { data: notasData, error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('*')
          .gte('data', dataInicioStr)
          .order('data', { ascending: false })
      })

      if (notasError) throw notasError

      // Processar notas
      notasData?.forEach((nota: any) => {
        const data = String(nota.data)
        const stats = estatisticasPorData.get(data)
        if (stats) {
          stats.total_notas++
          stats.total_volumes += Number(nota.volumes || 0)
        }
      })

      // Calcular pallets e produtividade
      estatisticasPorData.forEach(stats => {
        stats.total_pallets = Math.ceil(stats.total_volumes / 100)
        stats.produtividade_media = stats.total_carros > 0 ? 
          Math.round((stats.total_notas / stats.total_carros) * 100) / 100 : 0
      })

      const estatisticas = Array.from(estatisticasPorData.values())
        .sort((a, b) => b.periodo.localeCompare(a.periodo))

      console.log('✅ Estatísticas por período calculadas:', estatisticas)

      return {
        success: true,
        estatisticas
      }
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas por período:', error)
      return {
        success: false,
        error: `Erro ao buscar estatísticas por período: ${error}`
      }
    }
  }

  /**
   * Busca estatísticas gerais do sistema
   */
  static async buscarEstatisticasGerais(): Promise<{
    success: boolean
    estatisticas?: {
      total_carros_sistema: number
      total_notas_sistema: number
      total_volumes_sistema: number
      carros_hoje: number
      carros_semana: number
      carros_mes: number
      produtividade_media_diaria: number
    }
    error?: string
  }> {
    try {
      console.log('📊 Buscando estatísticas gerais do sistema')

      const hoje = new Date().toISOString().split('T')[0]
      const dataSemana = new Date()
      dataSemana.setDate(dataSemana.getDate() - 7)
      const dataSemanaStr = dataSemana.toISOString().split('T')[0]
      const dataMes = new Date()
      dataMes.setMonth(dataMes.getMonth() - 1)
      const dataMesStr = dataMes.toISOString().split('T')[0]

      // Buscar estatísticas gerais
      const { data: carrosData, error: carrosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .select('*')
      })

      if (carrosError) throw carrosError

      // Buscar notas gerais
      const { data: notasData, error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('*')
      })

      if (notasError) throw notasError

      // Calcular estatísticas
      const totalCarros = carrosData?.length || 0
      const totalNotas = notasData?.length || 0
      const totalVolumes = notasData?.reduce((sum, nota: any) => sum + Number(nota.volumes || 0), 0) || 0
      
      const carrosHoje = carrosData?.filter((c: any) => String(c.data) === hoje).length || 0
      const carrosSemana = carrosData?.filter((c: any) => String(c.data) >= dataSemanaStr).length || 0
      const carrosMes = carrosData?.filter((c: any) => String(c.data) >= dataMesStr).length || 0
      
      const produtividadeMedia = totalCarros > 0 ? Math.round((totalNotas / totalCarros) * 100) / 100 : 0

      const estatisticas = {
        total_carros_sistema: totalCarros,
        total_notas_sistema: totalNotas,
        total_volumes_sistema: totalVolumes,
        carros_hoje: carrosHoje,
        carros_semana: carrosSemana,
        carros_mes: carrosMes,
        produtividade_media_diaria: produtividadeMedia
      }

      console.log('✅ Estatísticas gerais calculadas:', estatisticas)

      return {
        success: true,
        estatisticas
      }
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas gerais:', error)
      return {
        success: false,
        error: `Erro ao buscar estatísticas gerais: ${error}`
      }
    }
  }
}
