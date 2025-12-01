# Guia de Configuração de Impressão

## Problema

O servidor Next.js não consegue se conectar diretamente à impressora de rede `10.27.30.75` (IP atualizado) porque:

1. O servidor pode estar rodando em um ambiente que não tem acesso à rede local
2. Pode haver firewall bloqueando as conexões TCP
3. O servidor Next.js em desenvolvimento pode não ter acesso à rede local

## Solução: Serviço Intermediário

Para resolver este problema, criamos um serviço Node.js standalone que deve rodar em uma máquina que tenha acesso à rede local da impressora.

### Passo 1: Iniciar o Serviço de Impressão

Em uma máquina que tenha acesso à rede local da impressora (mesma rede que `10.27.30.75`), execute:

```bash
node scripts/printer-service.js
```

O serviço ficará escutando na porta `3001` e receberá requisições de impressão.

### Passo 2: Configurar a URL do Serviço

No arquivo `.env.local` (ou `.env`), adicione:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP_DA_MAQUINA:3001
```

**Exemplo:**
- Se o serviço estiver rodando na mesma máquina do Next.js: `http://localhost:3001`
- Se o serviço estiver em outra máquina na rede: `http://192.168.1.100:3001`

**Importante:** Configure apenas a URL base (sem `/print` no final). O código adiciona automaticamente o caminho `/print` ao fazer a requisição.

### Passo 3: Verificar Conectividade

Antes de usar, teste se o serviço está acessível:

```bash
curl http://IP_DA_MAQUINA:3001/print -X POST -H "Content-Type: application/json" -d '{"codigoPalete":"TESTE"}'
```

## Alternativa: Rodar o Serviço como Serviço do Windows

Para rodar o serviço automaticamente no Windows:

1. Crie um arquivo `printer-service.bat`:
```batch
@echo off
cd /d "C:\caminho\para\o\projeto"
node scripts/printer-service.js
pause
```

2. Ou use o Task Scheduler do Windows para iniciar automaticamente.

## Verificação de Conectividade

Para verificar se a impressora está acessível, execute no terminal:

```bash
telnet 10.27.30.75 6101
# ou
telnet 10.27.30.75 9100
```

Se conectar, a impressora está acessível. Se não, verifique:
- Se a impressora está ligada
- Se o IP está correto
- Se há firewall bloqueando

## Teste da API

Acesse no navegador para testar a conectividade:
```
http://localhost:3000/api/print/test
```

## Solução de Problemas

### Erro: "Connection refused"
- Verifique se o serviço está rodando
- Verifique se a porta 3001 não está sendo usada por outro processo
- Verifique se o firewall permite conexões na porta 3001

### Erro: "Timeout"
- Verifique se a máquina onde o serviço está rodando tem acesso à rede local da impressora
- Teste a conectividade com `telnet 10.27.30.75 6101`
- Verifique se não há firewall bloqueando

### Erro: "ECONNREFUSED"
- A impressora pode estar desligada
- O IP pode estar incorreto
- A porta pode estar incorreta

## Notas Importantes

⚠️ **IMPORTANTE**: O serviço intermediário DEVE rodar em uma máquina que tenha acesso à rede local da impressora (`10.27.30.75`).

Se o servidor Next.js estiver rodando em produção (Vercel, Netlify, etc.), você PRECISA usar o serviço intermediário, pois servidores em nuvem não têm acesso à rede local.

