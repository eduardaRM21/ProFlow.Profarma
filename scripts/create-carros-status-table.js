const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJdd'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createCarrosStatusTable() {
  try {
    console.log('🚀 Criando tabela carros_status...')
    
    // SQL para criar a tabela
    const createTableSQL = `
      -- Tabela para armazenar status dos carros em tempo real
      CREATE TABLE IF NOT EXISTS carros_status (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        carro_id TEXT NOT NULL,
        nome_carro TEXT NOT NULL,
        colaboradores TEXT[] NOT NULL,
        data TEXT NOT NULL,
        turno TEXT NOT NULL,
        destino_final TEXT NOT NULL,
        quantidade_nfs INTEGER NOT NULL,
        total_volumes INTEGER NOT NULL,
        data_criacao TIMESTAMP WITH TIME ZONE NOT NULL,
        data_finalizacao TIMESTAMP WITH TIME ZONE,
        numeros_sap TEXT[],
        status_carro TEXT NOT NULL CHECK (status_carro IN ('embalando', 'divergencia', 'aguardando_lancamento', 'finalizado')),
        nfs JSONB NOT NULL DEFAULT '[]',
        estimativa_pallets INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(carro_id)
      );
    `
    
    // Executar SQL via RPC (se disponível) ou tentar criar via insert
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    
    if (error) {
      console.log('⚠️ Não foi possível executar SQL diretamente. Vamos tentar criar via insert...')
      
      // Tentar criar a tabela inserindo um registro (pode falhar se a tabela não existir)
      const testData = {
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
      
      const { error: insertError } = await supabase
        .from('carros_status')
        .insert(testData)
      
      if (insertError) {
        console.error('❌ Erro ao criar tabela via insert:', insertError.message)
        console.log('\n📋 Para criar a tabela, execute manualmente no Supabase SQL Editor:')
        console.log('1. Acesse: https://supabase.com/dashboard/project/vzqibndtoitnppvgkekc/sql')
        console.log('2. Cole o conteúdo do arquivo create-carros-status-table.sql')
        console.log('3. Execute o SQL')
        return false
      }
      
      console.log('✅ Tabela criada com sucesso via insert!')
    } else {
      console.log('✅ Tabela criada com sucesso via SQL!')
    }
    
    // Verificar se a tabela foi criada
    const { data, error: checkError } = await supabase
      .from('carros_status')
      .select('*')
      .limit(1)
    
    if (checkError) {
      console.error('❌ Erro ao verificar tabela:', checkError.message)
      return false
    }
    
    console.log('✅ Tabela carros_status criada e verificada com sucesso!')
    console.log(`📊 Registros encontrados: ${data.length}`)
    
    return true
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

async function insertSampleData() {
  try {
    console.log('\n🧪 Inserindo dados de exemplo...')
    
    const sampleData = [
      {
        carro_id: 'carro_001',
        nome_carro: 'Carro 1',
        colaboradores: ['João Silva', 'Maria Santos'],
        data: '15/01/2024',
        turno: 'A',
        destino_final: 'São Paulo',
        quantidade_nfs: 8,
        total_volumes: 45,
        data_criacao: new Date().toISOString(),
        status_carro: 'embalando',
        nfs: [],
        estimativa_pallets: 4,
        session_id: 'session_001'
      },
      {
        carro_id: 'carro_002',
        nome_carro: 'Carro 2',
        colaboradores: ['Pedro Costa'],
        data: '15/01/2024',
        turno: 'B',
        destino_final: 'Rio de Janeiro',
        quantidade_nfs: 12,
        total_volumes: 67,
        data_criacao: new Date().toISOString(),
        status_carro: 'aguardando_lancamento',
        nfs: [],
        estimativa_pallets: 6,
        session_id: 'session_002'
      },
      {
        carro_id: 'carro_003',
        nome_carro: 'Carro 3',
        colaboradores: ['Ana Oliveira', 'Carlos Lima'],
        data: '15/01/2024',
        turno: 'C',
        destino_final: 'Belo Horizonte',
        quantidade_nfs: 6,
        total_volumes: 32,
        data_criacao: new Date().toISOString(),
        status_carro: 'finalizado',
        numeros_sap: ['123456', '789012'],
        nfs: [],
        estimativa_pallets: 3,
        session_id: 'session_003'
      }
    ]
    
    const { data, error } = await supabase
      .from('carros_status')
      .insert(sampleData)
    
    if (error) {
      console.error('❌ Erro ao inserir dados de exemplo:', error.message)
      return false
    }
    
    console.log('✅ Dados de exemplo inseridos com sucesso!')
    console.log(`📊 ${sampleData.length} carros criados`)
    
    return true
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Configurando tabela carros_status...\n')
  
  const tableCreated = await createCarrosStatusTable()
  
  if (tableCreated) {
    await insertSampleData()
  }
  
  console.log('\n✨ Configuração concluída!')
  console.log('🔄 Recarregue a página admin para ver os carros.')
}

main().catch(console.error)
