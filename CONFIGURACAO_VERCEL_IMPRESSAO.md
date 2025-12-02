# Configuração de Impressão no Vercel

## Problema

Quando você faz deploy no Vercel, o servidor não consegue acessar impressoras na rede local (IPs privados como `10.27.30.75`). Isso acontece porque:

1. O Vercel roda em servidores na nuvem, não na sua rede local
2. IPs privados (10.x.x.x, 192.168.x.x) não são acessíveis da internet
3. A impressora precisa estar acessível via rede local

## Solução: Requisição Direta do Cliente (Recomendado para Redes Corporativas)

**Para redes corporativas privadas**, a melhor solução é fazer a requisição diretamente do navegador do cliente para o serviço intermediário, sem passar pelo servidor do Vercel. Isso funciona porque:

- O cliente (navegador) está na rede corporativa
- O serviço intermediário está na rede corporativa
- Não precisa expor nada publicamente na internet

### Passo a Passo (Rede Corporativa)

1. **Iniciar o Serviço Intermediário** em uma máquina na rede corporativa
2. **Configurar a variável de ambiente** no Vercel com o IP interno da máquina
3. **Pronto!** O navegador fará a requisição diretamente para o serviço local

## Solução Alternativa: Serviço Intermediário + Túnel (Para Redes Públicas)

Se você precisar que o servidor do Vercel faça a requisição (não recomendado para redes corporativas), você precisa:

1. **Rodar o serviço intermediário** em uma máquina que tenha acesso à rede local da impressora
2. **Expor o serviço publicamente** usando um túnel reverso (ngrok, Cloudflare Tunnel, etc.)
3. **Configurar a variável de ambiente** no Vercel apontando para o túnel público

## Passo a Passo - Rede Corporativa (Recomendado)

### 1. Iniciar o Serviço Intermediário

Em uma máquina que tenha acesso à rede local da impressora (`10.27.30.75`) e que esteja na mesma rede corporativa dos clientes, execute:

```bash
node scripts/printer-service.js
```

O serviço ficará escutando na porta `3001` e mostrará o IP da máquina (ex: `10.27.10.50`).

### 2. Configurar Variável de Ambiente no Vercel

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione uma nova variável:
   - **Name**: `NEXT_PUBLIC_PRINTER_SERVICE_URL`
   - **Value**: `http://10.27.10.50:3001` (use o IP da máquina onde o serviço está rodando)
   - **Environments**: Selecione Production, Preview e Development
5. Clique em **Save**

⚠️ **IMPORTANTE**: 
- Use o IP interno da máquina (não precisa ser público)
- Use HTTP (não HTTPS) para rede interna
- Não inclua `/print` ou `/api/print` na URL

### 3. Fazer Redeploy

Após configurar a variável de ambiente:

1. No Vercel Dashboard, vá em **Deployments**
2. Clique nos três pontos (...) do último deploy
3. Selecione **Redeploy**

### 4. Como Funciona

Quando o usuário acessa a aplicação no Vercel e tenta imprimir:
1. O navegador do cliente (que está na rede corporativa) lê a variável `NEXT_PUBLIC_PRINTER_SERVICE_URL`
2. Faz a requisição **diretamente** do navegador para o serviço intermediário na rede local
3. O serviço intermediário imprime na impressora
4. **Não passa pelo servidor do Vercel** - tudo acontece na rede corporativa!

## Passo a Passo - Túnel Público (Apenas se Necessário)

Se por algum motivo você precisar que o servidor do Vercel faça a requisição (não recomendado para redes corporativas):

### 1. Iniciar o Serviço Intermediário

Em uma máquina que tenha acesso à rede local da impressora (`10.27.30.75`), execute:

```bash
node scripts/printer-service.js
```

O serviço ficará escutando na porta `3001`.

### 2. Expor o Serviço Publicamente

Você precisa usar um túnel reverso para expor o serviço local para a internet. Escolha uma das opções:

#### Opção A: ngrok (Mais Simples)

1. Instale o ngrok: https://ngrok.com/download
2. Execute:
   ```bash
   ngrok http 3001
   ```
3. Copie a URL HTTPS fornecida (ex: `https://abc123.ngrok.io`)

#### Opção B: Cloudflare Tunnel (Gratuito e Permanente)

1. Instale o Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
2. Configure o túnel seguindo a documentação oficial
3. Exponha a porta 3001 através do túnel

#### Opção C: Outro Serviço de Túnel

- LocalTunnel
- Serveo
- Bore
- Outros serviços de túnel reverso

### 3. Configurar Variável de Ambiente no Vercel (Túnel)

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione uma nova variável:
   - **Name**: `NEXT_PUBLIC_PRINTER_SERVICE_URL`
   - **Value**: A URL do túnel (ex: `https://abc123.ngrok.io`)
   - **Environments**: Selecione Production, Preview e Development (ou apenas Production)
5. Clique em **Save**

⚠️ **IMPORTANTE**: 
- Use apenas a URL base do túnel (sem `/print` no final)
- Use HTTPS se possível
- Não inclua `/api/print` ou `/print` na URL

### 4. Fazer Redeploy (Túnel)

Após configurar a variável de ambiente:

1. No Vercel Dashboard, vá em **Deployments**
2. Clique nos três pontos (...) do último deploy
3. Selecione **Redeploy**

Ou faça um novo commit e push para o repositório.

## Verificação

### Para Rede Corporativa

Após o deploy, teste a impressão. Se ainda houver erros:

1. Verifique se o serviço intermediário está rodando na máquina local
2. Verifique se o IP está correto na variável de ambiente
3. Teste o serviço manualmente da máquina do cliente:
   ```bash
   curl http://10.27.10.50:3001/print -X POST -H "Content-Type: application/json" -d '{"codigoPalete":"TESTE"}'
   ```
4. Verifique se o cliente está na mesma rede que o serviço intermediário
5. Verifique os logs do navegador (F12 > Console) para ver erros de CORS ou conexão

### Para Túnel Público

Após o deploy, teste a impressão. Se ainda houver erros:

1. Verifique se o serviço intermediário está rodando
2. Verifique se o túnel está ativo e acessível
3. Teste o túnel manualmente:
   ```bash
   curl https://seu-tunel.ngrok.io/print -X POST -H "Content-Type: application/json" -d '{"codigoPalete":"TESTE"}'
   ```
4. Verifique os logs do Vercel para ver se a variável está sendo lida corretamente

## Vantagens da Solução para Rede Corporativa

✅ **Mais Seguro**: Nada é exposto publicamente na internet
✅ **Mais Simples**: Não precisa configurar túneis
✅ **Mais Confiável**: Não depende de serviços externos
✅ **Mais Rápido**: Requisição direta na rede local
✅ **Sem Custos**: Não precisa de serviços de túnel

## Manter o Túnel Ativo (Apenas se Usar Túnel)

⚠️ **ATENÇÃO**: Túneis gratuitos (como ngrok) podem mudar de URL a cada reinicialização.

### Soluções:

1. **ngrok com conta gratuita**: Use um domínio fixo (disponível na versão gratuita)
2. **Cloudflare Tunnel**: Oferece URLs fixas e é gratuito
3. **Script de atualização**: Crie um script que atualiza a variável no Vercel via API quando o túnel reinicia

## Segurança

### Para Rede Corporativa (Recomendado)

✅ **Seguro por padrão**: O serviço só é acessível na rede corporativa
- Não é exposto publicamente
- Apenas máquinas na rede local podem acessar
- Não precisa de autenticação adicional (a rede já é privada)

### Para Túnel Público (Não Recomendado)

⚠️ **IMPORTANTE**: Expor o serviço de impressão publicamente pode ser um risco de segurança.

### Recomendações:

1. **Autenticação**: Adicione autenticação ao serviço intermediário
2. **Rate Limiting**: Limite o número de requisições por IP
3. **Whitelist de IPs**: Se possível, restrinja acesso apenas ao Vercel
4. **HTTPS**: Sempre use HTTPS (ngrok e Cloudflare Tunnel já fornecem)

## Resumo das Soluções

### ✅ Solução Recomendada: Requisição Direta do Cliente (Rede Corporativa)

- **Como funciona**: Navegador → Serviço Intermediário (direto na rede local)
- **Configuração**: Apenas variável `NEXT_PUBLIC_PRINTER_SERVICE_URL` com IP interno
- **Segurança**: Alta (rede privada)
- **Complexidade**: Baixa
- **Custo**: Gratuito

### ⚠️ Solução Alternativa: Túnel Público

- **Como funciona**: Vercel → Túnel → Serviço Intermediário → Impressora
- **Configuração**: Serviço intermediário + túnel + variável de ambiente
- **Segurança**: Média (exposto publicamente)
- **Complexidade**: Alta
- **Custo**: Pode ter custos dependendo do serviço

### 🔒 Solução Avançada: VPN Corporativa

Se sua empresa tem VPN e o Vercel suporta:

1. Configurar o Vercel para acessar via VPN
2. Usar o IP interno da máquina onde o serviço está rodando
3. Não precisa de túnel público

## Troubleshooting

### Erro: "Não foi possível conectar ao serviço intermediário"

- Verifique se o serviço está rodando
- Verifique se o túnel está ativo
- Teste o túnel manualmente com curl
- Verifique se a variável está configurada corretamente no Vercel

### Erro: "Connection refused"

- O serviço pode não estar rodando
- A porta pode estar bloqueada pelo firewall
- O túnel pode não estar configurado corretamente

### Erro: "Timeout"

- O túnel pode estar inativo
- Pode haver problema de rede
- Verifique se o serviço está acessível localmente

## Suporte

Para mais informações, consulte:
- `README-IMPRESSAO.md` - Documentação geral de impressão
- Logs do Vercel - Para ver erros detalhados
- Logs do serviço intermediário - Para ver o que está acontecendo no servidor local

