// Script de teste para verificar se a função verificarNotaJaBipada está funcionando
const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testVerificarNota() {
  try {
    console.log('🧪 Testando função verificarNotaJaBipada...')
    
    // Teste 1: Verificar se a tabela existe e tem dados
    console.log('\n1️⃣ Verificando estrutura da tabela...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('embalagem_notas_bipadas')
      .select('carro_id, codigo_completo, timestamp_bipagem')
      .limit(5)
    
    if (tableError) {
      console.error('❌ Erro ao acessar tabela:', tableError)
      return
    }
    
    console.log('✅ Tabela acessada com sucesso')
    console.log('📊 Dados encontrados:', tableInfo?.length || 0)
    
    if (tableInfo && tableInfo.length > 0) {
      console.log('📋 Exemplo de carro_id:', tableInfo[0].carro_id)
    }
    
    // Teste 2: Simular a consulta que estava causando erro
    console.log('\n2️⃣ Testando consulta corrigida...')
    if (tableInfo && tableInfo.length > 0) {
      const carroId = tableInfo[0].carro_id
      console.log(`🔍 Testando com carro_id: ${carroId}`)
      
      const { data: carroData, error: carroError } = await supabase
        .from('embalagem_notas_bipadas')
        .select('carro_id, numero_nf, fornecedor')
        .eq('carro_id', carroId)
        .limit(1)
        .single()
      
      if (carroError) {
        console.error('❌ Erro na consulta corrigida:', carroError)
      } else {
        console.log('✅ Consulta corrigida funcionando:', carroData)
      }
    }
    
    // Teste 3: Verificar se há carro_ids que não são UUIDs
    console.log('\n3️⃣ Verificando tipos de carro_id...')
    const { data: carroIds, error: carroIdsError } = await supabase
      .from('embalagem_notas_bipadas')
      .select('carro_id')
      .not('carro_id', 'is', null)
      .limit(10)
    
    if (carroIdsError) {
      console.error('❌ Erro ao buscar carro_ids:', carroIdsError)
    } else {
      console.log('📋 Tipos de carro_id encontrados:')
      carroIds?.forEach((item, index) => {
        console.log(`  ${index + 1}. "${item.carro_id}" (tipo: ${typeof item.carro_id})`)
      })
    }
    
    console.log('\n✅ Teste concluído!')
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
  }
}

// Executar o teste
testVerificarNota()
