# 📊 Relatórios Liberados Parcialmente no Modal de Seleção de Transportadora

## 📋 **Funcionalidade Implementada**

No setor de recebimento, o modal "Selecionar Transportadora" agora exibe informações detalhadas sobre relatórios que foram liberados parcialmente, mostrando a quantidade e porcentagem de notas faltantes.

## ✅ **O que foi Implementado**

### 1. **Nova Seção no Modal**
- Seção dedicada para relatórios liberados parcialmente
- Aparece apenas quando há relatórios com status `liberado_parcialmente`
- Posicionada entre a seleção de transportadora e os botões de ação

### 2. **Informações Exibidas**
Para cada relatório liberado parcialmente:
- **Nome do relatório**
- **Data do relatório**
- **Quantidade processada vs total** (ex: 8/10)
- **Porcentagem de progresso** (ex: 80%)
- **Quantidade de notas faltantes** (ex: 2 nota(s) ainda não processada(s))

### 3. **Visual Design**
- Cards com fundo laranja claro para destacar
- Badges informativos com cores consistentes
- Layout responsivo e compacto
- Scroll vertical quando há muitos relatórios

## 🔧 **Implementação Técnica**

### **1. Estado Adicionado**
```typescript
const [relatoriosLiberadosParcialmente, setRelatoriosLiberadosParcialmente] = useState<any[]>([])
```

### **2. Função de Carregamento**
```typescript
const carregarRelatoriosLiberadosParcialmente = async () => {
  // Buscar relatórios com status 'liberado_parcialmente'
  // Calcular progresso baseado em notas processadas
  // Incluir informações de notas faltantes
}
```

### **3. Consultas ao Banco**
```sql
-- Buscar relatórios liberados parcialmente
SELECT id, nome, area, data, status, total_divergencias
FROM relatorios
WHERE area = 'recebimento' 
  AND status = 'liberado_parcialmente'
ORDER BY data DESC
LIMIT 10

-- Para cada relatório, buscar total de notas
SELECT nota_fiscal_id
FROM relatorio_notas
WHERE relatorio_id = ?

-- Buscar status das notas para calcular progresso
SELECT id, status
FROM notas_fiscais
WHERE id IN (?)
```

### **4. Cálculo de Progresso**
```typescript
const notasProcessadas = notasFiscaisData?.filter(nota => 
  nota.status === 'ok' || nota.status === 'devolvida' || nota.status === 'divergencia'
).length || 0

const percentual = totalNotas > 0 ? Math.round((notasProcessadas / totalNotas) * 100) : 0
const notasFaltantes = totalNotas - notasProcessadas
```

## 📊 **Interface do Usuário**

### **Seção de Relatórios Liberados Parcialmente**
```
┌─────────────────────────────────────────────────────────┐
│ 📦 Relatórios Liberados Parcialmente                    │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Relatório 17/10/2025 - DHL                          │ │
│ │ Data: 2025-10-17                                    │ │
│ │                    [8/10] [80%]                     │ │
│ │ ⚠️ 2 nota(s) ainda não processada(s)                │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Relatório 16/10/2025 - Correios                     │ │
│ │ Data: 2025-10-16                                    │ │
│ │                    [15/20] [75%]                    │ │
│ │ ⚠️ 5 nota(s) ainda não processada(s)                │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **Estados Visuais**
- **Cards laranja claro** - Destaque para relatórios parciais
- **Badges informativos** - Quantidade e porcentagem
- **Aviso de notas faltantes** - Quantidade específica
- **Scroll vertical** - Para muitos relatórios

## 🎯 **Benefícios para o Usuário**

### ✅ **Visibilidade Completa**
- Usuário vê todos os relatórios com processamento incompleto
- Informações claras sobre o que ainda precisa ser feito
- Quantidade específica de notas faltantes

### ✅ **Tomada de Decisão**
- Pode priorizar relatórios com mais notas faltantes
- Entende o progresso atual de cada relatório
- Identifica rapidamente relatórios que precisam de atenção

### ✅ **Eficiência Operacional**
- Não precisa navegar para outros modais para ver status
- Informações centralizadas no ponto de seleção
- Interface intuitiva e informativa

## 📱 **Responsividade**

### **Desktop**
- Cards em layout vertical
- Informações completas visíveis
- Badges alinhados à direita

### **Mobile**
- Cards compactos
- Texto truncado quando necessário
- Badges empilhados verticalmente

## 🔄 **Atualização Automática**

### **Quando os Dados são Atualizados**
- Modal é aberto
- Lista de transportadoras é recarregada
- Relatórios liberados parcialmente são recarregados

### **Performance**
- Consultas otimizadas com LIMIT
- Carregamento assíncrono
- Cache de dados durante a sessão

## 📊 **Exemplo de Uso**

### **Cenário Real:**
1. Usuário abre modal "Selecionar Transportadora"
2. Vê lista de transportadoras disponíveis
3. **NOVA FUNCIONALIDADE:** Vê seção de relatórios liberados parcialmente
4. Identifica que há 2 relatórios com processamento incompleto:
   - Relatório DHL: 8/10 notas (80%) - 2 faltantes
   - Relatório Correios: 15/20 notas (75%) - 5 faltantes
5. Pode decidir priorizar o processamento desses relatórios

## 🛠️ **Arquivos Modificados**

### **`app/recebimento/components/selecao-transportadora-modal.tsx`**
- ✅ Adicionado estado para relatórios liberados parcialmente
- ✅ Implementada função de carregamento
- ✅ Adicionada seção visual no modal
- ✅ Implementado cálculo de progresso e notas faltantes

## 🎯 **Resultado Final**

- ✅ **Visibilidade completa** de relatórios com processamento incompleto
- ✅ **Informações detalhadas** sobre quantidade e porcentagem faltante
- ✅ **Interface intuitiva** com design consistente
- ✅ **Performance otimizada** com consultas eficientes
- ✅ **Experiência melhorada** para o usuário do setor de recebimento

---

**Status:** ✅ **Implementado e Testado**  
**Data:** 21/10/2025  
**Responsável:** Sistema de Relatórios Liberados Parcialmente  
**Arquivo:** `app/recebimento/components/selecao-transportadora-modal.tsx`
