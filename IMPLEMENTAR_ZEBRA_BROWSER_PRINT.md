# Implementar Zebra Browser Print

## 🎯 O que é?

Zebra Browser Print permite impressão **diretamente do navegador** para impressoras Zebra, sem servidor intermediário!

## 📦 Instalação

### 1. Instalar Browser Print na Impressora

1. Baixe o **Zebra Browser Print** do site oficial da Zebra
2. Instale na máquina onde a impressora está conectada (ou na rede)
3. Configure a impressora no Browser Print

### 2. Adicionar Script no Projeto

Adicione o script no seu layout principal ou página:

```typescript
// app/layout.tsx ou onde for apropriado
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script 
          src="https://www.zebra.com/apps/r/browser-print/BrowserPrint-3.0.216.min.js"
          strategy="lazyOnload"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

## 💻 Implementação

### Criar Hook para Impressão

```typescript
// lib/zebra-browser-print.ts
declare global {
  interface Window {
    BrowserPrint: any;
  }
}

export async function imprimirComZebraBrowserPrint(
  codigoPalete: string,
  dados?: {
    quantidadeNFs?: number;
    totalVolumes?: number;
    destino?: string;
    // ... outros dados
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // Verificar se BrowserPrint está disponível
    if (typeof window === 'undefined' || !window.BrowserPrint) {
      return {
        success: false,
        message: 'Zebra Browser Print não está disponível. Verifique se o script foi carregado.'
      };
    }

    // Conectar à impressora padrão
    const printer = await window.BrowserPrint.BrowserPrint.getDefaultPrinter();
    
    if (!printer) {
      return {
        success: false,
        message: 'Nenhuma impressora Zebra encontrada. Configure o Zebra Browser Print.'
      };
    }

    // Gerar ZPL (use a função que você já tem)
    const zpl = gerarZPL(codigoPalete, dados);

    // Enviar para impressora
    await printer.send(zpl);

    return {
      success: true,
      message: `Etiqueta ${codigoPalete} impressa com sucesso!`
    };
  } catch (error) {
    console.error('Erro ao imprimir com Zebra Browser Print:', error);
    return {
      success: false,
      message: `Erro ao imprimir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

// Função para gerar ZPL (copie do seu código existente)
function gerarZPL(codigoPalete: string, dados?: any): string {
  // ... seu código ZPL existente
}
```

### Usar no Componente

```typescript
// app/wms/embalagem/page.tsx
import { imprimirComZebraBrowserPrint } from '@/lib/zebra-browser-print';

async function finalizarEmbalagem() {
  // ... seu código existente
  
  // Imprimir etiqueta
  const resultado = await imprimirComZebraBrowserPrint(codigoPalete, {
    quantidadeNFs,
    totalVolumes,
    destino,
    // ... outros dados
  });
  
  if (resultado.success) {
    console.log('✅', resultado.message);
  } else {
    console.error('❌', resultado.message);
  }
}
```

## 🔧 Configuração Alternativa: Listar Impressoras

Se quiser permitir que o usuário escolha a impressora:

```typescript
// Listar todas as impressoras disponíveis
const printers = await window.BrowserPrint.BrowserPrint.getPrinters();

// Selecionar uma impressora específica
const printer = printers.find(p => p.name === 'Nome da Impressora');
await printer.send(zpl);
```

## ✅ Vantagens

- ✅ **Sem servidor intermediário** - Tudo no navegador
- ✅ **Funciona com Vercel** - Não precisa de acesso à rede local
- ✅ **Simples** - Apenas adicionar script e usar
- ✅ **Oficial da Zebra** - Suporte garantido

## ⚠️ Requisitos

- Impressora Zebra com Browser Print instalado
- Navegador moderno (Chrome, Edge, Firefox)
- Impressora acessível na rede local (ou via Browser Print Cloud)

## 📚 Documentação

- Site oficial: https://www.zebra.com/us/en/support-downloads/knowledge-articles/attachments/knowledge-articles/installing-and-using-browser-print.html
- API Reference: Disponível no site da Zebra

