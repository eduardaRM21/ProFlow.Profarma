# Guia de Configuração - Cloudflare Tunnel para Impressão

## 📋 Pré-requisitos

1. ✅ Túnel do Cloudflare criado e ativo
2. ✅ Serviço intermediário de impressão rodando na máquina local (porta 3001)
3. ✅ Acesso ao painel do Vercel para configurar variáveis de ambiente

## 🔧 Passo 1: Verificar o Túnel do Cloudflare

### 1.1 Obter a URL pública do túnel

O túnel do Cloudflare deve estar configurado para expor o serviço na porta 3002 (ou 3001 se você configurou `PRINTER_SERVICE_PORT=3001`). A URL pública será algo como:
- `https://seu-tunel.trycloudflare.com` (se usar trycloudflare)
- `https://seu-dominio.custom.com` (se usar domínio customizado)

### 1.2 Verificar se o túnel está funcionando

Teste se o serviço está acessível publicamente:

```bash
# Teste básico
curl https://sua-url-do-tunel.com/print -X POST -H "Content-Type: application/json" -d '{"codigoPalete":"TESTE"}'
```

Ou acesse no navegador:
```
https://sua-url-do-tunel.com
```

## 🔧 Passo 2: Configurar Variável de Ambiente no Vercel

### 2.1 Acessar o Painel do Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto: **ProFlow_profarma**
3. Vá em **Settings** → **Environment Variables**

### 2.2 Adicionar/Atualizar Variável

**Nome da variável:**
```
NEXT_PUBLIC_PRINTER_SERVICE_URL
```

**Valor:**
```
https://sua-url-do-tunel.com
```

**⚠️ IMPORTANTE:**
- Use **HTTPS** (não HTTP)
- **NÃO** inclua `/print` no final da URL
- A URL deve ser acessível publicamente
- Exemplo: `https://seu-tunel.trycloudflare.com`

### 2.3 Configurar Ambiente

Selecione os ambientes onde a variável será usada:
- ✅ **Production** (obrigatório)
- ✅ **Preview** (recomendado)
- ✅ **Development** (opcional)

### 2.4 Salvar e Fazer Redeploy

1. Clique em **Save**
2. Vá em **Deployments**
3. Clique nos **3 pontos** (⋯) do último deployment
4. Selecione **Redeploy**

Ou faça um novo commit para triggerar um novo deploy.

## 🔧 Passo 3: Configurar Hostname Público no Cloudflare Tunnel

### 3.1 Acessar a Configuração do Túnel

1. No painel do Cloudflare, vá em **Zero Trust** → **Networks** → **Tunnels**
2. Selecione seu túnel
3. Clique em **Configure** ou **Edit Configuration**

### 3.2 Adicionar Hostname Público (NÃO rota privada)

**⚠️ IMPORTANTE:** Você precisa configurar um **hostname público**, não uma rota privada (CIDR).

#### Opção A: Usando trycloudflare.com (mais fácil)

1. No painel do túnel, procure por **Public Hostnames** ou **Hostnames**
2. Clique em **Add a public hostname** ou **+ Add**
3. Configure:
   - **Subdomain:** escolha um nome (ex: `printer-service`)
   - **Domain:** selecione `trycloudflare.com` (ou seu domínio customizado)
   - **Service Type:** `HTTP`
   - **URL:** `http://localhost:3002` (ou `3001` se você configurou)
4. Clique em **Save**

#### Opção B: Usando arquivo de configuração (config.yml)

Se você está usando o Cloudflare Tunnel via linha de comando, edite o arquivo `config.yml`:

```yaml
tunnel: seu-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  # Hostname público para o serviço de impressão
  - hostname: printer-service.trycloudflare.com
    service: http://localhost:3002
  # Fallback para outras requisições
  - service: http_status:404
```

Depois, reinicie o túnel:
```bash
cloudflared tunnel run seu-tunnel-id
```

### 3.3 Verificar se o Hostname está Ativo

Após configurar, você deve ver o hostname listado no painel do Cloudflare. A URL será algo como:
- `https://printer-service.trycloudflare.com`
- `https://seu-nome.trycloudflare.com`

### 3.4 Verificar se o serviço intermediário está rodando

Na máquina onde o serviço está rodando:

```bash
# Verificar se está rodando
node scripts/printer-service.js
```

Você deve ver algo como:
```
🖨️ Serviço de impressão iniciado na porta 3002
📡 IP da máquina: 10.27.10.50
🌐 Serviço acessível em: http://10.27.10.50:3002
```

**Nota:** Por padrão, o serviço usa a porta **3002**. Se você quiser usar a porta 3001, configure:
```bash
PRINTER_SERVICE_PORT=3001 node scripts/printer-service.js
```

## 🔧 Passo 4: Testar a Configuração

### 4.1 Teste Manual via API

Após o redeploy, teste diretamente:

```bash
# Teste via curl
curl https://proflowprofarma.vercel.app/api/print \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "codigoPalete": "TESTE-001",
    "quantidadeNFs": 1,
    "totalVolumes": 10,
    "destino": "SP01"
  }'
```

### 4.2 Verificar Logs

1. No Vercel, vá em **Deployments** → Selecione o deployment → **Functions**
2. Clique na função `/api/print`
3. Verifique os logs para ver se está usando o túnel

Você deve ver logs como:
```
🔄 Usando serviço intermediário como proxy: https://seu-tunel.trycloudflare.com
📡 Fazendo requisição para: https://seu-tunel.trycloudflare.com/print
```

## 🔧 Passo 5: Testar Impressão na Aplicação

1. Acesse a aplicação: https://proflowprofarma.vercel.app
2. Vá para a página de embalagem
3. Tente imprimir uma etiqueta
4. Verifique o console do navegador (F12)

### Logs Esperados no Console:

```
⚠️ Mixed Content detectado: página HTTPS tentando acessar serviço HTTP
📡 Usando API do Next.js como proxy para evitar bloqueio de Mixed Content
📡 Usando API do Next.js como proxy: /api/print
🔧 PRINTER_SERVICE_URL configurado: https://seu-tunel.trycloudflare.com (será usado pelo servidor)
```

## ⚠️ Diferença entre Rota Privada e Hostname Público

### Rota Privada (CIDR) - NÃO É O QUE PRECISAMOS
- Usada para acessar redes privadas através do túnel
- Exemplo: acessar servidores internos da empresa
- **NÃO expõe serviços publicamente**

### Hostname Público - É O QUE PRECISAMOS ✅
- Expõe um serviço local para a internet
- Permite acesso público via HTTPS
- **É isso que precisamos para o serviço de impressão**

**Se você está vendo a tela "Criar nova rota" (CIDR), você precisa:**
1. Voltar e procurar por **"Public Hostnames"** ou **"Hostnames"**
2. Ou usar o arquivo `config.yml` para configurar o hostname público

## ❌ Troubleshooting

### Problema: Não encontro onde configurar hostname público

**Solução:**
1. No painel do Cloudflare, vá em **Zero Trust** → **Networks** → **Tunnels**
2. Clique no seu túnel
3. Procure pela aba/seção **"Public Hostnames"** ou **"Hostnames"**
4. Se não encontrar, você pode configurar via arquivo `config.yml` (veja Opção B acima)

### Problema: Erro 500 ao tentar imprimir

**Possíveis causas:**
1. Túnel não está ativo
2. Serviço intermediário não está rodando
3. URL do túnel incorreta no Vercel
4. Firewall bloqueando conexões

**Soluções:**
1. Verificar se o túnel está rodando: `cloudflared tunnel list`
2. Verificar se o serviço está rodando: `node scripts/printer-service.js`
3. Verificar a URL no Vercel (deve ser HTTPS)
4. Testar o túnel diretamente: `curl https://sua-url-do-tunel.com/print`

### Problema: Erro de conexão recusada

**Causa:** O serviço intermediário não está acessível através do túnel

**Solução:**
1. Verificar configuração do túnel (deve apontar para `localhost:3001`)
2. Verificar se o serviço está rodando na porta 3001
3. Reiniciar o túnel: `cloudflared tunnel run seu-tunnel-id`

### Problema: Variável de ambiente não está sendo lida

**Causa:** Variável não foi configurada corretamente ou não foi feito redeploy

**Solução:**
1. Verificar se a variável está no Vercel (Settings → Environment Variables)
2. Verificar se está marcada para Production
3. Fazer redeploy da aplicação
4. Verificar logs do servidor para ver se a variável está sendo lida

## 📝 Checklist Final

- [ ] Túnel do Cloudflare está ativo e funcionando
- [ ] Serviço intermediário está rodando na porta 3001
- [ ] Variável `NEXT_PUBLIC_PRINTER_SERVICE_URL` configurada no Vercel com URL HTTPS
- [ ] URL do túnel testada e acessível publicamente
- [ ] Aplicação foi redeployada no Vercel
- [ ] Teste de impressão realizado com sucesso

## 🎯 Exemplo de Configuração Completa

### No Vercel (Environment Variables):

```
NEXT_PUBLIC_PRINTER_SERVICE_URL = https://seu-tunel.trycloudflare.com
```

### No Cloudflare Tunnel (config.yml):

```yaml
tunnel: abc123-def456-ghi789
credentials-file: /path/to/credentials.json

ingress:
  - hostname: seu-tunel.trycloudflare.com
    service: http://localhost:3002
  - service: http_status:404
```

**Nota:** Se você configurou o serviço para usar a porta 3001, ajuste para `http://localhost:3001`

### Serviço Intermediário Rodando:

```bash
node scripts/printer-service.js
# Output: 🖨️ Serviço de impressão iniciado na porta 3002
```

## ✅ Pronto!

Após seguir todos os passos, a impressão deve funcionar corretamente através do túnel do Cloudflare!

