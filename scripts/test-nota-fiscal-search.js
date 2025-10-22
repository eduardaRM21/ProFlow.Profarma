const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://ehqxboqxtubeumaupjeq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXhib3F4dHViZXVtYXVwamVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzcyODQsImV4cCI6MjA3NDMxMzI4NH0.Er0IuDQeEtJ6AzFua_BAPFkcG_rmgg35QgdF0gpfwWw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarBuscaNotaFiscal() {
  console.log('🔍 Testando busca de notas fiscais...')
  
  try {
    // Buscar algumas notas fiscais para teste
    const { data: notas, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id, numero_nf, status')
      .limit(5)
    
    if (notasError) {
      console.error('❌ Erro ao buscar notas fiscais:', notasError)
      return false
    }
    
    if (!notas || notas.length === 0) {
      console.log('⚠️ Nenhuma nota fiscal encontrada para teste')
      return false
    }
    
    console.log('📋 Notas fiscais encontradas:', notas.length)
    
    // Testar busca por numero_nf específico
    for (const nota of notas) {
      console.log(`\n🔍 Testando busca por numero_nf: ${nota.numero_nf}`)
      
      const { data: buscaResult, error: buscaError } = await supabase
        .from('notas_fiscais')
        .select('id')
        .eq('numero_nf', nota.numero_nf)
        .limit(1)
      
      if (buscaError) {
        console.error('❌ Erro na busca:', buscaError)
        return false
      }
      
      if (buscaResult && buscaResult.length > 0) {
        console.log('✅ Nota encontrada:', buscaResult[0].id)
        
        // Testar inserção de divergência
        const divergenciaData = {
          nota_fiscal_id: buscaResult[0].id,
          tipo: 'volumes',
          descricao: 'Teste de divergência',
          volumes_informados: 10,
          volumes_reais: 8,
          observacoes: 'Teste de inserção de divergência'
        }
        
        console.log('📝 Tentando inserir divergência...')
        
        const { data: divergenciaResult, error: divergenciaError } = await supabase
          .from('divergencias')
          .insert(divergenciaData)
          .select()
        
        if (divergenciaError) {
          console.error('❌ Erro ao inserir divergência:', divergenciaError)
          return false
        }
        
        console.log('✅ Divergência inserida com sucesso:', divergenciaResult[0].id)
        
        // Limpar teste
        const { error: deleteError } = await supabase
          .from('divergencias')
          .delete()
          .eq('id', divergenciaResult[0].id)
        
        if (deleteError) {
          console.warn('⚠️ Erro ao limpar teste:', deleteError)
        } else {
          console.log('🧹 Teste limpo com sucesso')
        }
        
        return true // Teste bem-sucedido
      } else {
        console.log('⚠️ Nota não encontrada na busca')
      }
    }
    
    return false
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
    return false
  }
}

async function testarBuscaPorNumeroNF(numeroNF) {
  console.log(`\n🔍 Testando busca específica por numero_nf: ${numeroNF}`)
  
  try {
    const { data: buscaResult, error: buscaError } = await supabase
      .from('notas_fiscais')
      .select('id, numero_nf, status')
      .eq('numero_nf', numeroNF)
      .limit(1)
    
    if (buscaError) {
      console.error('❌ Erro na busca:', buscaError)
      return false
    }
    
    if (buscaResult && buscaResult.length > 0) {
      console.log('✅ Nota encontrada:', buscaResult[0])
      return true
    } else {
      console.log('⚠️ Nota não encontrada')
      return false
    }
    
  } catch (error) {
    console.error('❌ Erro na busca específica:', error)
    return false
  }
}

async function main() {
  console.log('🔧 Teste de Busca de Notas Fiscais')
  console.log('===================================')
  
  const resultado = await testarBuscaNotaFiscal()
  
  console.log('\n📊 Resultado do Teste:')
  console.log('======================')
  console.log('Busca e inserção de divergência:', resultado ? '✅' : '❌')
  
  // Testar com um número específico se fornecido
  const numeroNFTeste = process.argv[2]
  if (numeroNFTeste) {
    await testarBuscaPorNumeroNF(numeroNFTeste)
  }
  
  console.log('\n🎯 Conclusão:')
  if (resultado) {
    console.log('✅ Busca de notas fiscais e inserção de divergências funcionando!')
    console.log('✅ Problema pode estar na lógica específica do código')
  } else {
    console.log('❌ Há problemas com a busca de notas fiscais')
    console.log('❌ Verificar estrutura da tabela e dados')
  }
}

main().catch(console.error)
