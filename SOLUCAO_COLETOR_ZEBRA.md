# Solução para Coletores Zebra

## 🎯 Situação

A aplicação está rodando em um **coletor Zebra**. Isso muda tudo! Coletores Zebra têm capacidades nativas de impressão.

## ✅ Vantagens de Rodar no Coletor

- ✅ **Acesso direto à impressora** - Se a impressora está conectada ao coletor
- ✅ **APIs nativas** - Coletores Zebra têm APIs específicas
- ✅ **Sem servidor intermediário** - Tudo funciona localmente
- ✅ **Mais rápido** - Comunicação direta

## 🔧 Soluções para Coletores Zebra

### Solução 1: Impressão Direta via API do Coletor (Recomendado)

Coletores Zebra geralmente têm servidor web embutido que pode imprimir diretamente.

#### Implementação:

```typescript
// lib/zebra-coletor-direct.ts
export async function imprimirViaColetorZebra(
  codigoPalete: string,
  dados?: DadosEtiqueta
): Promise<{ success: boolean; message: string }> {
  try {
    // Detectar se está rodando no coletor
    const isColetor = navigator.userAgent.includes('Zebra') || 
                     window.location.hostname.includes('coletor') ||
                     // Outros indicadores específicos do seu coletor
                     
    if (!isColetor) {
      return {
        success: false,
        message: 'Esta função só funciona em coletores Zebra'
      }
    }

    // Gerar ZPL
    const zpl = gerarZPL(codigoPalete, dados)

    // Enviar para impressora via API do coletor
    // Ajuste a URL conforme seu coletor
    const response = await fetch('/zpl/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: zpl,
    })

    if (response.ok) {
      return {
        success: true,
        message: `Etiqueta ${codigoPalete} impressa com sucesso!`
      }
    } else {
      const error = await response.text()
      return {
        success: false,
        message: `Erro ao imprimir: ${error}`
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }
  }
}
```

### Solução 2: Usar Zebra Browser Print no Coletor

Se o coletor tem navegador moderno, pode usar Browser Print também.

### Solução 3: Impressão via File System (Se Coletor Permite)

Alguns coletores permitem escrever arquivo ZPL diretamente na impressora:

```typescript
// Escrever arquivo ZPL e enviar para impressora
const zpl = gerarZPL(codigoPalete, dados)
// Salvar em local acessível pela impressora
```

## 🔍 Como Detectar se Está no Coletor

Adicione detecção no código:

```typescript
// lib/detect-coletor.ts
export function isColetorZebra(): boolean {
  if (typeof window === 'undefined') return false
  
  // Verificar User Agent
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('zebra') || ua.includes('tc') || ua.includes('mc')) {
    return true
  }
  
  // Verificar hostname
  if (window.location.hostname.includes('coletor') || 
      window.location.hostname.includes('192.168') ||
      window.location.hostname.includes('10.27')) {
    return true
  }
  
  // Verificar recursos específicos
  if (typeof (window as any).ZebraPrint !== 'undefined') {
    return true
  }
  
  return false
}
```

## 📝 Próximos Passos

1. **Identifique o modelo do coletor**
   - Qual modelo? (TC20, TC21, MC33, etc.)
   - Qual versão do sistema operacional?

2. **Verifique APIs disponíveis**
   - Acesse: `http://IP_DO_COLETOR` no navegador
   - Veja se há interface web ou API

3. **Consulte documentação do coletor**
   - Manual do desenvolvedor
   - APIs de impressão disponíveis

4. **Teste diferentes métodos**
   - API REST do coletor
   - Zebra Browser Print (se suportado)
   - File system (se permitido)

## 🚀 Implementação Rápida

Vou criar uma função que detecta automaticamente o ambiente e usa o melhor método disponível.

