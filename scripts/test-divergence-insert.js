const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://ehqxboqxtubeumaupjeq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXhib3F4dHViZXVtYXVwamVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzcyODQsImV4cCI6MjA3NDMxMzI4NH0.Er0IuDQeEtJ6AzFua_BAPFkcG_rmgg35QgdF0gpfwWw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarInsercaoDivergencia() {
  console.log('🧪 Testando inserção de divergência...')
  
  try {
    // Primeiro, buscar uma nota fiscal existente
    const { data: notas, error: notasError } = await supabase
      .from('notas_fiscais')
      .select('id, numero_nf')
      .limit(1)
    
    if (notasError) {
      console.error('❌ Erro ao buscar notas fiscais:', notasError)
      return false
    }
    
    if (!notas || notas.length === 0) {
      console.log('⚠️ Nenhuma nota fiscal encontrada para teste')
      return false
    }
    
    const notaId = notas[0].id
    console.log('📋 Usando nota fiscal para teste:', notas[0].numero_nf, 'ID:', notaId)
    
    // Tentar inserir uma divergência
    const divergenciaData = {
      nota_fiscal_id: notaId,
      tipo: 'volumes',
      descricao: 'Teste de divergência',
      volumes_informados: 10,
      volumes_reais: 8,
      observacoes: 'Teste de inserção de divergência'
    }
    
    console.log('📝 Tentando inserir divergência:', divergenciaData)
    
    const { data, error } = await supabase
      .from('divergencias')
      .insert(divergenciaData)
      .select()
    
    if (error) {
      console.error('❌ Erro ao inserir divergência:', error)
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return false
    }
    
    console.log('✅ Divergência inserida com sucesso:', data)
    
    // Limpar o teste
    const { error: deleteError } = await supabase
      .from('divergencias')
      .delete()
      .eq('id', data[0].id)
    
    if (deleteError) {
      console.warn('⚠️ Erro ao limpar teste:', deleteError)
    } else {
      console.log('🧹 Teste limpo com sucesso')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
    return false
  }
}

async function testarConsultaDivergencias() {
  console.log('\n🔍 Testando consulta de divergências...')
  
  try {
    const { data, error } = await supabase
      .from('divergencias')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('❌ Erro ao consultar divergências:', error)
      return false
    }
    
    console.log('✅ Consulta de divergências funcionando')
    console.log('📊 Total de divergências encontradas:', data.length)
    
    if (data.length > 0) {
      console.log('📋 Exemplo de divergência:', data[0])
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Erro na consulta:', error)
    return false
  }
}

async function testarPermissoes() {
  console.log('\n🔐 Testando permissões da tabela divergencias...')
  
  try {
    // Testar SELECT
    const { data: selectData, error: selectError } = await supabase
      .from('divergencias')
      .select('*', { count: 'exact', head: true })
    
    if (selectError) {
      console.error('❌ Erro no SELECT:', selectError)
      return false
    }
    
    console.log('✅ SELECT funcionando')
    
    // Testar INSERT (sem dados reais)
    const { error: insertError } = await supabase
      .from('divergencias')
      .insert({
        nota_fiscal_id: '00000000-0000-0000-0000-000000000000', // UUID inválido para teste
        tipo: 'teste',
        descricao: 'teste',
        volumes_informados: 1,
        volumes_reais: 1,
        observacoes: 'teste'
      })
    
    if (insertError) {
      if (insertError.code === '23503') {
        console.log('✅ INSERT funcionando (erro esperado por FK inválida)')
        return true
      } else {
        console.error('❌ Erro inesperado no INSERT:', insertError)
        return false
      }
    }
    
    console.log('✅ INSERT funcionando')
    return true
    
  } catch (error) {
    console.error('❌ Erro nas permissões:', error)
    return false
  }
}

async function main() {
  console.log('🔧 Teste de Divergências')
  console.log('========================')
  
  const resultados = {
    consulta: await testarConsultaDivergencias(),
    permissoes: await testarPermissoes(),
    insercao: await testarInsercaoDivergencia()
  }
  
  console.log('\n📊 Resultados dos Testes:')
  console.log('========================')
  console.log('Consulta de divergências:', resultados.consulta ? '✅' : '❌')
  console.log('Permissões da tabela:', resultados.permissoes ? '✅' : '❌')
  console.log('Inserção de divergência:', resultados.insercao ? '✅' : '❌')
  
  console.log('\n🎯 Conclusão:')
  if (resultados.consulta && resultados.permissoes && resultados.insercao) {
    console.log('✅ Tabela divergencias está funcionando corretamente!')
    console.log('✅ Problema pode estar na lógica de inserção do código')
  } else {
    console.log('❌ Há problemas com a tabela divergencias')
    console.log('❌ Verificar políticas RLS e permissões')
  }
}

main().catch(console.error)
