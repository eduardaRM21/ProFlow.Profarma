const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

console.log('🔧 Verificando dados na tabela carros_status...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCarrosStatusData() {
  try {
    // 1. Verificar se a tabela existe e tem dados
    console.log('🔍 Verificando tabela carros_status...')
    
    const { data: carrosData, error: carrosError } = await supabase
      .from('carros_status')
      .select('*')
      .limit(5)

    if (carrosError) {
      console.error('❌ Erro ao buscar carros:', carrosError)
      return
    }

    console.log(`📊 Total de carros encontrados: ${carrosData?.length || 0}`)
    
    if (carrosData && carrosData.length > 0) {
      console.log('🔍 Primeiros carros:')
      carrosData.forEach((carro, index) => {
        console.log(`  ${index + 1}. ID: ${carro.carro_id}, Status: ${carro.status_carro}, Data: ${carro.data}, Turno: ${carro.turno}`)
      })
    } else {
      console.log('ℹ️ Nenhum carro encontrado na tabela carros_status')
    }

    // 2. Verificar se há dados na tabela embalagem_notas_bipadas
    console.log('\n🔍 Verificando tabela embalagem_notas_bipadas...')
    
    const { data: notasData, error: notasError } = await supabase
      .from('embalagem_notas_bipadas')
      .select('*')
      .limit(5)

    if (notasError) {
      console.error('❌ Erro ao buscar notas:', notasError)
      return
    }

    console.log(`📊 Total de notas encontradas: ${notasData?.length || 0}`)
    
    if (notasData && notasData.length > 0) {
      console.log('🔍 Primeiras notas:')
      notasData.forEach((nota, index) => {
        console.log(`  ${index + 1}. NF: ${nota.numero_nf}, Carro: ${nota.carro_id}, Data: ${nota.data}, Turno: ${nota.turno}`)
      })
    } else {
      console.log('ℹ️ Nenhuma nota encontrada na tabela embalagem_notas_bipadas')
    }

    // 3. Verificar dados de hoje
    const hoje = new Date().toISOString().split('T')[0]
    console.log(`\n🔍 Verificando dados de hoje (${hoje}):`)
    
    const { data: carrosHoje, error: carrosHojeError } = await supabase
      .from('carros_status')
      .select('*')
      .eq('data', hoje)

    if (carrosHojeError) {
      console.error('❌ Erro ao buscar carros de hoje:', carrosHojeError)
    } else {
      console.log(`📊 Carros de hoje: ${carrosHoje?.length || 0}`)
    }

    const { data: notasHoje, error: notasHojeError } = await supabase
      .from('embalagem_notas_bipadas')
      .select('*')
      .eq('data', hoje)

    if (notasHojeError) {
      console.error('❌ Erro ao buscar notas de hoje:', notasHojeError)
    } else {
      console.log(`📊 Notas de hoje: ${notasHoje?.length || 0}`)
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Executar a função
checkCarrosStatusData()
  .then(() => {
    console.log('\n✅ Verificação concluída')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
