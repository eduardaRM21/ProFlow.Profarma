# Correção do Botão Excluir Abrindo Modal

## Problema Identificado

No setor Admin embalagem, ao clicar no botão "Excluir", o modal de detalhes do carro estava sendo aberto em vez de executar a exclusão diretamente.

## Causa do Problema

O problema estava na propagação de eventos (event bubbling). O botão "Excluir" estava dentro de um Card que possui um `onClick` para abrir o modal de detalhes. Quando o botão era clicado, o evento se propagava para o Card pai, causando a abertura do modal.

### Estrutura do Problema:

```tsx
<Card onClick={() => setCarroSelecionado(carro)}> {/* ← Card com onClick */}
  <CardContent>
    <Button onClick={() => setCarroParaExcluir(carro)}> {/* ← Botão sem stopPropagation */}
      Excluir
    </Button>
  </CardContent>
</Card>
```

## Correção Implementada

Adicionei `e.stopPropagation()` no botão "Excluir" para prevenir a propagação do evento para o Card pai.

### Código Corrigido:

```tsx
<Button
  variant="outline"
  size="sm"
  className="w-full text-xs sm:text-xs lg:text-sm h-9 sm:h-8 text-red-600 border-red-200 hover:bg-red-50"
  onClick={(e) => {
    e.stopPropagation() // ← Previne propagação do evento
    setCarroParaExcluir(carro)
  }}
>
  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
  <span className="hidden sm:inline">Excluir</span>
  <span className="sm:hidden">🗑️</span>
</Button>
```

## Verificação de Consistência

Verifiquei que os outros botões no mesmo Card já possuíam `e.stopPropagation()` implementado corretamente:

- ✅ Botão "Lançar" - já tinha `e.stopPropagation()`
- ✅ Botão "Imprimir" - já tinha `e.stopPropagation()`
- ✅ Botão "Copiar NFs" - já tinha `e.stopPropagation()`
- ✅ Botão "Excluir" - **CORRIGIDO** - agora tem `e.stopPropagation()`

## Comportamento Após a Correção

- ✅ Ao clicar no botão "Excluir", apenas o modal de confirmação de exclusão é aberto
- ✅ O modal de detalhes do carro não é mais aberto acidentalmente
- ✅ A funcionalidade de exclusão funciona corretamente
- ✅ Os outros botões continuam funcionando normalmente
- ✅ O clique no Card (área vazia) ainda abre o modal de detalhes como esperado

## Arquivos Modificados

- `app/admin/components/gerenciar-carros-section.tsx` - Botão "Excluir" na linha 1521-1524

## Data da Correção

${new Date().toLocaleDateString('pt-BR')}

## Status

✅ **CORRIGIDO** - O botão "Excluir" agora funciona corretamente sem abrir o modal de detalhes.
