# ATUALIZAÇÃO AUTOMÁTICA DO NOME DO CARRO

## Problema Resolvido ✅

O nome do carro agora é **atualizado automaticamente** com o número SAP quando o carro é lançado.

## Como Funciona

### 1. **Busca do Número do Carro**
Quando um carro é marcado para "lançar":
- O sistema busca automaticamente na tabela `embalagem_carros_finalizados`
- Encontra o número do carro correspondente
- Se não encontrar, usa o `carro_id` como fallback

### 2. **Atualização Automática do Nome**
O sistema atualiza automaticamente:
- **Nome do carro**: `Carro ${numeroSAP}` ou `Carro ${carro_id}`
- **Status**: `lancado`
- **Números SAP**: Array com os números fornecidos
- **Data de finalização**: Timestamp atual

### 3. **Tabelas Atualizadas**
As seguintes tabelas são atualizadas simultaneamente:

#### Tabela `carros_status`
```sql
UPDATE carros_status SET
  status_carro = 'lancado',
  nome_carro = 'Carro 12345', -- Número SAP encontrado
  numeros_sap = ['12345', '67890'],
  data_finalizacao = '2025-01-27T10:30:00Z',
  updated_at = NOW()
WHERE carro_id = 'carro_1_1755808538039';
```

#### Tabela `embalagem_notas_bipadas`
```sql
UPDATE embalagem_notas_bipadas SET
  status = 'lancado',
  numeros_sap = ['12345', '67890'],
  data_finalizacao = '2025-01-27T10:30:00Z',
  updated_at = NOW()
WHERE carro_id = 'carro_1_1755808538039';
```

## Exemplo Prático

### Antes do Lançamento
```
Nome do carro: "Carro carro_1_1755808538039"
Status: "embalando"
Números SAP: []
```

### Após o Lançamento
```
Nome do carro: "Carro 12345" ← Atualizado automaticamente!
Status: "lancado"
Números SAP: ["12345", "67890"]
```

## Código Implementado

### 1. **Serviço Principal** (`EmbalagemNotasBipadasService.lancarCarro`)
```typescript
// Atualizar nome do carro com número SAP encontrado
const { error: carroError } = await retryWithBackoff(async () => {
  return await getSupabase()
    .from('carros_status')
    .update({
      status_carro: 'lancado',
      nome_carro: `Carro ${numeroCarro}`, // ← Nome atualizado aqui!
      numeros_sap: numerosSAP,
      data_finalizacao: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('carro_id', carroId)
})
```

### 2. **Hook de Estado** (`useCarrosRealtime.lancarCarro`)
```typescript
// Atualizar estado local imediatamente
setCarros(prevCarros => 
  prevCarros.map(carro => 
    carro.carro_id === carroId 
      ? { 
          ...carro, 
          status_carro: 'lancado',
          nome_carro: `Carro ${result.numeroCarro || carroId}`, // ← Nome atualizado aqui!
          numeros_sap: numerosSAP,
          data_finalizacao: new Date().toISOString()
        }
      : carro
  )
)
```

## Fluxo Completo

```
1. Admin clica em "Lançar" no carro
   ↓
2. Sistema busca número na tabela embalagem_carros_finalizados
   ↓
3. Sistema atualiza carros_status:
   - status_carro = 'lancado'
   - nome_carro = 'Carro 12345' ← NOME ATUALIZADO!
   - numeros_sap = ['12345', '67890']
   ↓
4. Sistema atualiza embalagem_notas_bipadas
   ↓
5. Sistema atualiza estado local (nome visível imediatamente)
   ↓
6. Confirmação com novo nome do carro
```

## Benefícios

- ✅ **Nome atualizado automaticamente** com número SAP
- ✅ **Feedback instantâneo** na interface
- ✅ **Consistência** entre todas as tabelas
- ✅ **Rastreabilidade** completa dos números SAP
- ✅ **Interface intuitiva** para o administrador

## Verificação

Após implementar:
1. Execute o SQL de correção da constraint
2. Teste o lançamento de um carro
3. Verifique se o nome foi atualizado para "Carro {númeroSAP}"
4. Confirme se o status mudou para "lancado"
5. Verifique se os números SAP foram salvos

## Resultado Final

Agora quando você lançar um carro:
- O nome será automaticamente atualizado com o número SAP
- A interface mostrará imediatamente o novo nome
- Todas as tabelas estarão sincronizadas
- O carro será facilmente identificável pelo número SAP

🎉 **Problema resolvido! O nome do carro agora é atualizado automaticamente!**
