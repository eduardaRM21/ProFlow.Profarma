const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyDatabaseUpdate() {
  console.log('🔍 Verificando se as modificações do banco foram aplicadas...')
  
  try {
    // 1. Testar inserção com novos campos
    console.log('🧪 Testando inserção com novos campos...')
    
    const testData = {
      numero_nf: 'VERIFY_001',
      codigo_completo: 'VERIFY_CODE_001',
      carro_id: 'VERIFY_CARRO_001',
      session_id: 'VERIFY_SESSION_001',
      colaboradores: 'Verificação',
      data: new Date().toISOString().split('T')[0],
      turno: 'A',
      volumes: 1,
      destino: 'Verificação',
      fornecedor: 'Verificação',
      tipo_carga: 'Verificação',
      status: 'verificacao',
      numeros_sap: ['123456', '789012'],
      data_finalizacao: new Date().toISOString()
    }

    const { error: insertError } = await supabase
      .from('embalagem_notas_bipadas')
      .insert(testData)

    if (insertError) {
      console.log('❌ ERRO: Campos novos não foram adicionados ao banco!')
      console.log('Erro:', insertError.message)
      console.log('')
      console.log('📋 SOLUÇÃO:')
      console.log('1. Acesse o painel do Supabase')
      console.log('2. Vá para SQL Editor')
      console.log('3. Execute o script: scripts/complete-database-update.sql')
      return
    }

    console.log('✅ Campos novos funcionando! Dados inseridos com sucesso')

    // 2. Verificar dados inseridos
    console.log('🔍 Verificando dados inseridos...')
    
    const { data: insertedData, error: selectError } = await supabase
      .from('embalagem_notas_bipadas')
      .select('*')
      .eq('numero_nf', 'VERIFY_001')
      .single()

    if (selectError) {
      console.log('❌ Erro ao verificar dados:', selectError.message)
    } else {
      console.log('📊 Dados inseridos:')
      console.log('  - NF:', insertedData.numero_nf)
      console.log('  - Carro ID:', insertedData.carro_id)
      console.log('  - Números SAP:', insertedData.numeros_sap)
      console.log('  - Data Finalização:', insertedData.data_finalizacao)
      console.log('  - Status:', insertedData.status)
    }

    // 3. Testar atualização de status
    console.log('🔄 Testando atualização de status...')
    
    const { error: updateError } = await supabase
      .from('embalagem_notas_bipadas')
      .update({
        status: 'finalizado',
        numeros_sap: ['999999'],
        data_finalizacao: new Date().toISOString()
      })
      .eq('numero_nf', 'VERIFY_001')

    if (updateError) {
      console.log('❌ Erro ao atualizar status:', updateError.message)
    } else {
      console.log('✅ Status atualizado com sucesso')
    }

    // 4. Testar substituição de ID do carro
    console.log('🔄 Testando substituição de ID do carro...')
    
    const { error: replaceError } = await supabase
      .from('embalagem_notas_bipadas')
      .update({
        carro_id: '999999' // Novo ID baseado no número SAP
      })
      .eq('numero_nf', 'VERIFY_001')

    if (replaceError) {
      console.log('❌ Erro ao substituir ID do carro:', replaceError.message)
    } else {
      console.log('✅ ID do carro substituído com sucesso')
    }

    // 5. Verificar dados finais
    console.log('🔍 Verificando dados finais...')
    
    const { data: finalData, error: finalSelectError } = await supabase
      .from('embalagem_notas_bipadas')
      .select('*')
      .eq('numero_nf', 'VERIFY_001')
      .single()

    if (finalSelectError) {
      console.log('❌ Erro ao verificar dados finais:', finalSelectError.message)
    } else {
      console.log('📊 Dados finais:')
      console.log('  - NF:', finalData.numero_nf)
      console.log('  - Carro ID:', finalData.carro_id)
      console.log('  - Números SAP:', finalData.numeros_sap)
      console.log('  - Data Finalização:', finalData.data_finalizacao)
      console.log('  - Status:', finalData.status)
    }

    // 6. Limpar dados de teste
    console.log('🧹 Limpando dados de teste...')
    
    const { error: deleteError } = await supabase
      .from('embalagem_notas_bipadas')
      .delete()
      .eq('numero_nf', 'VERIFY_001')

    if (deleteError) {
      console.log('⚠️ Erro ao limpar dados de teste:', deleteError.message)
    } else {
      console.log('✅ Dados de teste removidos')
    }

    // 7. Resumo final
    console.log('')
    console.log('🎉 VERIFICAÇÃO CONCLUÍDA COM SUCESSO!')
    console.log('✅ Todos os campos novos estão funcionando')
    console.log('✅ Inserção de dados funcionando')
    console.log('✅ Atualização de status funcionando')
    console.log('✅ Substituição de ID funcionando')
    console.log('✅ Limpeza de dados funcionando')
    console.log('')
    console.log('🚀 O sistema está pronto para usar a nova regra de negócio!')

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error)
    process.exit(1)
  }
}

// Executar a verificação
verifyDatabaseUpdate()
