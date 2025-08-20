const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJdd'

const supabase = createClient(supabaseUrl, supabaseKey)

async function insertSampleData() {
  try {
    console.log('🧪 Inserindo dados de exemplo na tabela carros_status...')
    
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
        nfs: [
          {
            id: 'nf_001',
            numeroNF: '001234',
            volume: 5,
            fornecedor: 'Fornecedor A',
            codigo: 'COD001',
            codigoDestino: 'DEST001',
            destinoFinal: 'São Paulo',
            tipo: 'Normal',
            codigoCompleto: 'COD001-DEST001',
            timestamp: new Date().toISOString(),
            status: 'valida'
          }
        ],
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
        nfs: [
          {
            id: 'nf_002',
            numeroNF: '002345',
            volume: 8,
            fornecedor: 'Fornecedor B',
            codigo: 'COD002',
            codigoDestino: 'DEST002',
            destinoFinal: 'Rio de Janeiro',
            tipo: 'Normal',
            codigoCompleto: 'COD002-DEST002',
            timestamp: new Date().toISOString(),
            status: 'valida'
          }
        ],
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
        data_finalizacao: new Date().toISOString(),
        nfs: [
          {
            id: 'nf_003',
            numeroNF: '003456',
            volume: 6,
            fornecedor: 'Fornecedor C',
            codigo: 'COD003',
            codigoDestino: 'DEST003',
            destinoFinal: 'Belo Horizonte',
            tipo: 'Normal',
            codigoCompleto: 'COD003-DEST003',
            timestamp: new Date().toISOString(),
            status: 'valida'
          }
        ],
        estimativa_pallets: 3,
        session_id: 'session_003'
      },
      {
        carro_id: 'carro_004',
        nome_carro: 'Carro 4',
        colaboradores: ['Roberto Alves'],
        data: '15/01/2024',
        turno: 'A',
        destino_final: 'Curitiba',
        quantidade_nfs: 3,
        total_volumes: 18,
        data_criacao: new Date().toISOString(),
        status_carro: 'divergencia',
        nfs: [
          {
            id: 'nf_004',
            numeroNF: '004567',
            volume: 3,
            fornecedor: 'Fornecedor D',
            codigo: 'COD004',
            codigoDestino: 'DEST004',
            destinoFinal: 'Curitiba',
            tipo: 'Normal',
            codigoCompleto: 'COD004-DEST004',
            timestamp: new Date().toISOString(),
            status: 'invalida'
          }
        ],
        estimativa_pallets: 2,
        session_id: 'session_004'
      }
    ]
    
    const { data, error } = await supabase
      .from('carros_status')
      .insert(sampleData)
    
    if (error) {
      console.error('❌ Erro ao inserir dados de exemplo:', error.message)
      console.log('\n📋 Certifique-se de que:')
      console.log('1. A tabela carros_status foi criada no Supabase')
      console.log('2. Execute o SQL do arquivo create-carros-status-table.sql')
      console.log('3. Tente novamente este script')
      return false
    }
    
    console.log('✅ Dados de exemplo inseridos com sucesso!')
    console.log(`📊 ${sampleData.length} carros criados`)
    console.log('\n🎉 Agora você pode:')
    console.log('1. Recarregar a página admin')
    console.log('2. Ver os carros sendo exibidos')
    console.log('3. Testar as funcionalidades de status')
    
    return true
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Inserindo dados de exemplo...\n')
  
  await insertSampleData()
  
  console.log('\n✨ Processo concluído!')
}

main().catch(console.error)
