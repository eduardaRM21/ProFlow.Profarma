# Correção: Carros por Status Não Estavam Carregando

## Problema Identificado
O sistema de estatísticas "Carros por Status" não estava exibindo dados, mesmo com dados existentes no banco.

## Causa Raiz
**Mapeamento incorreto dos turnos** entre o banco de dados e o serviço de estatísticas:

- **Banco de dados**: Usa `A`, `B`, `C` para representar turnos
- **Serviço de estatísticas**: Estava procurando por `manha`, `tarde`, `noite`

## Mapeamento Correto dos Turnos
```typescript
// Sistema usa:
A = Manhã
B = Tarde  
C = Noite

// Serviço estava procurando por:
manha = ❌ (não existe)
tarde = ❌ (não existe)
noite = ❌ (não existe)
```

## Arquivos Corrigidos

### 1. `lib/estatisticas-service.ts`
```typescript
// ANTES:
const turnos = ['manha', 'tarde', 'noite']

// DEPOIS:
const turnos = ['A', 'B', 'C'] // A=Manhã, B=Tarde, C=Noite
```

### 2. `hooks/use-estatisticas.ts`
```typescript
// ANTES:
const formatarTurno = (turno: string) => {
  switch (turno) {
    case 'manha': return 'Manhã'
    case 'tarde': return 'Tarde'
    case 'noite': return 'Noite'
    default: return turno
  }
}

// DEPOIS:
const formatarTurno = (turno: string) => {
  switch (turno) {
    case 'A': return 'Manhã'
    case 'B': return 'Tarde'
    case 'C': return 'Noite'
    default: return turno
  }
}
```

## Resultado da Correção
✅ **ANTES**: 0 carros exibidos (dados existiam mas não eram encontrados)
✅ **DEPOIS**: 4 carros exibidos corretamente para o turno A (Manhã)

## Dados de Teste (2025-08-22)
```
Manhã (Turno A):
  Total Carros: 4
  Embalando: 0
  Lançados: 4
  Finalizados: 0
  Total Notas: 9
  Total Volumes: 605
  Total Pallets: 7
  Produtividade/h: 76
```

## Verificação
Para confirmar que a correção funcionou:

1. **Frontend**: Os carros por status agora devem aparecer corretamente
2. **Console**: Não deve haver mais erros relacionados a turnos
3. **Dados**: As estatísticas devem mostrar valores reais em vez de zeros

## Prevenção Futura
- Sempre verificar o mapeamento de valores entre banco de dados e frontend
- Usar constantes ou enums para mapear valores críticos
- Documentar convenções de nomenclatura do sistema
