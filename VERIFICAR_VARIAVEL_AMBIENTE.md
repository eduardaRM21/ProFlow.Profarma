# Como Verificar a Variável de Ambiente

## Problema

Se você vê nos logs do Next.js:
```
OPTIONS /print 404
GET /print 404
```

Isso significa que a variável `NEXT_PUBLIC_PRINTER_SERVICE_URL` **não está configurada** ou está incorreta.

## Verificação Rápida

### 1. Verificar no Código (Console do Navegador)

Abra o Console do navegador (F12) e procure por:

```
🔍 Debug - PRINTER_SERVICE_URL: não configurado
```

Se aparecer "não configurado", a variável não está sendo lida.

### 2. Verificar Arquivo .env.local

Crie ou edite o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3001
```

⚠️ **IMPORTANTE**:
- Use o IP da máquina onde o serviço está rodando
- **NÃO** inclua `/print` no final
- Use `http://` (não `https://`) para rede interna
- Reinicie o servidor Next.js após alterar

### 3. Verificar se o Servidor Foi Reiniciado

Após alterar `.env.local`, você **DEVE** reiniciar o servidor Next.js:

```powershell
# Parar o servidor (Ctrl+C)
# Depois iniciar novamente
npm run dev
```

### 4. Verificar no Console do Navegador

Após reiniciar, abra o Console (F12) e procure por:

```
🔍 Debug - PRINTER_SERVICE_URL: http://10.27.10.175:3001
```

Se aparecer a URL, está configurado corretamente.

## Exemplo de Configuração Correta

### Arquivo `.env.local`:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3001
```

### Logs Esperados no Console:

```
🖨️ Iniciando impressão do palete: PAL-00033_2-3
🔍 Debug - PRINTER_SERVICE_URL: http://10.27.10.175:3001
🔍 Debug - isClient: true
📡 Fazendo requisição direta do cliente para o serviço intermediário: http://10.27.10.175:3001
🔗 URL completa do serviço: http://10.27.10.175:3001/print
```

## Erros Comuns

### ❌ Errado: URL com `/print`
```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3001/print
```

### ✅ Correto: URL sem `/print`
```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3001
```

### ❌ Errado: Usar `localhost` quando serviço está em outra máquina
```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001
```

### ✅ Correto: Usar IP da máquina do serviço
```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3001
```

## Para Produção (Vercel)

No Vercel, configure a variável de ambiente:

1. Vercel Dashboard > Seu Projeto > Settings > Environment Variables
2. Adicione: `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3001`
3. Marque: Production, Preview, Development
4. **Faça redeploy**

## Teste Rápido

Execute no Console do navegador (F12):

```javascript
console.log('PRINTER_SERVICE_URL:', process.env.NEXT_PUBLIC_PRINTER_SERVICE_URL)
```

Se retornar `undefined`, a variável não está configurada.

## Checklist

- [ ] Arquivo `.env.local` existe na raiz do projeto?
- [ ] Variável está escrita corretamente: `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP:3001`?
- [ ] URL não tem `/print` no final?
- [ ] IP está correto (da máquina onde o serviço roda)?
- [ ] Servidor Next.js foi reiniciado após alterar `.env.local`?
- [ ] Console do navegador mostra a URL configurada?

