# Solução Rápida - Impressão em Rede Corporativa

## ✅ Solução Implementada

O código foi modificado para fazer requisições **diretamente do navegador** para o serviço intermediário na rede local, sem passar pelo servidor do Vercel.

## 🚀 Configuração em 3 Passos

### 1. Iniciar o Serviço Intermediário

Em uma máquina na rede corporativa que tenha acesso à impressora (`10.27.30.75`), execute:

```bash
node scripts/printer-service.js
```

O serviço mostrará o IP da máquina, por exemplo:
```
📋 IPs disponíveis nesta máquina:
   • 10.27.10.50
```

### 2. Configurar Variável de Ambiente

**Para desenvolvimento local**, crie/edite `.env.local`:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3002
```

⚠️ **IMPORTANTE**: 
- Use a porta **3002** (o serviço intermediário usa 3002 por padrão para evitar conflito com Next.js)
- Use o IP da máquina onde o serviço está rodando
- Não inclua `/print` no final

**Para produção (Vercel)**, configure no Vercel Dashboard:

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione:
   - **Name**: `NEXT_PUBLIC_PRINTER_SERVICE_URL`
   - **Value**: `http://10.27.10.175:3002` (use o IP que apareceu no passo 1)
   - **Environments**: Production, Preview, Development
5. Salve

### 3. Fazer Redeploy

No Vercel Dashboard:
- **Deployments** > Três pontos (...) > **Redeploy**

## ✅ Pronto!

Agora quando os usuários acessarem a aplicação no Vercel e tentarem imprimir:
- O navegador fará a requisição diretamente para `http://10.27.10.175:3002/print`
- O serviço intermediário imprimirá na impressora
- Tudo acontece na rede corporativa, sem passar pela internet pública

## ⚠️ IMPORTANTE: Serviço Precisa Estar Rodando!

**O erro `ERR_CONNECTION_REFUSED` significa que o serviço intermediário não está rodando ou está bloqueado.**

### 🔴 Ação Imediata Necessária:

1. **Na máquina `10.27.10.175`**, abra um terminal e execute:
   ```powershell
   node scripts/printer-service.js
   ```
   
2. **Deixe o terminal aberto!** Se fechar, o serviço para.

3. **Abra a porta 3001 no firewall** (PowerShell como Administrador):
   ```powershell
   New-NetFirewallRule -DisplayName "Serviço de Impressão" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   ```

## 🔍 Verificação

### Teste Automático

Execute o script de teste:

```bash
node scripts/test-printer-service.js http://10.27.10.175:3002
```

⚠️ **Use a porta 3002** (padrão do serviço intermediário)

O script vai verificar:
- ✅ Se a porta está aberta
- ✅ Se o serviço está respondendo
- ✅ Se a requisição HTTP funciona

**Se mostrar "Conexão recusada", o serviço não está rodando!**

### Verificação Manual

Se não funcionar, verifique:

1. ✅ Serviço intermediário está rodando?
2. ✅ IP está correto na variável de ambiente?
3. ✅ Cliente está na mesma rede que o serviço?
4. ✅ Firewall permite conexões na porta 3001?
5. ✅ Abra o Console do navegador (F12) e veja os erros

### Teste com curl

Teste se o serviço está acessível:

```bash
curl http://10.27.10.175:3002/print -X POST -H "Content-Type: application/json" -d "{\"codigoPalete\":\"TESTE\"}"
```

⚠️ **Use a porta 3002**

Se retornar `{"success":true,...}`, está funcionando!

### 🔴 Erro: ERR_CONNECTION_REFUSED

**Este é o erro mais comum!** Significa que o serviço intermediário não está rodando.

**Solução:**
1. Inicie o serviço: `node scripts/printer-service.js` (na máquina 10.27.10.175)
2. Abra o firewall: `New-NetFirewallRule -DisplayName "Serviço de Impressão" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow`
3. Teste: `node scripts/test-printer-service.js http://10.27.10.175:3002`

Consulte: `DIAGNOSTICO_CONEXAO.md` para guia completo.

### Erro: Failed to fetch (outros)?

**Possíveis causas:**

1. **Serviço não está rodando** - Execute `node scripts/printer-service.js`
2. **Firewall bloqueando** - Abra a porta 3001 no firewall
3. **Mixed Content (HTTPS → HTTP)** - Se acessar Vercel via HTTPS, o navegador bloqueia HTTP

**Para Mixed Content:**
- Se você acessa `https://proflowprofarma.vercel.app` e o serviço é `http://10.27.10.175:3001`
- O navegador bloqueia por segurança
- **Solução**: Configure HTTPS no serviço intermediário
- Consulte: `PROBLEMA_MIXED_CONTENT.md`

**Outros problemas:**
- Consulte: `TROUBLESHOOTING_CONNECTION_REFUSED.md`

## ⚠️ Importante

- O serviço intermediário precisa estar rodando **continuamente**
- Use o IP interno da máquina (não precisa ser público)
- Não inclua `/print` na URL da variável de ambiente
- Use `http://` (não `https://`) para rede interna
- Use a porta **3002** (padrão do serviço intermediário)

