const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

console.log('🔧 Verificando se a coluna palletes_reais existe na tabela carros_status...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPalletesReaisColumn() {
  try {
    // Tentar inserir um registro com palletes_reais para ver se a coluna existe
    console.log('🔍 Testando inserção com campo palletes_reais...')
    
    const testData = {
      carro_id: 'TEST_PALLETES_CHECK_001',
      nome_carro: 'Teste Pallets Check',
      colaboradores: ['Teste'],
      data: new Date().toISOString().split('T')[0],
      turno: 'A',
      destino_final: 'Teste',
      quantidade_nfs: 1,
      total_volumes: 100,
      data_criacao: new Date().toISOString(),
      status_carro: 'embalando',
      nfs: [],
      estimativa_pallets: 1,
      session_id: 'TEST_PALLETES_CHECK_SESSION_001',
      palletes_reais: 2
    }

    const { error: insertError } = await supabase
      .from('carros_status')
      .insert(testData)

    if (insertError) {
      console.log('❌ Erro ao inserir com palletes_reais:', insertError.message)
      console.log('A coluna palletes_reais NÃO existe na tabela carros_status')
      console.log('')
      console.log('Para resolver, execute este SQL no Supabase Dashboard:')
      console.log('')
      console.log('ALTER TABLE carros_status ADD COLUMN IF NOT EXISTS palletes_reais INTEGER;')
      console.log('COMMENT ON COLUMN carros_status.palletes_reais IS \'Quantidade real de pallets utilizados no carro (diferente da estimativa)\';')
      console.log('')
    } else {
      console.log('✅ Dados com palletes_reais inseridos com sucesso')
      console.log('A coluna palletes_reais JÁ existe na tabela carros_status')
      
      // Limpar dados de teste
      const { error: deleteError } = await supabase
        .from('carros_status')
        .delete()
        .eq('carro_id', 'TEST_PALLETES_CHECK_001')
      
      if (deleteError) {
        console.log('⚠️ Erro ao limpar dados de teste:', deleteError.message)
      } else {
        console.log('🧹 Dados de teste removidos')
      }
    }

    // Verificar dados existentes
    console.log('\n🔍 Verificando dados existentes na tabela carros_status...')
    const { data: carrosData, error: carrosError } = await supabase
      .from('carros_status')
      .select('*')
      .limit(3)

    if (carrosError) {
      console.error('❌ Erro ao buscar carros:', carrosError)
      return
    }

    console.log(`📊 Carros encontrados: ${carrosData?.length || 0}`)
    if (carrosData && carrosData.length > 0) {
      console.log('🔍 Estrutura dos carros:')
      carrosData.forEach((carro, index) => {
        console.log(`  ${index + 1}. ID: ${carro.carro_id}`)
        console.log(`     Status: ${carro.status_carro}`)
        console.log(`     Turno: ${carro.turno}`)
        console.log(`     Pallets Reais: ${carro.palletes_reais || 'N/A'}`)
        console.log(`     Estimativa Pallets: ${carro.estimativa_pallets}`)
        console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Executar a verificação
checkPalletesReaisColumn()
  .then(() => {
    console.log('\n✅ Verificação concluída')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
