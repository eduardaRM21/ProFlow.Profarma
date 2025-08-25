const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase (usando valores padrão do config.ts)
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

console.log('🔧 Usando configurações padrão do Supabase')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCarrosStatus() {
  try {
    console.log('🔍 Testando tabela carros_status...')
    
    // 1. Verificar estrutura da tabela
    console.log('\n📋 Verificando estrutura da tabela carros_status...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'carros_status')
      .order('ordinal_position')
    
    if (tableError) {
      console.error('❌ Erro ao verificar estrutura da tabela:', tableError)
      return
    }
    
    console.log('✅ Estrutura da tabela carros_status:')
    tableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`)
    })
    
    // 2. Verificar dados existentes
    console.log('\n📊 Verificando dados existentes na tabela carros_status...')
    const { data: carrosData, error: carrosError } = await supabase
      .from('carros_status')
      .select('*')
      .limit(5)
    
    if (carrosError) {
      console.error('❌ Erro ao buscar carros:', carrosError)
      return
    }
    
    if (!carrosData || carrosData.length === 0) {
      console.log('ℹ️ Nenhum carro encontrado na tabela carros_status')
      return
    }
    
    console.log(`✅ Encontrados ${carrosData.length} carros:`)
    carrosData.forEach((carro, index) => {
      console.log(`\n🚛 Carro ${index + 1}:`)
      console.log(`  - ID: ${carro.id}`)
      console.log(`  - Carro ID: ${carro.carro_id}`)
      console.log(`  - Nome: ${carro.nome_carro}`)
      console.log(`  - Status: ${carro.status_carro}`)
      console.log(`  - Qtd NFs: ${carro.quantidade_nfs}`)
      console.log(`  - Total Volumes: ${carro.total_volumes}`)
      console.log(`  - Campo NFs (JSONB):`, JSON.stringify(carro.nfs, null, 2))
    })
    
    // 3. Verificar tabela embalagem_notas_bipadas
    console.log('\n📋 Verificando tabela embalagem_notas_bipadas...')
    const { data: notasData, error: notasError } = await supabase
      .from('embalagem_notas_bipadas')
      .select('*')
      .limit(5)
    
    if (notasError) {
      console.error('❌ Erro ao buscar notas:', notasError)
      return
    }
    
    if (!notasData || notasData.length === 0) {
      console.log('ℹ️ Nenhuma nota encontrada na tabela embalagem_notas_bipadas')
      return
    }
    
    console.log(`✅ Encontradas ${notasData.length} notas:`)
    notasData.forEach((nota, index) => {
      console.log(`\n📄 Nota ${index + 1}:`)
      console.log(`  - ID: ${nota.id}`)
      console.log(`  - Número NF: ${nota.numero_nf}`)
      console.log(`  - Tipo Carga: ${nota.tipo_carga}`)
      console.log(`  - Fornecedor: ${nota.fornecedor}`)
      console.log(`  - Carro ID: ${nota.carro_id}`)
      console.log(`  - Status: ${nota.status}`)
    })
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Executar teste
testCarrosStatus()
  .then(() => {
    console.log('\n✅ Teste concluído')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro no teste:', error)
    process.exit(1)
  })
