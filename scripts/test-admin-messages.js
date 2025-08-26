const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

console.log('🔧 Configuração do Supabase:', { url: supabaseUrl, key: supabaseKey ? '***' : 'undefined' })

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarEnvioMensagem() {
  console.log('🧪 Testando envio de mensagem do admin...')
  
  const mensagemTeste = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    remetente_id: 'admin',
    remetente_nome: 'Administrador',
    remetente_tipo: 'admin',
    destinatario_id: 'chat_coletivo_teste_2024-01-01_A',
    mensagem: 'Mensagem de teste do admin - ' + new Date().toISOString(),
    timestamp: new Date().toISOString(),
    lida: false,
  }

  console.log('📤 Enviando mensagem:', mensagemTeste)

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([mensagemTeste])

    if (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
      return false
    }

    console.log('✅ Mensagem enviada com sucesso!')
    console.log('📊 Dados retornados:', data)
    return true
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
    return false
  }
}

async function testarBuscaMensagens() {
  console.log('\n🔍 Testando busca de mensagens...')
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or('remetente_id.eq.chat_coletivo_teste_2024-01-01_A,destinatario_id.eq.chat_coletivo_teste_2024-01-01_A')
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('❌ Erro ao buscar mensagens:', error)
      return false
    }

    console.log('✅ Mensagens encontradas:', data.length)
    if (data.length > 0) {
      console.log('📋 Última mensagem:', data[data.length - 1])
    }
    return true
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
    return false
  }
}

async function testarTabelaMessages() {
  console.log('\n📋 Verificando estrutura da tabela messages...')
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Erro ao verificar tabela:', error)
      return false
    }

    console.log('✅ Tabela messages está acessível')
    return true
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Iniciando testes de mensagens do admin...\n')
  
  // Teste 1: Verificar se a tabela existe
  const tabelaOk = await testarTabelaMessages()
  if (!tabelaOk) {
    console.error('❌ Falha na verificação da tabela')
    process.exit(1)
  }

  // Teste 2: Enviar mensagem
  const envioOk = await testarEnvioMensagem()
  if (!envioOk) {
    console.error('❌ Falha no envio de mensagem')
    process.exit(1)
  }

  // Teste 3: Buscar mensagens
  const buscaOk = await testarBuscaMensagens()
  if (!buscaOk) {
    console.error('❌ Falha na busca de mensagens')
    process.exit(1)
  }

  console.log('\n🎉 Todos os testes passaram!')
  console.log('✅ O sistema de mensagens do admin está funcionando corretamente')
}

main().catch(console.error)
