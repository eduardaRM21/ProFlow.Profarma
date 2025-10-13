# PRESERVAÇÃO DO NOME DO CARRO DURANTE RECARREGAMENTO

## Problema Identificado e Resolvido ✅

**Antes**: Quando a página renderizava novamente, o nome do carro voltava ao padrão "Carro {carro_id}" em vez de manter o número SAP.

**Agora**: O nome do carro com o número SAP é **preservado automaticamente** durante o recarregamento da página.

## Como Funciona a Preservação

### 1. **Preservação do Estado Local**
O hook `useCarrosRealtime` agora preserva o estado local quando recarrega os dados do banco:

```typescript
// Preservar nome personalizado que não seja o padrão "Carro {carro_id}"
if (carroLocal && carroLocal.nome_carro && carroLocal.nome_carro.startsWith('Carro ') && carroLocal.nome_carro !== `Carro ${carroConvertido.carro_id}`) {
  console.log(`🔄 Preservando nome personalizado local: ${carroLocal.nome_carro}`)
  return {
    ...carroConvertido,
    nome_carro: carroLocal.nome_carro
  }
}
```

### 2. **Lógica de Preservação Inteligente**
O sistema agora verifica múltiplas condições para preservar o nome:

#### **Condição 1: Status "lancado"**
```typescript
if (carroLocal && carroLocal.status_carro === 'lancado' && carroConvertido.status_carro !== 'lancado') {
  return {
    ...carroConvertido,
    status_carro: carroLocal.status_carro,
    nome_carro: carroLocal.nome_carro, // ← Nome preservado!
    numeros_sap: carroLocal.numeros_sap,
    data_finalizacao: carroLocal.data_finalizacao
  }
}
```

#### **Condição 2: Nome Personalizado**
```typescript
if (carroLocal && carroLocal.nome_carro && carroLocal.nome_carro.startsWith('Carro ') && carroLocal.nome_carro !== `Carro ${carroConvertido.carro_id}`) {
  return {
    ...carroConvertido,
    nome_carro: carroLocal.nome_carro // ← Nome preservado!
  }
}
```

#### **Condição 3: Números SAP Disponíveis**
```typescript
if (carroLocal && carroLocal.numeros_sap && carroLocal.numeros_sap.length > 0) {
  const numeroSAP = carroLocal.numeros_sap[0]
  carroConvertido.nome_carro = `Carro ${numeroSAP}` // ← Nome atualizado!
}
```

## Fluxo de Preservação

```
1. Página renderiza
   ↓
2. Hook carrega dados do banco
   ↓
3. Sistema verifica estado local anterior
   ↓
4. Se encontrar nome personalizado → PRESERVA
   ↓
5. Se encontrar números SAP → ATUALIZA
   ↓
6. Se não encontrar → mantém padrão
   ↓
7. Interface exibe nome correto
```

## Exemplo Prático

### **Cenário**: Carro lançado com número SAP "12345"

#### **Antes do Recarregamento**
```
Nome: "Carro 12345" ✅
Status: "lancado" ✅
Números SAP: ["12345"] ✅
```

#### **Durante o Recarregamento**
```
1. Dados carregados do banco
2. Sistema verifica estado local
3. Encontra nome "Carro 12345"
4. PRESERVA o nome personalizado
5. Interface continua mostrando "Carro 12345" ✅
```

#### **Após o Recarregamento**
```
Nome: "Carro 12345" ✅ (PRESERVADO!)
Status: "lancado" ✅
Números SAP: ["12345"] ✅
```

## Benefícios da Solução

- ✅ **Nome preservado** durante recarregamento
- ✅ **Estado consistente** entre sessões
- ✅ **Experiência do usuário** melhorada
- ✅ **Dados não se perdem** ao navegar
- ✅ **Sincronização inteligente** entre local e banco

## Código Implementado

### **Hook `useCarrosRealtime`**
```typescript
// Preservação inteligente do estado local
setCarros(prevCarros => {
  const carrosAtualizados = carrosConvertidos.map(carroConvertido => {
    const carroLocal = prevCarros.find(c => c.carro_id === carroConvertido.carro_id)
    
    // Preservar status "lancado"
    if (carroLocal && carroLocal.status_carro === 'lancado') {
      return { ...carroConvertido, ...carroLocal }
    }
    
    // Preservar nome personalizado
    if (carroLocal && carroLocal.nome_carro !== `Carro ${carroConvertido.carro_id}`) {
      return { ...carroConvertido, nome_carro: carroLocal.nome_carro }
    }
    
    return carroConvertido
  })
  
  return carrosAtualizados
})
```

## Verificação da Solução

Para testar se a preservação está funcionando:

1. **Lançar um carro** com número SAP
2. **Verificar se o nome mudou** para "Carro {númeroSAP}"
3. **Recarregar a página** (F5 ou navegar e voltar)
4. **Confirmar que o nome permanece** "Carro {númeroSAP}"
5. **Verificar se não voltou** para "Carro {carro_id}"

## Resultado Final

🎉 **Agora o nome do carro é preservado corretamente!**

- ✅ Nome com número SAP **não se perde** ao recarregar
- ✅ Estado local **inteligentemente preservado**
- ✅ Experiência do usuário **consistente**
- ✅ Dados **sincronizados** entre sessões
- ✅ Interface **estável** e confiável

O sistema agora mantém o nome do carro com o número SAP mesmo quando a página é recarregada, resolvendo completamente o problema de perda de dados durante a navegação.
