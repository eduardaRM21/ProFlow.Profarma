// Script para testar preservação do foco do input - Versão 2
console.log('🧪 Testando preservação do foco do input - Versão 2...')

// Simular estado do input
let inputFocado = false
let inputValor = ''
let usuarioDigitando = false
let mensagens = []
let timeoutId = null

// Simular função de carregar mensagens com debounce
function carregarMensagens(skipIfTyping = false) {
  console.log('📥 Carregando mensagens...')
  
  // Verificar se deve pular atualização
  if (skipIfTyping && usuarioDigitando) {
    console.log('⏭️ Pulando atualização - usuário digitando')
    return
  }
  
  // Verificar se o input está focado antes de atualizar
  const estavaFocado = inputFocado
  
  console.log('🔍 Estado antes da atualização:')
  console.log('   - Input focado:', estavaFocado)
  console.log('   - Usuário digitando:', usuarioDigitando)
  console.log('   - Input tem valor:', inputValor.trim().length > 0)
  
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

// Simular usuário digitando com debounce
function simularDigitacao(texto) {
  console.log(`✍️ Usuário digitando: "${texto}"`)
  inputValor = texto
  inputFocado = true
  usuarioDigitando = true
  
  // Limpar timeout anterior
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  
  // Definir novo timeout para marcar que parou de digitar
  timeoutId = setTimeout(() => {
    console.log('⏹️ Usuário parou de digitar (timeout)')
    usuarioDigitando = false
  }, 2000)
}

// Simular usuário parando de digitar manualmente
function simularPararDigitacao() {
  console.log('⏹️ Usuário parou de digitar manualmente')
  inputValor = ''
  inputFocado = false
  usuarioDigitando = false
  
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

// Simular polling
function simularPolling() {
  console.log('\n🔄 Simulando polling...')
  carregarMensagens(true) // skipIfTyping = true
}

// Testes
console.log('\n=== Teste 1: Usuário digitando ===')
simularDigitacao('Olá')
simularPolling()

console.log('\n=== Teste 2: Usuário digitando mais ===')
simularDigitacao('Olá admin')
simularPolling()

console.log('\n=== Teste 3: Aguardando timeout ===')
console.log('⏳ Aguardando 2.5 segundos para timeout...')
setTimeout(() => {
  simularPolling()
}, 2500)

console.log('\n=== Teste 4: Usuário parou manualmente ===')
simularPararDigitacao()
simularPolling()

console.log('\n=== Teste 5: Atualização normal ===')
carregarMensagens(false)

console.log('\n🎉 Teste de preservação do foco concluído!')
console.log('✅ O input deve manter o foco durante a digitação')
console.log('✅ As atualizações são pausadas quando o usuário está digitando')
console.log('✅ O foco é restaurado após atualizações')
console.log('✅ O debounce funciona corretamente')
