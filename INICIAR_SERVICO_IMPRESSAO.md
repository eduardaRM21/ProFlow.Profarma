# Como Iniciar o Serviço de Impressão

## 🚀 Passo a Passo

### 1. Verificar se o Serviço Está Rodando

Execute o teste:

```powershell
node scripts/test-printer-service.js http://10.27.10.175:3001
```

Se mostrar "Conexão recusada", o serviço **não está rodando**.

### 2. Iniciar o Serviço

Na máquina `10.27.10.175`, abra um terminal PowerShell e execute:

```powershell
cd "C:\Projeto Proflow\ProFlow_profarma - versão WMS"
node scripts/printer-service.js
```

Você deve ver algo como:

```
🚀 Serviço de Impressão iniciado!
📡 Escutando na porta 3001 em todas as interfaces (0.0.0.0)
🖨️ Impressora configurada: 10.27.30.75:6101 (alternativa: 9100)

📋 IPs disponíveis nesta máquina:
   • 10.27.10.175
   • 192.168.1.100
```

⚠️ **IMPORTANTE**: O terminal precisa ficar **aberto** enquanto o serviço estiver rodando. Se fechar o terminal, o serviço para.

### 3. Verificar Firewall

Se o serviço está rodando mas ainda não conecta, o firewall pode estar bloqueando.

#### Abrir Porta no Firewall (PowerShell como Administrador):

```powershell
New-NetFirewallRule -DisplayName "Serviço de Impressão" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

Ou via Interface Gráfica:
1. Windows Defender Firewall > Configurações Avançadas
2. Regras de Entrada > Nova Regra
3. Porta > TCP > 3001 > Permitir conexão

### 4. Testar Novamente

Deixe o serviço rodando e, em outro terminal, execute:

```powershell
node scripts/test-printer-service.js http://10.27.10.175:3001
```

Agora deve mostrar:
```
✅ Porta está aberta e acessível
✅ Serviço respondeu (status 200)
```

### 5. Testar Impressão Real

Teste com um palete de verdade:

```powershell
curl http://10.27.10.175:3001/print -X POST -H "Content-Type: application/json" -d '{\"codigoPalete\":\"TESTE\"}'
```

## 🔄 Manter o Serviço Rodando Continuamente

### Opção 1: PM2 (Recomendado)

Instale o PM2:

```powershell
npm install -g pm2
```

Inicie o serviço:

```powershell
cd "C:\Projeto Proflow\ProFlow_profarma - versão WMS"
pm2 start scripts/printer-service.js --name printer-service
pm2 save
pm2 startup
```

O serviço vai iniciar automaticamente quando o Windows reiniciar.

**Comandos úteis:**
- `pm2 list` - Ver serviços rodando
- `pm2 logs printer-service` - Ver logs
- `pm2 stop printer-service` - Parar
- `pm2 restart printer-service` - Reiniciar

### Opção 2: Serviço do Windows (Avançado)

Crie um serviço do Windows usando `node-windows` ou `nssm`.

### Opção 3: Task Scheduler

Configure o Task Scheduler para iniciar o serviço na inicialização do Windows.

## ✅ Checklist de Verificação

Antes de testar no navegador, verifique:

- [ ] Serviço está rodando? (`node scripts/printer-service.js`)
- [ ] Porta 3001 está aberta no firewall?
- [ ] Teste com `test-printer-service.js` passou?
- [ ] Teste com `curl` funcionou?
- [ ] IP na variável do Vercel está correto?
- [ ] Variável está configurada no Vercel?
- [ ] Foi feito redeploy no Vercel?

## 🐛 Problemas Comuns

### "Conexão recusada" mesmo com serviço rodando

**Causa**: Firewall bloqueando

**Solução**: Abra a porta 3001 no firewall (veja passo 3)

### Serviço para quando fecho o terminal

**Causa**: Normal - processo termina com o terminal

**Solução**: Use PM2 ou configure como serviço (veja "Manter o Serviço Rodando")

### "Porta já em uso"

**Causa**: Outro processo está usando a porta 3001

**Solução**: 
```powershell
# Ver qual processo está usando
netstat -ano | findstr :3001

# Matar o processo (substitua PID pelo número)
taskkill /PID <PID> /F
```

### IP mudou após reiniciar

**Causa**: IP dinâmico

**Solução**: Configure IP fixo na máquina ou use nome de host (se houver DNS interno)

## 📝 Próximos Passos

Após o serviço estar rodando e testado:

1. ✅ Configure a variável no Vercel: `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3001`
2. ✅ Faça redeploy no Vercel
3. ✅ Teste a impressão na aplicação

Se ainda houver problemas de Mixed Content (HTTPS → HTTP), consulte `PROBLEMA_MIXED_CONTENT.md`.

