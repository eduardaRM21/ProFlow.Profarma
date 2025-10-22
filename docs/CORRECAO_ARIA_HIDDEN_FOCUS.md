# Correção de Problema aria-hidden com Elementos Focáveis

## 🎯 Problema Identificado

Erro de acessibilidade aparecendo no console:
```
Blocked aria-hidden on an element because its descendant retained focus. 
The focus must not be hidden from assistive technology users. 
Avoid using aria-hidden on a focused element or its ancestor.
```

### Contexto do Problema
- O Dialog do Radix UI aplica `aria-hidden="true"` quando está fechado
- Elementos dentro do Dialog (como botões) mantinham o foco mesmo quando o modal estava sendo fechado
- Isso viola as diretrizes de acessibilidade WCAG

## ✅ Solução Implementada

### 1. **Gerenciamento de Foco Aprimorado**

#### Adicionado `useRef` para rastrear elemento ativo:
```tsx
const previousActiveElement = useRef<HTMLElement | null>(null)
```

#### Gerenciamento no `useEffect`:
```tsx
useEffect(() => {
  if (isOpen) {
    // Salvar elemento ativo antes de abrir o modal
    previousActiveElement.current = document.activeElement as HTMLElement
    carregarTransportadoras()
  } else {
    // Resetar estado quando modal for fechado
    setBipagemIniciadaLocal(false)
    setTransportadoraSelecionada("")
    
    // Restaurar foco para o elemento anterior após um pequeno delay
    // para evitar conflitos com aria-hidden
    setTimeout(() => {
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus()
      }
      previousActiveElement.current = null
    }, 100)
  }
}, [isOpen, notasBipadas])
```

### 2. **Função de Fechamento Segura**

#### Nova função `handleClose`:
```tsx
const handleClose = () => {
  if (podeFechar) {
    // Remover foco de qualquer elemento dentro do modal antes de fechar
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement.blur) {
      activeElement.blur()
    }
    onClose()
  }
}
```

### 3. **Prevenção de Eventos de Fechamento**

#### Adicionado handlers para prevenir fechamento quando necessário:
```tsx
<DialogContent 
  className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-950"
  onEscapeKeyDown={(e) => {
    if (!podeFechar) {
      e.preventDefault()
    }
  }}
  onPointerDownOutside={(e) => {
    if (!podeFechar) {
      e.preventDefault()
    }
  }}
>
```

## 📊 Arquivo Corrigido

### `app/recebimento/components/selecao-transportadora-modal.tsx`
- ✅ Adicionado gerenciamento de foco com `useRef`
- ✅ Implementado `handleClose` para remoção segura de foco
- ✅ Adicionado timeout para restaurar foco após fechamento
- ✅ Prevenção de eventos de fechamento quando `podeFechar` é false

## 🔧 Script de Automação

Criado `scripts/fix-aria-hidden-focus.js` para aplicar a mesma correção em outros modais:

### Funcionalidades do Script:
1. **Adiciona `useRef`** aos imports do React
2. **Cria `previousActiveElement`** ref para rastrear foco
3. **Modifica `useEffect`** para gerenciar foco adequadamente
4. **Adiciona função `handleClose`** para fechamento seguro
5. **Substitui `onClose`** por `handleClose` nos botões

### Como usar:
```bash
node scripts/fix-aria-hidden-focus.js
```

## 🎯 Benefícios Alcançados

### ✅ Acessibilidade
- Eliminado erro de `aria-hidden` com elementos focáveis
- Gerenciamento adequado de foco durante abertura/fechamento
- Conformidade com diretrizes WCAG

### ✅ Experiência do Usuário
- Foco restaurado corretamente após fechamento do modal
- Prevenção de fechamento acidental quando necessário
- Transições suaves sem conflitos de foco

### ✅ Robustez
- Tratamento de casos edge (elementos sem método `focus`)
- Timeout para evitar conflitos de timing
- Verificação de existência de métodos antes de chamá-los

## 🚀 Aplicação em Outros Modais

O script pode ser executado para corrigir outros modais que possam ter o mesmo problema:

### Arquivos que serão verificados:
- `app/recebimento/components/relatorios-modal.tsx`
- `app/recebimento/components/divergencia-modal.tsx`
- `app/recebimento/components/confirmacao-modal.tsx`
- `app/painel/components/chat-modal.tsx`
- `app/painel/components/confirmacao-modal.tsx`
- `app/admin/components/gerenciar-carros-section.tsx`
- `app/admin/components/lancamento-section.tsx`
- `components/admin/change-password-modal.tsx`

## 📝 Recomendações

### 1. **Teste de Acessibilidade**
- Use ferramentas como axe-core ou Lighthouse
- Teste com leitores de tela
- Verifique navegação por teclado

### 2. **Padrões de Desenvolvimento**
- Sempre implementar gerenciamento de foco em novos modais
- Usar a função `handleClose` em vez de `onClose` diretamente
- Testar acessibilidade durante o desenvolvimento

### 3. **Monitoramento Contínuo**
- Executar o script periodicamente
- Verificar console por novos warnings de acessibilidade
- Manter documentação atualizada

## ✅ Status Final

**Problema de aria-hidden com elementos focáveis foi resolvido!**

O modal de seleção de transportadora agora gerencia o foco adequadamente, eliminando o conflito com `aria-hidden` e melhorando a acessibilidade geral da aplicação.
