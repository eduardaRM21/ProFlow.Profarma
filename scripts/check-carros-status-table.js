const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!')
  console.log('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidas no arquivo .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCarrosStatusTable() {
  try {
    console.log('🔍 Verificando se a tabela carros_status existe...')
    
    // Tentar fazer uma consulta na tabela
    const { data, error } = await supabase
      .from('carros_status')
      .select('*')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Tabela carros_status não existe!')
        console.log('📋 Execute o script create-carros-status-table.sql no Supabase SQL Editor')
        console.log('📁 Arquivo: create-carros-status-table.sql')
      } else {
        console.error('❌ Erro ao verificar tabela:', error.message)
      }
      return false
    }
    
    console.log('✅ Tabela carros_status existe!')
    console.log(`📊 Registros encontrados: ${data.length}`)
    
    // Verificar estrutura da tabela
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'carros_status' })
    
    if (!columnsError && columns) {
      console.log('📋 Estrutura da tabela:')
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`)
      })
    }
    
    return true
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

async function insertTestData() {
  try {
    console.log('🧪 Inserindo dados de teste...')
    
    const testCarro = {
      carro_id: 'teste_001',
      nome_carro: 'Carro Teste',
      colaboradores: ['João Silva'],
      data: '01/01/2024',
      turno: 'A',
      destino_final: 'São Paulo',
      quantidade_nfs: 5,
      total_volumes: 25,
      data_criacao: new Date().toISOString(),
      status_carro: 'embalando',
      nfs: [],
      estimativa_pallets: 3,
      session_id: 'teste_session'
    }
    
    const { data, error } = await supabase
      .from('carros_status')
      .insert(testCarro)
    
    if (error) {
      console.error('❌ Erro ao inserir dados de teste:', error.message)
      return false
    }
    
    console.log('✅ Dados de teste inseridos com sucesso!')
    return true
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Verificando configuração da tabela carros_status...\n')
  
  const tableExists = await checkCarrosStatusTable()
  
  if (tableExists) {
    console.log('\n🧪 Deseja inserir dados de teste? (s/n)')
    // Em um ambiente real, você pode querer perguntar ao usuário
    // Por enquanto, vamos inserir automaticamente
    await insertTestData()
  }
  
  console.log('\n✨ Verificação concluída!')
}

main().catch(console.error)
