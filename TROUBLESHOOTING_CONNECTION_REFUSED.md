# Troubleshooting: ERR_CONNECTION_REFUSED

## Erro
```
POST http://10.27.10.175:3001/print net::ERR_CONNECTION_REFUSED
```

Este erro significa que o navegador não consegue conectar ao serviço intermediário.

## 🔍 Diagnóstico Passo a Passo

### 1. Verificar se o Serviço Está Rodando

Execute o serviço intermediário:

```bash
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

**⚠️ IMPORTANTE**: O serviço precisa estar rodando **continuamente**. Se você fechar o terminal, o serviço para.

### 2. Verificar o IP Correto

O IP na variável de ambiente do Vercel deve ser **exatamente** um dos IPs mostrados quando o serviço inicia.

**Exemplo:**
- Se o serviço mostra: `• 10.27.10.175`
- A variável deve ser: `http://10.27.10.175:3001`
- ❌ **NÃO** use `http://localhost:3001` (não funciona do navegador)
- ❌ **NÃO** use `http://127.0.0.1:3001` (não funciona do navegador)

### 3. Verificar Firewall do Windows

O Windows Firewall pode estar bloqueando a porta 3001.

#### Abrir Porta no Firewall:

1. Abra o **Windows Defender Firewall**
2. Clique em **Configurações Avançadas**
3. Clique em **Regras de Entrada** > **Nova Regra**
4. Selecione **Porta** > **Próximo**
5. Selecione **TCP** e digite `3001` > **Próximo**
6. Selecione **Permitir a conexão** > **Próximo**
7. Marque todos os perfis > **Próximo**
8. Nome: "Serviço de Impressão" > **Concluir**

#### Ou via PowerShell (como Administrador):

```powershell
New-NetFirewallRule -DisplayName "Serviço de Impressão" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### 4. Testar Conectividade

#### Teste 1: Do próprio servidor

Na máquina onde o serviço está rodando:

```bash
curl http://localhost:3001/print -X POST -H "Content-Type: application/json" -d "{\"codigoPalete\":\"TESTE\"}"
```

Se funcionar, o serviço está OK.

#### Teste 2: De outra máquina na mesma rede

De outra máquina na rede corporativa:

```bash
curl http://10.27.10.175:3001/print -X POST -H "Content-Type: application/json" -d "{\"codigoPalete\":\"TESTE\"}"
```

Se **não** funcionar, o problema é:
- Firewall bloqueando
- Serviço não está escutando em todas as interfaces
- IP incorreto

#### Teste 3: Verificar se a porta está aberta

De outra máquina na rede:

```bash
telnet 10.27.10.175 3001
```

Se conectar, a porta está aberta. Se não conectar, o firewall está bloqueando.

### 5. Verificar se o Serviço Está Escutando Corretamente

O serviço deve estar escutando em `0.0.0.0` (todas as interfaces). Verifique no código:

```javascript
server.listen(SERVICE_PORT, '0.0.0.0', () => {
```

Se estiver `localhost` ou `127.0.0.1`, mude para `0.0.0.0`.

### 6. Verificar Variável de Ambiente no Vercel

1. Acesse: Vercel Dashboard > Seu Projeto > Settings > Environment Variables
2. Verifique se `NEXT_PUBLIC_PRINTER_SERVICE_URL` está configurada
3. Verifique se o valor está correto: `http://10.27.10.175:3001` (sem `/print` no final)
4. Verifique se está marcado para **Production** (e outros ambientes se necessário)
5. **Faça redeploy** após alterar variáveis

### 7. Verificar no Console do Navegador

Abra o Console do navegador (F12) e verifique:

1. Se a URL está correta nos logs
2. Se há erros de CORS (diferente de CONNECTION_REFUSED)
3. Se a variável está sendo lida corretamente

## ✅ Checklist Rápido

- [ ] Serviço intermediário está rodando?
- [ ] IP na variável de ambiente está correto?
- [ ] Porta 3001 está aberta no firewall?
- [ ] Cliente e serviço estão na mesma rede?
- [ ] Variável de ambiente está configurada no Vercel?
- [ ] Foi feito redeploy após configurar a variável?
- [ ] Teste manual com curl funcionou?

## 🔧 Soluções Comuns

### Problema: Serviço para quando fecho o terminal

**Solução**: Execute como serviço do Windows ou use um gerenciador de processos:

```bash
# Com PM2 (instalar: npm install -g pm2)
pm2 start scripts/printer-service.js --name printer-service
pm2 save
pm2 startup
```

### Problema: Firewall bloqueando mesmo após abrir porta

**Solução**: 
1. Desative temporariamente o firewall para testar
2. Se funcionar, o problema é o firewall
3. Verifique regras de antivírus também

### Problema: IP muda a cada reinicialização

**Solução**: Configure IP fixo na máquina ou use um nome de host (se houver DNS interno).

### Problema: Funciona localmente mas não do Vercel

**Solução**: 
1. Verifique se a variável está configurada no Vercel
2. Verifique se fez redeploy
3. Verifique se o cliente (navegador) está na mesma rede que o serviço

## 🚨 Problema: Mixed Content (HTTPS → HTTP)

Se você está acessando o Vercel via **HTTPS** e o serviço intermediário está em **HTTP**, o navegador pode bloquear por política de Mixed Content.

### Sintomas:
- Erro: `Failed to fetch`
- Funciona com `curl` mas não no navegador
- Console mostra: "Mixed Content" ou "blocked:mixed-content"

### Solução:
Consulte `PROBLEMA_MIXED_CONTENT.md` para instruções completas.

**Resumo rápido:**
1. Gere certificado SSL: `openssl genrsa -out key.pem 2048 && openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/CN=10.27.10.175"`
2. Modifique o serviço para usar HTTPS
3. Atualize variável no Vercel para `https://10.27.10.175:3001`

## 📞 Ainda Não Funciona?

1. Verifique os logs do serviço intermediário
2. Verifique os logs do navegador (F12 > Console) - procure por "Mixed Content"
3. Teste com curl de diferentes máquinas
4. Verifique se há proxy corporativo bloqueando
5. Verifique se há regras de firewall de rede (não apenas do Windows)
6. **Verifique se é problema de Mixed Content** (HTTPS → HTTP)

