# 📋 Resumo: Configuração de Impressão para Coletor

## 🎯 Objetivo

Permitir que o coletor (IP `10.27.10.137`) imprima etiquetas na impressora (IP `10.27.30.75`).

## ⚠️ Problema

- **Coletor:** Rede `10.27.10.0/24`
- **Impressora:** Rede `10.27.30.0/24`
- **Solução:** Serviço intermediário

## ✅ Solução Rápida (3 Passos)

### 1. Escolher a Máquina para Rodar o Serviço

A máquina deve ter acesso à rede `10.27.30.0/24` (rede da impressora).

**Opções:**
- ✅ Máquina na rede `10.27.30.0/24` (ideal)
- ✅ Máquina na rede `10.27.10.0/24` com roteamento para `10.27.30.0/24`
- ✅ Máquina com duas interfaces (uma em cada rede)

### 2. Iniciar o Serviço

Na máquina escolhida:

```bash
npm run printer-service
```

O serviço mostrará os IPs disponíveis. Anote o IP que o coletor pode acessar.

### 3. Configurar no Coletor

No arquivo `.env.local` do servidor Next.js (ou configuração do coletor):

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP_DA_MAQUINA:3001
```

**Exemplo:**
- Se o serviço está em `10.27.10.50`: `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.50:3001`
- Se o serviço está em `10.27.30.100`: `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.30.100:3001`

## 🔍 Verificação

1. **Teste do coletor para o serviço:**
   ```bash
   curl http://IP_SERVICO:3001/print -X POST -H "Content-Type: application/json" -d '{"codigoPalete":"TESTE"}'
   ```

2. **Teste do serviço para a impressora:**
   ```bash
   telnet 10.27.30.75 6101
   ```

## 📚 Documentação Completa

Consulte: `CONFIGURACAO_COLETOR_IMPRESSAO.md`

