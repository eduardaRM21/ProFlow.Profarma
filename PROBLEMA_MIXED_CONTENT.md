# Problema: Mixed Content (HTTPS → HTTP)

## O Problema

Quando você acessa a aplicação no Vercel via **HTTPS** (`https://proflowprofarma.vercel.app`) e tenta fazer uma requisição para o serviço intermediário via **HTTP** (`http://10.27.10.175:3001`), o navegador bloqueia por política de **Mixed Content**.

## Por que acontece?

Navegadores modernos bloqueiam requisições HTTP de páginas HTTPS por segurança. Isso é uma política de segurança do navegador, não um bug.

## Sintomas

- Erro: `Failed to fetch`
- Erro: `Mixed Content: The page was loaded over HTTPS, but requested an insecure resource`
- Requisição não chega ao servidor (não aparece nos logs)
- Funciona com `curl` mas não no navegador

## Soluções

### Solução 1: Usar HTTPS no Serviço Intermediário (Recomendado)

Configure o serviço intermediário para usar HTTPS:

1. **Gerar certificado SSL auto-assinado** (para uso interno):

```bash
# Instalar openssl se não tiver
# Windows: Baixar de https://slproweb.com/products/Win32OpenSSL.html

# Gerar chave privada
openssl genrsa -out key.pem 2048

# Gerar certificado
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/CN=10.27.10.175"
```

2. **Modificar o serviço intermediário** para usar HTTPS:

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options, (req, res) => {
  // ... código existente
});
```

3. **Atualizar variável de ambiente** no Vercel:
   - `NEXT_PUBLIC_PRINTER_SERVICE_URL=https://10.27.10.175:3001`

4. **Aceitar certificado no navegador** (primeira vez):
   - O navegador vai avisar sobre certificado não confiável
   - Clique em "Avançado" > "Continuar mesmo assim"

### Solução 2: Usar Proxy Reverso com HTTPS

Configure um proxy reverso (nginx, Caddy, etc.) com HTTPS na frente do serviço:

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name impressora.local;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Solução 3: Desabilitar Mixed Content (Apenas Desenvolvimento)

⚠️ **NÃO RECOMENDADO PARA PRODUÇÃO** - Apenas para testes

No Chrome/Edge:
1. Abra: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Adicione: `http://10.27.10.175:3001`
3. Reinicie o navegador

**Problema**: Cada usuário precisaria fazer isso, não é viável.

### Solução 4: Usar API Route do Next.js como Proxy

Fazer a requisição passar pelo servidor do Next.js (que está em HTTPS) e o servidor faz a requisição HTTP internamente:

1. A requisição do navegador vai para `/api/print` (HTTPS)
2. A API do Next.js faz requisição HTTP para o serviço intermediário
3. Retorna a resposta para o navegador

**Problema**: No Vercel, o servidor não tem acesso à rede local.

### Solução 5: Usar Túnel com HTTPS (ngrok, Cloudflare Tunnel)

Use um túnel que fornece HTTPS:

```bash
ngrok http 3001
# Retorna: https://abc123.ngrok.io
```

Configure no Vercel:
- `NEXT_PUBLIC_PRINTER_SERVICE_URL=https://abc123.ngrok.io`

**Problema**: Requer serviço externo e pode ter custos.

## Solução Recomendada para Rede Corporativa

Para redes corporativas, a **melhor solução** é:

1. **Configurar certificado SSL interno** (pode ser auto-assinado)
2. **Usar HTTPS no serviço intermediário**
3. **Configurar no Vercel com HTTPS**

Isso mantém tudo seguro e funciona com navegadores modernos.

## Verificação

Para verificar se é problema de Mixed Content:

1. Abra o Console do navegador (F12)
2. Procure por mensagens como:
   - "Mixed Content"
   - "blocked:mixed-content"
   - "The page was loaded over HTTPS"

Se encontrar essas mensagens, o problema é Mixed Content.

## Script para Gerar Certificado SSL

Crie um arquivo `generate-cert.sh` (ou `.bat` no Windows):

```bash
#!/bin/bash
openssl genrsa -out key.pem 2048
openssl req -new -x509 -key key.pem -out cert.pem -days 365 \
  -subj "/C=BR/ST=Estado/L=Cidade/O=Empresa/CN=10.27.10.175"
echo "Certificados gerados: key.pem e cert.pem"
```

No Windows (PowerShell):
```powershell
openssl genrsa -out key.pem 2048
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/C=BR/ST=Estado/L=Cidade/O=Empresa/CN=10.27.10.175"
```

## Próximos Passos

1. Gere o certificado SSL
2. Modifique o serviço intermediário para usar HTTPS
3. Atualize a variável de ambiente no Vercel
4. Teste novamente

