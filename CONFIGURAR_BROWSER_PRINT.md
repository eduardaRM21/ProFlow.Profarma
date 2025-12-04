# Configurar Zebra Browser Print

## ✅ Browser Print Instalado!

Vejo que você já instalou o Zebra Browser Print. Agora precisa configurá-lo corretamente.

## 🔧 Configuração Necessária

### Problema Atual

Na imagem, vejo que:
- ✅ Impressora configurada: `99J242000420 (network: 10.27.30.75:6101)`
- ⚠️ **Accepted Hosts** só tem: `localhost`

Isso significa que apenas requisições de `localhost` são aceitas. Se a aplicação está rodando em outra máquina ou coletor, precisa adicionar o IP/hostname.

### Solução: Adicionar Hosts Aceitos

1. **Abra o Browser Print Settings** (se não estiver aberto)

2. **Na seção "Accepted Hosts"**:
   - Clique na área de texto
   - Adicione os IPs/hostnames que precisam acessar:
     ```
     localhost
     10.27.10.175
     10.27.10.137
     ```
   
   **Ou para aceitar qualquer host na rede** (menos seguro, mas mais fácil):
   ```
   localhost
   10.27.10.*
   10.27.30.*
   ```

3. **Clique em "OK" ou "Apply"** para salvar

### IPs a Adicionar

Dependendo de onde a aplicação está rodando:

- **Se estiver no coletor** (IP: 10.27.10.137):
  ```
  localhost
  10.27.10.137
  ```

- **Se estiver em outra máquina na rede**:
  ```
  localhost
  10.27.10.175
  [IP_DA_MAQUINA]
  ```

- **Para aceitar toda a rede** (mais fácil, menos seguro):
  ```
  localhost
  10.27.*.*
  ```

## 🧪 Testar Após Configurar

1. **Recarregue a página** da aplicação
2. **Abra o Console** (F12)
3. **Tente imprimir** uma etiqueta
4. **Verifique os logs**:
   ```
   ✅ Zebra Browser Print carregado com sucesso
   ✅ Zebra Browser Print API disponível
   🎯 Tentando imprimir com Zebra Browser Print...
   ✅ [Zebra Browser Print] Etiqueta impressa com sucesso!
   ```

## 📋 Checklist de Configuração

- [ ] Browser Print instalado ✅ (confirmado)
- [ ] Impressora adicionada ✅ (confirmado: 99J242000420)
- [ ] **Accepted Hosts configurado** ⚠️ (precisa adicionar IPs)
- [ ] Broadcast Search habilitado ✅ (já está marcado)
- [ ] Testar impressão

## 🔍 Verificar se Está Funcionando

No Console do navegador, execute:

```javascript
// Verificar se Browser Print está disponível
console.log('Browser Print disponível:', typeof window.BrowserPrint !== 'undefined')

// Listar impressoras
if (window.BrowserPrint) {
  window.BrowserPrint.BrowserPrint.getPrinters().then(printers => {
    console.log('Impressoras disponíveis:', printers.map(p => p.name))
  })
}
```

Deve mostrar a impressora `99J242000420`.

## ⚠️ Importante

- **Accepted Hosts** é uma lista de segurança
- Apenas hosts listados podem usar o Browser Print
- Se não adicionar o IP correto, o Browser Print não funcionará
- `localhost` funciona apenas se a aplicação estiver na mesma máquina

## 🚀 Após Configurar

1. Adicione os IPs necessários em "Accepted Hosts"
2. Salve as configurações
3. Recarregue a aplicação
4. Teste a impressão

O Browser Print deve funcionar agora! 🎉

