# Imprimir via Coletor Zebra

## 🎯 Se Você Usa Coletores Zebra

Se os coletores são Zebra, eles provavelmente têm **servidor web embutido** que pode imprimir diretamente!

## 🔍 Verificar se o Coletor Tem API Web

### 1. Acessar Interface Web do Coletor

1. Descubra o IP do coletor Zebra
2. Abra no navegador: `http://IP_DO_COLETOR`
3. Veja se há interface web ou API disponível

### 2. Verificar Documentação do Coletor

Consulte o manual do coletor para:
- Endpoint de impressão
- Formato de dados aceito (ZPL, EPL, etc)
- Autenticação necessária

## 💻 Implementação

### Exemplo Genérico (Ajuste conforme seu coletor)

```typescript
// lib/zebra-coletor-print.ts
export async function imprimirViaColetorZebra(
  codigoPalete: string,
  coletorIP: string,
  dados?: {
    quantidadeNFs?: number;
    totalVolumes?: number;
    destino?: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // Gerar ZPL (use sua função existente)
    const zpl = gerarZPL(codigoPalete, dados);

    // Enviar para coletor
    // Ajuste a URL conforme a API do seu coletor
    const response = await fetch(`http://${coletorIP}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // ou 'application/zpl'
      },
      body: zpl,
    });

    if (response.ok) {
      return {
        success: true,
        message: `Etiqueta ${codigoPalete} enviada para impressão!`
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `Erro ao imprimir: ${errorText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao conectar com coletor: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}
```

### Usar no Componente

```typescript
// app/wms/embalagem/page.tsx
import { imprimirViaColetorZebra } from '@/lib/zebra-coletor-print';

async function finalizarEmbalagem() {
  // ... seu código existente
  
  // IP do coletor (pode vir de configuração ou ser detectado)
  const coletorIP = '10.27.10.XXX'; // ou de variável de ambiente
  
  const resultado = await imprimirViaColetorZebra(codigoPalete, coletorIP, {
    quantidadeNFs,
    totalVolumes,
    destino,
  });
  
  if (resultado.success) {
    console.log('✅', resultado.message);
  } else {
    console.error('❌', resultado.message);
  }
}
```

## 🔧 Endpoints Comuns de Coletores Zebra

Diferentes modelos podem ter endpoints diferentes:

```typescript
// Tentar diferentes endpoints comuns
const endpoints = [
  `/print`,
  `/api/print`,
  `/zpl`,
  `/print/zpl`,
  `/printer/print`,
];

for (const endpoint of endpoints) {
  try {
    const response = await fetch(`http://${coletorIP}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: zpl,
    });
    
    if (response.ok) {
      return { success: true, message: 'Impressão enviada!' };
    }
  } catch (error) {
    // Tentar próximo endpoint
    continue;
  }
}
```

## ✅ Vantagens

- ✅ **Sem servidor intermediário** - Requisição direta do navegador
- ✅ **Usa infraestrutura existente** - Coletor já está na rede
- ✅ **Simples** - Apenas requisição HTTP
- ✅ **Funciona com Vercel** - Se coletor estiver acessível (mesma rede ou VPN)

## ⚠️ Requisitos

- Coletor Zebra com servidor web habilitado
- IP do coletor conhecido
- Coletor acessível da rede do cliente (ou via VPN)

## 📝 Próximos Passos

1. **Identifique o modelo do coletor Zebra**
2. **Acesse a interface web do coletor** (`http://IP_DO_COLETOR`)
3. **Consulte o manual** para endpoint de impressão
4. **Teste com curl** primeiro:
   ```bash
   curl http://IP_DO_COLETOR/print -X POST -H "Content-Type: text/plain" -d "^XA^FO50,50^A0N50,50^FDTeste^FS^XZ"
   ```
5. **Implemente no código** se funcionar

