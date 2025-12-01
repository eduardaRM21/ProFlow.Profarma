# Troubleshooting: Erro de Impressão

## ⚡ Verificação Rápida

Execute este comando para verificar a configuração:

```bash
npm run verificar-impressao
```

Este script verifica:
- Se o arquivo `.env.local` existe
- Se a variável `NEXT_PUBLIC_PRINTER_SERVICE_URL` está configurada
- Se o serviço intermediário está rodando

## Erro: `⚠️ PRINTER_SERVICE_URL não configurado`

Este erro indica que a variável de ambiente não está sendo lida pelo Next.js.

### Causas Possíveis:

1. **Variável de ambiente não configurada ou incorreta**
2. **Servidor Next.js não foi reiniciado após configurar a variável**
3. **Variável configurada com `/api/print` por engano**

## Solução Passo a Passo

### Passo 1: Verificar o arquivo `.env.local`

Abra o arquivo `.env.local` na raiz do projeto e verifique se contém:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001
```

**❌ ERRADO:**
```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001/api/print
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001/print
```

**✅ CORRETO:**
```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001
```

### Passo 2: Verificar se o serviço intermediário está rodando

Em um terminal separado, execute:

```bash
npm run printer-service
```

Você deve ver:
```
🚀 Serviço de Impressão iniciado!
📡 Escutando na porta 3001
```

### Passo 3: Testar o serviço intermediário diretamente

Em outro terminal, teste se o serviço está respondendo:

```bash
curl http://localhost:3001/print -X POST -H "Content-Type: application/json" -d "{\"codigoPalete\":\"TESTE\"}"
```

Se funcionar, você verá uma resposta JSON.

### Passo 4: Reiniciar o servidor Next.js

**IMPORTANTE:** Variáveis `NEXT_PUBLIC_*` só são carregadas quando o servidor Next.js inicia!

1. Pare o servidor Next.js (Ctrl+C)
2. Inicie novamente:
   ```bash
   npm run dev
   ```

### Passo 5: Verificar os logs no console do navegador

Após reiniciar, tente imprimir novamente e verifique os logs no console:

- Você deve ver: `🔧 PRINTER_SERVICE_URL configurado: http://localhost:3001`
- Você deve ver: `📡 Usando serviço de impressão: http://localhost:3001/print`

Se você ver `⚠️ PRINTER_SERVICE_URL não configurado`, a variável não está sendo lida.

## Verificação Rápida

Execute este comando no terminal para verificar se a variável está configurada:

```bash
# Windows PowerShell
Get-Content .env.local | Select-String "PRINTER_SERVICE"

# Windows CMD
findstr "PRINTER_SERVICE" .env.local

# Linux/Mac
grep "PRINTER_SERVICE" .env.local
```

## Solução Rápida para "PRINTER_SERVICE_URL não configurado"

Se você vê a mensagem `⚠️ PRINTER_SERVICE_URL não configurado`, siga estes passos:

1. **Criar/editar o arquivo `.env.local` na raiz do projeto:**
   ```env
   NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001
   ```

2. **Verificar se o arquivo foi salvo corretamente:**
   ```bash
   npm run verificar-impressao
   ```

3. **PARAR completamente o servidor Next.js** (Ctrl+C)

4. **Iniciar novamente:**
   ```bash
   npm run dev
   ```

5. **Verificar os logs no console do navegador:**
   - Deve aparecer: `🔧 PRINTER_SERVICE_URL configurado: http://localhost:3001`
   - NÃO deve aparecer: `⚠️ PRINTER_SERVICE_URL não configurado`

## Se ainda não funcionar

1. **Limpar cache do Next.js:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Verificar se há múltiplos arquivos .env:**
   - `.env`
   - `.env.local`
   - `.env.development`
   
   O Next.js carrega variáveis nesta ordem. Certifique-se de que `.env.local` tem a configuração correta.

3. **Verificar se o serviço intermediário está acessível:**
   - Abra o navegador e acesse: `http://localhost:3001/print`
   - Você deve ver uma resposta (mesmo que seja um erro 405, significa que o serviço está rodando)

4. **Verificar firewall:**
   - Certifique-se de que a porta 3001 não está bloqueada pelo firewall

## Logs de Debug

O código agora mostra logs detalhados. Verifique no console do navegador:

- `🔧 PRINTER_SERVICE_URL configurado: ...` - mostra o valor da variável
- `📡 Usando serviço de impressão: ...` - mostra a URL final que será usada

Se você não ver esses logs, o código pode não ter sido atualizado. Verifique se salvou o arquivo `lib/printer-service.ts`.

