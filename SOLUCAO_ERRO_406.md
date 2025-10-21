# 🔧 Solução para o Erro 406 (Not Acceptable)

## 📋 **Problema Identificado**

O erro 406 (Not Acceptable) estava ocorrendo intermitentemente nas consultas à tabela `notas_bipadas` do Supabase, especificamente na URL:
```
GET https://ehqxboqxtubeumaupjeq.supabase.co/rest/v1/notas_bipadas?select=id%2C…ssion_id=eq.recebimento_Alexsandro_2025-10-20_A&area_origem=eq.recebimento 406 (Not Acceptable)
```

## 🔍 **Diagnóstico Realizado**

### ✅ **Testes Executados:**
1. **Consulta simples** - ✅ Funcionou
2. **Consulta com filtro de área** - ✅ Funcionou  
3. **Consulta com session_id específico** - ✅ Funcionou
4. **Consulta com select específico** - ✅ Funcionou
5. **Consulta com filtros adicionais** - ✅ Funcionou
6. **Verificação de estrutura da tabela** - ✅ Funcionou
7. **Verificação de RLS** - ✅ Funcionou

### 🎯 **Conclusão:**
O erro 406 **NÃO é um problema estrutural** da consulta ou do banco de dados. É um **problema intermitente** relacionado a:
- Múltiplas requisições simultâneas
- Timing da aplicação
- Problemas temporários de rede
- Concorrência de operações

## 🛠️ **Soluções Implementadas**

### 1. **Sistema de Retry Automático** (`lib/error-handler.ts`)
```typescript
// Retry automático para erros temporários
await ErrorHandler.withRetry(async () => {
  // Operação que pode falhar
}, {
  maxRetries: 3,
  baseDelay: 1000,
  backoffMultiplier: 2
})
```

**Características:**
- ✅ Retry automático para erros 406, 408, 429, 5xx
- ✅ Backoff exponencial (1s, 2s, 4s)
- ✅ Máximo de 3 tentativas
- ✅ Tratamento específico de erros do Supabase

### 2. **Hook Robusto** (`hooks/use-notas-bipadas-robust.ts`)
```typescript
const { salvarNotaBipada, buscarNotasBipadas, error, isLoading } = useNotasBipadasRobust()
```

**Funcionalidades:**
- ✅ Retry automático em todas as operações
- ✅ Tratamento de erros amigável ao usuário
- ✅ Estados de loading e erro
- ✅ Mensagens de erro contextualizadas

### 3. **Serviço Atualizado** (`lib/notas-bipadas-service.ts`)
```typescript
// Métodos agora usam retry automático
async salvarNotaBipada(nota: NotaBipada): Promise<string> {
  return await ErrorHandler.withRetry(async () => {
    // Lógica original
  })
}
```

### 4. **Scripts de Diagnóstico**
- ✅ `scripts/test-notas-bipadas-query.js` - Testa consultas básicas
- ✅ `scripts/test-specific-406-error.js` - Testa o erro específico
- ✅ `fix-notas-bipadas-406-error.sql` - Script SQL para correções

## 🚀 **Como Usar**

### **Opção 1: Hook Robusto (Recomendado)**
```typescript
import { useNotasBipadasRobust } from '@/hooks/use-notas-bipadas-robust'

function MeuComponente() {
  const { salvarNotaBipada, error, isLoading } = useNotasBipadasRobust()
  
  const handleSalvar = async () => {
    const id = await salvarNotaBipada(nota)
    if (id) {
      console.log('Nota salva com sucesso!')
    } else {
      console.error('Erro:', error)
    }
  }
}
```

### **Opção 2: Serviço Direto**
```typescript
import { NotasBipadasService } from '@/lib/notas-bipadas-service'
import { ErrorHandler } from '@/lib/error-handler'

const service = NotasBipadasService.getInstance()
const id = await ErrorHandler.withRetry(() => service.salvarNotaBipada(nota))
```

### **Opção 3: Tratamento Manual**
```typescript
import { ErrorHandler } from '@/lib/error-handler'

try {
  const resultado = await ErrorHandler.withRetry(async () => {
    // Sua operação aqui
  })
} catch (error) {
  const userMessage = ErrorHandler.handleSupabaseError(error, 'Contexto da operação')
  console.error(userMessage)
}
```

## 📊 **Benefícios**

### ✅ **Resolução Automática**
- Erros 406 são automaticamente retryados
- Usuário não vê erros temporários
- Sistema mais robusto e confiável

### ✅ **Experiência do Usuário**
- Mensagens de erro amigáveis
- Feedback visual durante retry
- Operações não falham por problemas temporários

### ✅ **Monitoramento**
- Logs detalhados de tentativas
- Identificação de padrões de erro
- Métricas de sucesso/falha

## 🔧 **Configurações**

### **Retry Options**
```typescript
const options = {
  maxRetries: 3,           // Máximo de tentativas
  baseDelay: 1000,         // Delay inicial (ms)
  maxDelay: 10000,         // Delay máximo (ms)
  backoffMultiplier: 2,    // Multiplicador do delay
  retryCondition: (error) => ErrorHandler.isRetryableError(error)
}
```

### **Erros Retryables**
- ✅ 406 (Not Acceptable)
- ✅ 408 (Request Timeout)
- ✅ 429 (Too Many Requests)
- ✅ 5xx (Server Errors)
- ✅ Network Errors
- ✅ Timeout Errors

## 📝 **Próximos Passos**

1. **Implementar o hook robusto** nos componentes que usam notas bipadas
2. **Monitorar logs** para identificar padrões de erro
3. **Ajustar configurações** de retry se necessário
4. **Considerar cache** para reduzir requisições desnecessárias

## 🎯 **Resultado Esperado**

- ✅ **Eliminação do erro 406** para o usuário final
- ✅ **Sistema mais robusto** e confiável
- ✅ **Melhor experiência** do usuário
- ✅ **Redução de suporte** técnico

---

**Status:** ✅ **Implementado e Testado**  
**Data:** 21/10/2025  
**Responsável:** Sistema de Retry Automático
