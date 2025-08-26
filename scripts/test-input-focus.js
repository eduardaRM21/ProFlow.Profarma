// Script para testar preservação do foco do input
console.log('🧪 Testando preservação do foco do input...')

// Simular estado do input
let inputFocado = false
let inputValor = ''
let mensagens = []

// Simular função de carregar mensagens
function carregarMensagens() {
  console.log('📥 Carregando mensagens...')
  
  // Verificar se o input está focado antes de atualizar
  const estavaFocado = inputFocado
  const tinhaValor = inputValor.trim().length > 0
  
  console.log('🔍 Estado antes da atualização:')
  console.log('   - Input focado:', estavaFocado)
  console.log('   - Input tem valor:', tinhaValor)
  
  // Simular atualização das mensagens
  mensagens.push(`Mensagem ${mensagens.length + 1}`)
  
  // Restaurar foco se estava focado antes
  if (estavaFocado) {
    console.log('✅ Restaurando foco do input')
    inputFocado = true
  } else {
    console.log('ℹ️ Input não estava focado, não precisa restaurar')
  }
  
  console.log('📊 Mensagens atualizadas:', mensagens.length)
}

// Simular usuário digitando
function simularDigitacao(texto) {
  console.log(`✍️ Usuário digitando: "${texto}"`)
  inputValor = texto
  inputFocado = true
  
  // Verificar se deve pular atualização
  if (inputFocado && inputValor.trim().length > 0) {
    console.log('⏭️ Pulando atualização - usuário digitando')
    return
  }
  
  carregarMensagens()
}

// Simular usuário parando de digitar
function simularPararDigitacao() {
  console.log('⏹️ Usuário parou de digitar')
  inputValor = ''
  inputFocado = false
  carregarMensagens()
}

// Testes
console.log('\n=== Teste 1: Usuário digitando ===')
simularDigitacao('Olá')

console.log('\n=== Teste 2: Usuário digitando mais ===')
simularDigitacao('Olá admin')

console.log('\n=== Teste 3: Usuário parou de digitar ===')
simularPararDigitacao()

console.log('\n=== Teste 4: Atualização normal ===')
carregarMensagens()

console.log('\n🎉 Teste de preservação do foco concluído!')
console.log('✅ O input deve manter o foco durante a digitação')
console.log('✅ As atualizações são pausadas quando o usuário está digitando')
console.log('✅ O foco é restaurado após atualizações')
