# Configuração para Coletores Zebra

## 🎯 Situação

A aplicação está rodando em um **coletor Zebra**. Isso permite impressão direta sem servidor intermediário!

## ✅ O que foi implementado

1. **Detecção automática de coletor** - O sistema detecta se está rodando no coletor
2. **Impressão direta TCP** - Tenta conectar diretamente à impressora
3. **Múltiplos métodos** - Tenta diferentes portas e endpoints
4. **Fallback inteligente** - Se não funcionar no coletor, tenta outros métodos

## 🔧 Configuração

### 1. Variável de Ambiente (Opcional)

Se a impressora não estiver em `localhost` ou `127.0.0.1`, configure:

```env
NEXT_PUBLIC_PRINTER_IP=10.27.30.75
```

### 2. Verificar Conexão da Impressora

No coletor, verifique se a impressora está:
- ✅ Conectada via USB ao coletor
- ✅ Ou conectada na mesma rede
- ✅ IP conhecido e acessível

### 3. Portas Testadas

O sistema tenta automaticamente:
- **Porta 9100** - Porta padrão Zebra (raw printing)
- **Porta 6101** - Porta alternativa Zebra

## 🧪 Como Testar

### 1. Verificar Detecção

No Console do coletor, você deve ver:

```
🔍 Debug - isColetor: true
📱 Detectado coletor Zebra - tentando impressão direta...
```

### 2. Testar Impressão

Tente imprimir uma etiqueta normalmente. O sistema vai:

1. Detectar que está no coletor
2. Tentar impressão direta TCP
3. Se não funcionar, tentar outros métodos automaticamente

### 3. Verificar Logs

Procure por logs como:

```
📱 [Coletor] Tentando impressão direta TCP para 127.0.0.1:9100
✅ Etiqueta PAL-00036_2-3 impressa com sucesso!
```

## 🔍 Troubleshooting

### Problema: "Não foi possível conectar à impressora"

**Soluções:**

1. **Verificar se impressora está conectada**
   - USB: Verifique cabo
   - Rede: Verifique IP e conectividade

2. **Testar conectividade manualmente**
   ```bash
   # No coletor, teste se a porta está aberta
   telnet 127.0.0.1 9100
   # ou
   telnet 10.27.30.75 9100
   ```

3. **Verificar IP da impressora**
   - Configure `NEXT_PUBLIC_PRINTER_IP` se necessário
   - Verifique se o IP está correto

4. **Tentar porta alternativa**
   - O sistema tenta 9100 e 6101 automaticamente
   - Se sua impressora usa outra porta, ajuste o código

### Problema: Coletor não detectado

**Solução:**
- Verifique User Agent do coletor
- Ajuste `lib/detect-coletor.ts` se necessário
- Adicione identificadores específicos do seu coletor

### Problema: Impressão não funciona

**Solução:**
1. Verifique logs no Console
2. O sistema tenta automaticamente outros métodos (Browser Print, serviço intermediário)
3. Verifique se a impressora está ligada e pronta

## 📝 Modelos de Coletores Suportados

A detecção funciona para:
- TC20, TC21, TC26, TC52, TC57, TC72, TC77
- MC33, MC93
- WT6000
- Outros coletores Zebra com Android

## 🚀 Vantagens

- ✅ **Sem servidor intermediário** - Tudo direto no coletor
- ✅ **Mais rápido** - Comunicação local
- ✅ **Mais simples** - Menos pontos de falha
- ✅ **Automático** - Detecta e usa o melhor método

## 📚 Próximos Passos

1. **Teste a impressão** no coletor
2. **Verifique os logs** para confirmar que está usando impressão direta
3. **Ajuste IP/porta** se necessário
4. **Configure variável de ambiente** se a impressora não estiver em localhost

**Pronto para usar!** 🚀

