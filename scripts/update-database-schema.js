const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase (usando valores padrão do config.ts)
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

console.log('🔧 Configuração do Supabase:')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateDatabaseSchema() {
  console.log('🔄 Iniciando atualização do schema do banco de dados...')
  
  try {
    // 1. Verificar se a função exec_sql existe
    console.log('🔍 Verificando se a função exec_sql está disponível...')
    
    // Tentar executar SQL diretamente via RPC
    console.log('📝 Tentando adicionar campo numeros_sap...')
    
    // Como alternativa, vou usar queries diretas para verificar a estrutura
    console.log('🔍 Verificando estrutura atual da tabela...')
    
    // Verificar se os campos já existem
    const { data: existingColumns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'embalagem_notas_bipadas')
      .in('column_name', ['numeros_sap', 'data_finalizacao'])
      .order('column_name')

    if (checkError) {
      console.log('⚠️ Erro ao verificar estrutura:', checkError.message)
      console.log('Tentando método alternativo...')
      
      // Método alternativo: tentar inserir dados com os novos campos
      console.log('🧪 Testando inserção com novos campos...')
      const testData = {
        numero_nf: 'TEST_SCHEMA_001',
        codigo_completo: 'TEST_SCHEMA_CODE_001',
        carro_id: 'TEST_SCHEMA_CARRO_001',
        session_id: 'TEST_SCHEMA_SESSION_001',
        colaboradores: 'Teste Schema',
        data: new Date().toISOString().split('T')[0],
        turno: 'A',
        volumes: 1,
        destino: 'Teste Schema',
        fornecedor: 'Teste Schema',
        tipo_carga: 'Teste Schema',
        status: 'teste_schema'
      }

      // Tentar inserir sem os novos campos primeiro
      const { error: insertError1 } = await supabase
        .from('embalagem_notas_bipadas')
        .insert(testData)

      if (insertError1) {
        console.log('❌ Erro ao inserir dados básicos:', insertError1.message)
        return
      }

      console.log('✅ Dados básicos inseridos com sucesso')

      // Agora tentar inserir com os novos campos
      const testDataWithNewFields = {
        ...testData,
        numero_nf: 'TEST_SCHEMA_002',
        codigo_completo: 'TEST_SCHEMA_CODE_002',
        numeros_sap: ['123456', '789012'],
        data_finalizacao: new Date().toISOString()
      }

      const { error: insertError2 } = await supabase
        .from('embalagem_notas_bipadas')
        .insert(testDataWithNewFields)

      if (insertError2) {
        console.log('❌ Erro ao inserir com novos campos:', insertError2.message)
        console.log('Os campos numeros_sap e data_finalizacao precisam ser adicionados manualmente no banco')
      } else {
        console.log('✅ Dados com novos campos inseridos com sucesso')
        
        // Limpar dados de teste
        const { error: deleteError } = await supabase
          .from('embalagem_notas_bipadas')
          .delete()
          .in('numero_nf', ['TEST_SCHEMA_001', 'TEST_SCHEMA_002'])
        
        if (deleteError) {
          console.log('⚠️ Erro ao limpar dados de teste:', deleteError.message)
        } else {
          console.log('🧹 Dados de teste removidos')
        }
      }

    } else {
      console.log('📊 Estrutura atual da tabela:')
      if (existingColumns && existingColumns.length > 0) {
        existingColumns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
        })
        
        // Verificar se os campos já existem
        const hasNumerosSap = existingColumns.some(col => col.column_name === 'numeros_sap')
        const hasDataFinalizacao = existingColumns.some(col => col.column_name === 'data_finalizacao')
        
        if (hasNumerosSap && hasDataFinalizacao) {
          console.log('✅ Todos os campos necessários já existem!')
        } else {
          console.log('⚠️ Alguns campos estão faltando e precisam ser adicionados manualmente')
          if (!hasNumerosSap) console.log('  - numeros_sap: TEXT[]')
          if (!hasDataFinalizacao) console.log('  - data_finalizacao: TIMESTAMP WITH TIME ZONE')
        }
      } else {
        console.log('  - Nenhum dos campos novos encontrado')
        console.log('⚠️ Os campos precisam ser adicionados manualmente no banco')
      }
    }

    console.log('🎉 Verificação do schema concluída!')
    console.log('')
    console.log('📋 PRÓXIMOS PASSOS:')
    console.log('1. Acesse o painel do Supabase')
    console.log('2. Vá para SQL Editor')
    console.log('3. Execute o seguinte SQL:')
    console.log('')
    console.log('-- Adicionar campo para números SAP')
    console.log('ALTER TABLE embalagem_notas_bipadas ADD COLUMN IF NOT EXISTS numeros_sap TEXT[];')
    console.log('')
    console.log('-- Adicionar campo para data de finalização')
    console.log('ALTER TABLE embalagem_notas_bipadas ADD COLUMN IF NOT EXISTS data_finalizacao TIMESTAMP WITH TIME ZONE;')
    console.log('')
    console.log('-- Adicionar comentários')
    console.log('COMMENT ON COLUMN embalagem_notas_bipadas.numeros_sap IS \'Array de números SAP para carros finalizados\';')
    console.log('COMMENT ON COLUMN embalagem_notas_bipadas.data_finalizacao IS \'Data e hora da finalização do carro\';')
    console.log('')
    console.log('-- Atualizar valores padrão')
    console.log('UPDATE embalagem_notas_bipadas SET numeros_sap = ARRAY[]::TEXT[] WHERE numeros_sap IS NULL;')
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error)
    process.exit(1)
  }
}

// Executar a função
updateDatabaseSchema()
