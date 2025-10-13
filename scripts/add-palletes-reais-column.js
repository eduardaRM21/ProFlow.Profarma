const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

console.log('🔧 Configuração do Supabase:')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function addPalletesReaisColumn() {
  console.log('🔄 Adicionando coluna palletes_reais na tabela carros_status...')
  
  try {
    // 1. Verificar se a coluna já existe
    console.log('🔍 Verificando se a coluna palletes_reais já existe...')
    
    // Tentar executar SQL via RPC para adicionar a coluna
    console.log('📝 Tentando adicionar coluna palletes_reais...')
    
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          ALTER TABLE carros_status 
          ADD COLUMN IF NOT EXISTS palletes_reais INTEGER;
          
          COMMENT ON COLUMN carros_status.palletes_reais IS 'Quantidade real de pallets utilizados no carro (diferente da estimativa)';
        `
      })

    if (rpcError) {
      console.log('⚠️ Erro ao executar SQL via RPC:', rpcError.message)
      console.log('Tentando método alternativo...')
      
      // Verificar se a coluna existe consultando a estrutura da tabela
      console.log('🔍 Verificando estrutura da tabela...')
      
      const { data: columns, error: columnsError } = await supabase
        .from('carros_status')
        .select('*')
        .limit(1)
      
      if (columnsError) {
        console.log('❌ Erro ao verificar estrutura:', columnsError.message)
        console.log('A coluna palletes_reais precisa ser adicionada manualmente no banco')
        console.log('Execute o seguinte SQL no seu banco de dados:')
        console.log('')
        console.log('ALTER TABLE carros_status ADD COLUMN IF NOT EXISTS palletes_reais INTEGER;')
        console.log('COMMENT ON COLUMN carros_status.palletes_reais IS \'Quantidade real de pallets utilizados no carro (diferente da estimativa)\';')
        console.log('')
        return
      }
      
      console.log('✅ Estrutura da tabela verificada com sucesso')

    } else {
      console.log('✅ Coluna palletes_reais adicionada com sucesso via RPC')
      console.log('Resultado:', rpcResult)
    }

    // 2. Verificar estrutura atual da tabela
    console.log('🔍 Verificando estrutura atual da tabela carros_status...')
    
    // Tentar verificar via RPC
    const { data: structureResult, error: structureError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'carros_status' 
          ORDER BY ordinal_position;
        `
      })

    if (structureError) {
      console.log('⚠️ Erro ao verificar estrutura via RPC:', structureError.message)
    } else {
      console.log('📊 Estrutura atual da tabela:')
      console.log(structureResult)
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Executar a função
addPalletesReaisColumn()
  .then(() => {
    console.log('✅ Script concluído')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
