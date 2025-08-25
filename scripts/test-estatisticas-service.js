const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

console.log('🔧 Testando serviço de estatísticas...')

const supabase = createClient(supabaseUrl, supabaseKey)

// Função de retry com backoff (simulando a do supabase-client.ts)
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}

async function testEstatisticasService() {
  try {
    const data = '2025-08-22' // Data dos dados que vimos
    console.log(`📊 Testando estatísticas para data: ${data}`)

    // 1. Buscar carros da tabela carros_status
    console.log('\n🔍 Buscando carros na tabela carros_status...')
    const { data: carrosData, error: carrosError } = await retryWithBackoff(async () => {
      return await supabase
        .from('carros_status')
        .select('*')
        .eq('data', data)
        .order('turno', { ascending: true })
    })

    if (carrosError) {
      console.error('❌ Erro ao buscar carros:', carrosError)
      return
    }
    
    console.log(`📊 Carros encontrados: ${carrosData?.length || 0}`)
    if (carrosData && carrosData.length > 0) {
      console.log('🔍 Carros:')
      carrosData.forEach((carro, index) => {
        console.log(`  ${index + 1}. ID: ${carro.carro_id}, Status: ${carro.status_carro}, Turno: ${carro.turno}`)
      })
    }

    // 2. Buscar notas da tabela embalagem_notas_bipadas
    console.log('\n🔍 Buscando notas na tabela embalagem_notas_bipadas...')
    const { data: notasData, error: notasError } = await retryWithBackoff(async () => {
      return await supabase
        .from('embalagem_notas_bipadas')
        .select('*')
        .eq('data', data)
        .order('turno', { ascending: true })
    })

    if (notasError) {
      console.error('❌ Erro ao buscar notas:', notasError)
      return
    }
    
    console.log(`📊 Notas encontradas: ${notasData?.length || 0}`)
    if (notasData && notasData.length > 0) {
      console.log('🔍 Notas:')
      notasData.forEach((nota, index) => {
        console.log(`  ${index + 1}. NF: ${nota.numero_nf}, Carro: ${nota.carro_id}, Turno: ${nota.turno}`)
      })
    }

    // 3. Simular o processamento das estatísticas
    console.log('\n🔍 Processando estatísticas...')
    
    // Agrupar por turno
    const estatisticasPorTurno = new Map()
    
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
    carrosData?.forEach(carro => {
      const turno = carro.turno || 'A'
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
    notasData?.forEach(nota => {
      const turno = nota.turno || 'A'
      const stats = estatisticasPorTurno.get(turno)
      if (stats) {
        stats.total_notas++
        stats.total_volumes += nota.volumes || 0
      }
    })

    // Calcular pallets (estimativa)
    estatisticasPorTurno.forEach(stats => {
      stats.total_pallets = Math.ceil(stats.total_volumes / 100)
      stats.produtividade_por_hora = stats.total_volumes > 0 ? Math.round(stats.total_volumes / 8) : 0
    })

    // 4. Mostrar resultados
    console.log('\n📊 Estatísticas calculadas:')
    const estatisticas = Array.from(estatisticasPorTurno.values())
    estatisticas.forEach(stats => {
      const turnoLabel = stats.turno === 'A' ? 'Manhã' : stats.turno === 'B' ? 'Tarde' : stats.turno === 'C' ? 'Noite' : stats.turno
      console.log(`\n${turnoLabel}:`)
      console.log(`  Total Carros: ${stats.total_carros}`)
      console.log(`  Embalando: ${stats.carros_embalando}`)
      console.log(`  Lançados: ${stats.carros_lancados}`)
      console.log(`  Finalizados: ${stats.carros_finalizados}`)
      console.log(`  Total Notas: ${stats.total_notas}`)
      console.log(`  Total Volumes: ${stats.total_volumes}`)
      console.log(`  Total Pallets: ${stats.total_pallets}`)
      console.log(`  Produtividade/h: ${stats.produtividade_por_hora}`)
    })

    // 5. Verificar se há dados para exibir
    const temDados = estatisticas.some(stats => stats.total_carros > 0 || stats.total_notas > 0)
    console.log(`\n✅ Tem dados para exibir: ${temDados ? 'SIM' : 'NÃO'}`)

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Executar o teste
testEstatisticasService()
  .then(() => {
    console.log('\n✅ Teste concluído')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
