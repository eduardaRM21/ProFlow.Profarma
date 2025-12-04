# Impressão via Interface Web da Impressora Zebra

## 🎯 Descoberta Importante!

A impressora Zebra **ZT411** tem uma **interface web embutida** acessível em:
- **URL**: `http://10.27.30.75`
- **Modelo**: ZTC ZT411-203dpi ZPL
- **Serial**: 99J242000420

Isso permite impressão **diretamente via HTTP** sem precisar de servidor intermediário!

## ✅ O que foi implementado

Criei uma nova função que tenta imprimir via interface web da impressora:

1. **Verifica se a interface está acessível**
2. **Tenta diferentes endpoints** comuns de impressoras Zebra:
   - `/printer/zpl`
   - `/zpl`
   - `/print`
   - `/printer/print`
   - `/api/print`
3. **Envia ZPL diretamente** para a impressora

## 🚀 Como Funciona

### Ordem de Prioridade Atualizada:

1. **🌐 Interface Web da Impressora** (NOVO - mais direto!)
   - Tenta enviar ZPL via HTTP diretamente para `10.27.30.75`
   - Sem servidor intermediário necessário
   - Funciona se a impressora aceitar ZPL via HTTP

2. **📱 Impressão Direta no Coletor** (se detectado)
   - Tenta endpoints do coletor

3. **🎯 Zebra Browser Print** (se disponível)
   - Impressão via Browser Print

4. **📡 Serviço Intermediário** (se configurado)
   - Requisição para serviço local

5. **🔄 API do Next.js** (fallback)

## 🧪 Testar

### 1. Verificar se Interface Web Está Acessível

No Console do navegador (F12), execute:

```javascript
fetch('http://10.27.30.75/').then(r => console.log('Interface web acessível:', r.ok))
```

Deve retornar `true`.

### 2. Testar Impressão

Tente imprimir uma etiqueta normalmente. O sistema vai:

1. Tentar interface web primeiro
2. Se não funcionar, tentar outros métodos automaticamente

### 3. Verificar Logs

Você deve ver nos logs:

```
🌐 Interface web da impressora detectada - tentando impressão via web...
🔗 [Interface Web] Tentando endpoint: http://10.27.30.75/printer/zpl
📡 [Interface Web] Resposta: status 200
✅ [Interface Web] Impressão enviada com sucesso!
```

## 📋 Endpoints Testados

O sistema tenta automaticamente:

- `http://10.27.30.75/printer/zpl` (POST)
- `http://10.27.30.75/zpl` (POST)
- `http://10.27.30.75/print` (POST)
- `http://10.27.30.75/printer/print` (POST)
- `http://10.27.30.75/api/print` (POST)

## 🔍 Descobrir Endpoint Correto

Se nenhum endpoint funcionar, você pode descobrir o correto:

1. **Acesse a interface web**: `http://10.27.30.75`
2. **Veja a documentação** da impressora
3. **Ou teste manualmente**:

```bash
# Teste com curl
curl http://10.27.30.75/printer/zpl -X POST -H "Content-Type: text/plain" -d "^XA^FO50,50^A0N50,50^FDTeste^FS^XZ"
```

Se funcionar, adicione o endpoint ao código.

## ✅ Vantagens

- ✅ **Mais direto** - Envia ZPL diretamente para impressora
- ✅ **Sem servidor intermediário** - Não precisa do serviço na porta 3002
- ✅ **Mais rápido** - Comunicação direta
- ✅ **Mais simples** - Menos pontos de falha

## ⚠️ Requisitos

- Impressora deve estar acessível na rede (`10.27.30.75`)
- Interface web deve estar habilitada (já está - você acessou!)
- Impressora deve aceitar ZPL via HTTP (depende do modelo)

## 🎯 Próximos Passos

1. **Teste a impressão** - deve tentar interface web primeiro
2. **Verifique os logs** no Console
3. **Se funcionar** - problema resolvido! 🎉
4. **Se não funcionar** - o sistema vai tentar outros métodos automaticamente

**Esta é provavelmente a solução mais simples e direta!** 🚀

