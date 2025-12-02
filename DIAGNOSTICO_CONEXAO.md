# Diagnóstico: ERR_CONNECTION_REFUSED

## ✅ Status Atual

Pelos logs, vejo que:
- ✅ Variável `NEXT_PUBLIC_PRINTER_SERVICE_URL` está configurada: `http://10.27.10.175:3001`
- ✅ Código está tentando fazer requisição direta para o serviço
- ❌ Serviço não está respondendo: `ERR_CONNECTION_REFUSED`

## 🔍 Diagnóstico Passo a Passo

### 1. Verificar se o Serviço Está Rodando

Na máquina `10.27.10.175`, execute:

```powershell
node scripts/printer-service.js
```

Você deve ver:
```
🚀 Serviço de Impressão iniciado!
📡 Escutando na porta 3001 em todas as interfaces (0.0.0.0)
```

⚠️ **O terminal precisa ficar aberto!** Se fechar, o serviço para.

### 2. Testar Conectividade

De **outra máquina** na mesma rede, execute:

```powershell
node scripts/test-printer-service.js http://10.27.10.175:3001
```

Ou teste com curl:

```powershell
curl http://10.27.10.175:3001/print -X POST -H "Content-Type: application/json" -d '{\"codigoPalete\":\"TESTE\"}'
```

### 3. Verificar Firewall

Se o serviço está rodando mas ainda não conecta, o firewall está bloqueando.

#### Abrir Porta no Firewall (PowerShell como Administrador):

```powershell
New-NetFirewallRule -DisplayName "Serviço de Impressão" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

#### Ou verificar se a porta está aberta:

```powershell
# Ver regras de firewall existentes
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*3001*" -or $_.DisplayName -like "*Impressão*"}
```

### 4. Verificar se o Serviço Está Escutando

Na máquina `10.27.10.175`, verifique se a porta está em uso:

```powershell
netstat -ano | findstr :3001
```

Se não aparecer nada, o serviço não está rodando.

Se aparecer algo como:
```
TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING       12345
```

O serviço está rodando (PID 12345).

### 5. Verificar IP Correto

Quando o serviço inicia, ele mostra os IPs disponíveis. Verifique se `10.27.10.175` está na lista:

```
📋 IPs disponíveis nesta máquina:
   • 10.27.10.175
   • 192.168.1.100
```

Se o IP não aparecer, use um dos IPs que aparecem.

## 🔧 Soluções

### Solução 1: Iniciar o Serviço

Se o serviço não está rodando:

1. Na máquina `10.27.10.175`, abra PowerShell
2. Navegue até o projeto:
   ```powershell
   cd "C:\Projeto Proflow\ProFlow_profarma - versão WMS"
   ```
3. Inicie o serviço:
   ```powershell
   node scripts/printer-service.js
   ```
4. Deixe o terminal aberto

### Solução 2: Abrir Firewall

Se o serviço está rodando mas não conecta:

1. Abra PowerShell como **Administrador**
2. Execute:
   ```powershell
   New-NetFirewallRule -DisplayName "Serviço de Impressão" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   ```
3. Teste novamente

### Solução 3: Usar IP Correto

Se o IP mudou:

1. Quando o serviço inicia, anote o IP mostrado
2. Atualize `.env.local`:
   ```env
   NEXT_PUBLIC_PRINTER_SERVICE_URL=http://NOVO_IP:3001
   ```
3. Reinicie o servidor Next.js

## ✅ Checklist de Verificação

Antes de testar no navegador:

- [ ] Serviço está rodando na máquina `10.27.10.175`?
- [ ] Terminal do serviço está aberto?
- [ ] Porta 3001 está aberta no firewall?
- [ ] Teste com `test-printer-service.js` passou?
- [ ] IP na variável está correto?
- [ ] Servidor Next.js foi reiniciado após alterar variável?

## 🧪 Teste Completo

Execute esta sequência:

```powershell
# 1. Na máquina 10.27.10.175 - Iniciar serviço
node scripts/printer-service.js

# 2. Em outra máquina - Testar conectividade
node scripts/test-printer-service.js http://10.27.10.175:3001

# 3. Se passar, testar no navegador
# Abra a aplicação e tente imprimir
```

## 📝 Próximos Passos

1. ✅ Inicie o serviço na máquina `10.27.10.175`
2. ✅ Abra a porta 3001 no firewall
3. ✅ Teste com o script de teste
4. ✅ Se tudo passar, teste no navegador

Se ainda não funcionar após seguir todos os passos, verifique:
- Se há proxy corporativo bloqueando
- Se há firewall de rede (não apenas do Windows)
- Se o cliente e o serviço estão na mesma rede/subnet

