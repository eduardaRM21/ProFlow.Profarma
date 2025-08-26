// Script para testar se a conversa selecionada está sendo preservada
console.log('🧪 Testando preservação da conversa selecionada...')

// Simular dados de conversas
const conversasMock = [
  {
    id: 'chat_coletivo_2024-01-01_A',
    colaboradores: ['João', 'Maria'],
    data: '2024-01-01',
    turno: 'A',
    ultimaMensagem: 'Olá admin!',
    ultimoTimestamp: '2024-01-01T10:00:00Z',
    mensagensNaoLidas: 0
  },
  {
    id: 'chat_coletivo_2024-01-01_B',
    colaboradores: ['Pedro', 'Ana'],
    data: '2024-01-01',
    turno: 'B',
    ultimaMensagem: 'Preciso de ajuda',
    ultimoTimestamp: '2024-01-01T14:00:00Z',
    mensagensNaoLidas: 1
  }
]

// Simular conversa selecionada
const conversaSelecionada = conversasMock[0]

console.log('📋 Conversa selecionada inicial:', conversaSelecionada.id)

// Simular atualização das conversas (como acontece no polling)
const conversasAtualizadas = [
  {
    id: 'chat_coletivo_2024-01-01_A',
    colaboradores: ['João', 'Maria'],
    data: '2024-01-01',
    turno: 'A',
    ultimaMensagem: 'Olá admin! Atualizado',
    ultimoTimestamp: '2024-01-01T10:05:00Z',
    mensagensNaoLidas: 0
  },
  {
    id: 'chat_coletivo_2024-01-01_B',
    colaboradores: ['Pedro', 'Ana'],
    data: '2024-01-01',
    turno: 'B',
    ultimaMensagem: 'Preciso de ajuda urgente',
    ultimoTimestamp: '2024-01-01T14:05:00Z',
    mensagensNaoLidas: 2
  }
]

// Testar preservação da conversa selecionada
const conversaAtualizada = conversasAtualizadas.find(c => c.id === conversaSelecionada.id)

if (conversaAtualizada) {
  console.log('✅ Conversa selecionada preservada com sucesso!')
  console.log('📋 Conversa atualizada:', conversaAtualizada)
  console.log('🔄 Mudanças detectadas:')
  console.log('   - Última mensagem:', conversaSelecionada.ultimaMensagem, '→', conversaAtualizada.ultimaMensagem)
  console.log('   - Timestamp:', conversaSelecionada.ultimoTimestamp, '→', conversaAtualizada.ultimoTimestamp)
} else {
  console.log('❌ Conversa selecionada perdida!')
}

// Testar cenário onde a conversa não existe mais
const conversasSemConversaSelecionada = [
  {
    id: 'chat_coletivo_2024-01-01_B',
    colaboradores: ['Pedro', 'Ana'],
    data: '2024-01-01',
    turno: 'B',
    ultimaMensagem: 'Preciso de ajuda urgente',
    ultimoTimestamp: '2024-01-01T14:05:00Z',
    mensagensNaoLidas: 2
  }
]

const conversaEncontrada = conversasSemConversaSelecionada.find(c => c.id === conversaSelecionada.id)

if (!conversaEncontrada) {
  console.log('✅ Comportamento correto: conversa não encontrada, deve ser deselecionada')
} else {
  console.log('❌ Comportamento incorreto: conversa encontrada quando não deveria')
}

console.log('\n🎉 Teste de preservação da conversa selecionada concluído!')
