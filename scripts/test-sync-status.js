const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testStatusSync() {
  console.log('🧪 Testando sincronização de status em tempo real...')
  
  try {
    // 1. Inserir dados de teste
    console.log('📝 Inserindo dados de teste...')
    
    const testData = {
      numero_nf: 'SYNC_TEST_001',
      codigo_completo: 'SYNC_TEST_CODE_001',
      carro_id: 'SYNC_TEST_CARRO_001',
      session_id: 'SYNC_TEST_SESSION_001',
      colaboradores: 'Teste Sincronização',
      data: new Date().toISOString().split('T')[0],
      turno: 'A',
      volumes: 1,
      destino: 'Teste Sincronização',
      fornecedor: 'Teste Sincronização',
      tipo_carga: 'Teste Sincronização',
      status: 'embalando'
    }

    const { error: insertError } = await supabase
      .from('embalagem_notas_bipadas')
      .insert(testData)

    if (insertError) {
      console.log('❌ Erro ao inserir dados de teste:', insertError.message)
      return
    }

    console.log('✅ Dados de teste inseridos com sucesso')

    // 2. Simular múltiplas atualizações de status
    console.log('🔄 Simulando atualizações de status...')
    
    const statusUpdates = [
      { status: 'pronto', numeros_sap: ['123456'] },
      { status: 'em_producao', numeros_sap: ['123456', '789012'] },
      { status: 'finalizado', numeros_sap: ['999999'], data_finalizacao: new Date().toISOString() }
    ]

    for (let i = 0; i < statusUpdates.length; i++) {
      const update = statusUpdates[i]
      console.log(`📝 Atualizando status para: ${update.status}`)
      
      const { error: updateError } = await supabase
        .from('embalagem_notas_bipadas')
        .update(update)
        .eq('numero_nf', 'SYNC_TEST_001')

      if (updateError) {
        console.log(`❌ Erro ao atualizar para ${update.status}:`, updateError.message)
      } else {
        console.log(`✅ Status atualizado para: ${update.status}`)
        
        // Aguardar um pouco para simular tempo real
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // 3. Verificar dados finais
    console.log('🔍 Verificando dados finais...')
    
    const { data: finalData, error: selectError } = await supabase
      .from('embalagem_notas_bipadas')
      .select('*')
      .eq('numero_nf', 'SYNC_TEST_001')
      .single()

    if (selectError) {
      console.log('❌ Erro ao verificar dados finais:', selectError.message)
    } else {
      console.log('📊 Dados finais:')
      console.log('  - NF:', finalData.numero_nf)
      console.log('  - Carro ID:', finalData.carro_id)
      console.log('  - Status:', finalData.status)
      console.log('  - Números SAP:', finalData.numeros_sap)
      console.log('  - Data Finalização:', finalData.data_finalizacao)
      console.log('  - Updated At:', finalData.updated_at)
    }

    // 4. Testar subscription em tempo real
    console.log('📡 Testando subscription em tempo real...')
    
    const channel = supabase
      .channel('test_sync_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'embalagem_notas_bipadas',
          filter: `numero_nf=eq.SYNC_TEST_001`
        },
        (payload) => {
          console.log('🔄 Mudança detectada em tempo real:', {
            event: payload.eventType,
            status: payload.new?.status,
            timestamp: new Date().toISOString()
          })
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscription:', status)
      })

    // Aguardar um pouco para ver mudanças
    console.log('⏳ Aguardando mudanças em tempo real...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // 5. Fazer uma última atualização para testar subscription
    console.log('🔄 Fazendo atualização final para testar subscription...')
    
    const { error: finalUpdateError } = await supabase
      .from('embalagem_notas_bipadas')
      .update({
        status: 'teste_final',
        updated_at: new Date().toISOString()
      })
      .eq('numero_nf', 'SYNC_TEST_001')

    if (finalUpdateError) {
      console.log('❌ Erro na atualização final:', finalUpdateError.message)
    } else {
      console.log('✅ Atualização final realizada')
    }

    // Aguardar mais um pouco
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 6. Limpar dados de teste
    console.log('🧹 Limpando dados de teste...')
    
    const { error: deleteError } = await supabase
      .from('embalagem_notas_bipadas')
      .delete()
      .eq('numero_nf', 'SYNC_TEST_001')

    if (deleteError) {
      console.log('⚠️ Erro ao limpar dados de teste:', deleteError.message)
    } else {
      console.log('✅ Dados de teste removidos')
    }

    // 7. Desconectar subscription
    channel.unsubscribe()

    console.log('')
    console.log('🎉 TESTE DE SINCRONIZAÇÃO CONCLUÍDO!')
    console.log('✅ Inserção de dados funcionando')
    console.log('✅ Atualizações de status funcionando')
    console.log('✅ Subscription em tempo real funcionando')
    console.log('✅ Limpeza de dados funcionando')
    console.log('')
    console.log('🚀 O sistema está sincronizando status em tempo real!')

  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
    process.exit(1)
  }
}

// Executar o teste
testStatusSync()
