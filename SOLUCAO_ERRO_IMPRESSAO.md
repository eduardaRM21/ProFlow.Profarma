# Solução Rápida: Erro de Conexão com Impressora

## Problema

O erro indica que o servidor Next.js não consegue conectar à impressora `10.27.30.75` porque está em uma rede diferente ou não tem acesso à rede local.

## Solução Rápida (3 Passos)

### 1. Iniciar o Serviço Intermediário

Em uma máquina que tenha acesso à rede local da impressora (mesma rede que `10.27.30.75`), execute:

```bash
npm run printer-service
```

Ou diretamente:

```bash
node scripts/printer-service.js
```

O serviço ficará escutando na porta `3001`.

### 2. Configurar a Variável de Ambiente

No arquivo `.env.local` (crie se não existir), adicione:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP_DA_MAQUINA:3001
```

**Exemplos:**
- Se o serviço estiver na mesma máquina do Next.js: `http://localhost:3001`
- Se o serviço estiver em outra máquina: `http://192.168.1.100:3001` (substitua pelo IP real)

**Importante:** Configure apenas a URL base (sem `/print` no final). O código adiciona automaticamente o caminho `/print`.

### 3. Reiniciar o Servidor Next.js

Após configurar, **é OBRIGATÓRIO reiniciar o servidor Next.js** para que as variáveis de ambiente sejam carregadas:

```bash
# Pare o servidor (Ctrl+C) e inicie novamente
npm run dev
```

**⚠️ IMPORTANTE:** Variáveis `NEXT_PUBLIC_*` só são carregadas na inicialização do servidor. Se você adicionou a variável depois de iniciar, precisa reiniciar!

## Verificação

1. **Verificar se o serviço intermediário está rodando:**
   - Você deve ver a mensagem: `🚀 Serviço de Impressão iniciado!`
   - O serviço deve mostrar o IP e porta onde está escutando

2. **Verificar se a variável de ambiente está configurada:**
   - Abra o arquivo `.env.local` e confirme que contém:
     ```env
     NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001
     ```
   - **NÃO inclua** `/print` ou `/api/print` na URL - apenas a URL base!

3. **Testar a conectividade do serviço intermediário:**
   ```bash
   curl http://localhost:3001/print -X POST -H "Content-Type: application/json" -d '{"codigoPalete":"TESTE"}'
   ```
   Se funcionar, você verá uma resposta JSON com `success: true` ou `success: false`.

4. **Verificar se a impressora está acessível (da máquina onde o serviço está rodando):**
   ```bash
   telnet 10.27.30.75 6101
   # ou
   telnet 10.27.30.75 9100
   ```

## Problemas Comuns

### Erro: "Connection refused"
- **Causa:** O serviço intermediário não está rodando
- **Solução:** Execute `npm run printer-service` em uma máquina com acesso à rede da impressora

### Erro: "Timeout"
- **Causa:** A máquina onde o serviço está rodando não tem acesso à rede da impressora
- **Solução:** Execute o serviço em uma máquina na mesma rede que a impressora (10.27.30.0/24)

### Erro: "ECONNREFUSED"
- **Causa:** A impressora pode estar desligada ou o IP está incorreto
- **Solução:** Verifique se a impressora está ligada e se o IP está correto (10.27.30.75)

## Notas Importantes

⚠️ **O serviço intermediário DEVE rodar em uma máquina que tenha acesso à rede local da impressora.**

Se o servidor Next.js estiver rodando em produção (Vercel, Netlify, etc.), você **PRECISA** usar o serviço intermediário, pois servidores em nuvem não têm acesso à rede local.

## Documentação Completa

Para mais detalhes, consulte: `README-IMPRESSAO.md`

