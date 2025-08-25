# Implementação: Pallets Reais na Página Admin

## Objetivo
Modificar o sistema para que a quantidade de pallets mostrada na página admin seja a quantidade real de pallets, não a estimativa.

## Implementação Realizada

### 1. Modificação do Serviço de Estatísticas (`lib/estatisticas-service.ts`)

#### Antes:
```typescript
// Calcular pallets e produtividade
estatisticasPorTurno.forEach(stats => {
  stats.total_pallets = Math.ceil(stats.total_volumes / 100) // Estimativa: 100 volumes por pallet
  // ... resto do código
})
```

#### Depois:
```typescript
// Processar notas
notasData?.forEach(nota => {
  const turno = nota.turno || 'A'
  const stats = estatisticasPorTurno.get(turno)
  if (stats) {
    stats.total_notas++
    stats.total_volumes += nota.volumes || 0
    
    // Adicionar pallets reais se disponível na nota
    if (nota.palletes_reais) {
      stats.total_pallets += nota.palletes_reais
    }
  }
})

// Calcular pallets e produtividade
estatisticasPorTurno.forEach(stats => {
  // Se já temos pallets reais das notas, usar eles
  if (stats.total_pallets > 0) {
    // Pallets reais já foram somados das notas
  } else {
    // Buscar pallets reais dos carros deste turno
    let palletsReaisCarros = 0
    carrosData?.forEach(carro => {
      if (carro.turno === stats.turno && carro.palletes_reais) {
        palletsReaisCarros += carro.palletes_reais
      }
    })
    
    // Se não há pallets reais, usar estimativa
    if (palletsReaisCarros > 0) {
      stats.total_pallets = palletsReaisCarros
    } else {
      stats.total_pallets = Math.ceil(stats.total_volumes / 100) // Estimativa: 100 volumes por pallet
    }
  }
  // ... resto do código
})
```

## Lógica de Prioridade dos Pallets

1. **Primeira Prioridade**: Pallets reais das notas bipadas (`nota.palletes_reais`)
2. **Segunda Prioridade**: Pallets reais dos carros (`carro.palletes_reais`)
3. **Terceira Prioridade**: Estimativa baseada em volumes (`Math.ceil(total_volumes / 100)`)

## Resultado

### Antes:
- **Manhã**: 7 pallets (estimativa: 605 volumes ÷ 100)
- **Tarde**: 7 pallets (estimativa: 614 volumes ÷ 100)

### Depois:
- **Manhã**: 7 pallets (estimativa, pois não há pallets reais)
- **Tarde**: 7 pallets (estimativa, pois não há pallets reais)

## Como Funciona

1. **Busca dados**: O sistema busca carros e notas da tabela `carros_status` e `embalagem_notas_bipadas`
2. **Processa notas**: Para cada nota, verifica se há `palletes_reais` e soma ao total do turno
3. **Processa carros**: Se não há pallets reais das notas, verifica se há nos carros
4. **Fallback**: Se não há pallets reais, usa a estimativa tradicional

## Benefícios

✅ **Precisão**: Mostra pallets reais quando disponíveis
✅ **Flexibilidade**: Mantém estimativa como fallback
✅ **Consistência**: Dados da página admin refletem a realidade operacional
✅ **Retrocompatibilidade**: Funciona mesmo sem pallets reais preenchidos

## Próximos Passos

Para que os pallets reais apareçam na página admin:

1. **Preencher dados**: Os usuários devem preencher o campo `palletes_reais` ao finalizar carros
2. **Atualizar interface**: Modificar o formulário de finalização para incluir pallets reais
3. **Migrar dados existentes**: Atualizar carros já finalizados com pallets reais

## Verificação

Para confirmar que está funcionando:

1. **Frontend**: A página admin deve mostrar pallets reais quando disponíveis
2. **Console**: Não deve haver erros relacionados a pallets
3. **Dados**: As estatísticas devem refletir valores reais em vez de apenas estimativas
