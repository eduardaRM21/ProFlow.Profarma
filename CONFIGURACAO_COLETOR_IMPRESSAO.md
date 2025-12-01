# 🖨️ Configuração de Impressão para Coletor

## 📋 Situação da Rede

- **Coletor:** IP `10.27.10.137` (Rede `10.27.10.0/24`, Gateway `10.27.10.254`)
- **Impressora:** IP `10.27.30.75` (Rede `10.27.30.0/24`, Gateway `10.27.30.254`)

**Problema:** As redes são diferentes, então o coletor não consegue acessar a impressora diretamente.

## ✅ Solução: Serviço Intermediário

O serviço intermediário deve rodar em uma máquina que tenha acesso à rede da impressora (`10.27.30.0/24`).

### Opções de Configuração:

#### Opção 1: Serviço na mesma rede do coletor (Recomendado se houver roteamento)

Se houver roteamento entre as redes `10.27.10.0/24` e `10.27.30.0/24`:

1. **Rodar o serviço em uma máquina na rede `10.27.10.0/24`** (mesma rede do coletor)
2. **A máquina precisa ter acesso à rede `10.27.30.0/24`** (via roteamento)
3. **Configurar no coletor:** `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP_DA_MAQUINA:3001`

#### Opção 2: Serviço na rede da impressora (Recomendado)

1. **Rodar o serviço em uma máquina na rede `10.27.30.0/24`** (mesma rede da impressora)
2. **A máquina precisa ser acessível do coletor** (via roteamento ou firewall)
3. **Configurar no coletor:** `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP_DA_MAQUINA:3001`

#### Opção 3: Máquina com múltiplas interfaces (Ideal)

1. **Máquina com duas interfaces de rede:**
   - Interface 1: Rede `10.27.10.0/24` (acessível pelo coletor)
   - Interface 2: Rede `10.27.30.0/24` (acesso à impressora)
2. **Rodar o serviço nesta máquina**
3. **Configurar no coletor:** `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP_INTERFACE_1:3001`

## 🔧 Passo a Passo

### 1. Identificar a Máquina para Rodar o Serviço

A máquina deve:
- ✅ Ter acesso à rede `10.27.30.0/24` (para conectar à impressora)
- ✅ Ser acessível pelo coletor (IP `10.27.10.137`)

**Exemplo de IPs possíveis:**
- Se o serviço rodar na rede `10.27.10.0/24`: `10.27.10.XXX` (acessível pelo coletor)
- Se o serviço rodar na rede `10.27.30.0/24`: `10.27.30.XXX` (se houver roteamento)

### 2. Iniciar o Serviço Intermediário

Na máquina escolhida, execute:

```bash
npm run printer-service
```

O serviço ficará escutando na porta `3001` em todas as interfaces (`0.0.0.0`).

### 3. Verificar o IP da Máquina

O serviço mostrará o IP local quando iniciar:

```
🚀 Serviço de Impressão iniciado!
📡 Escutando na porta 3001
🖨️ Impressora configurada: 10.27.30.75:6101
```

Anote o IP mostrado (ou use `ipconfig` no Windows ou `ifconfig` no Linux).

### 4. Configurar no Coletor

No coletor, configure a variável de ambiente:

**Opção A: Via arquivo `.env.local` no servidor Next.js**

Se o coletor acessa o Next.js via servidor, adicione no `.env.local` do servidor:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP_DA_MAQUINA:3001
```

**Exemplo:**
- Se o serviço está rodando em `10.27.10.50`: `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.50:3001`
- Se o serviço está rodando em `10.27.30.100`: `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.30.100:3001`

**Opção B: Via configuração do coletor**

Se o coletor tem acesso direto para configurar variáveis de ambiente, configure:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP_DA_MAQUINA:3001
```

### 5. Testar Conectividade

**Do coletor, teste se consegue acessar o serviço:**

```bash
# No coletor ou de uma máquina na mesma rede
curl http://IP_DA_MAQUINA:3001/print -X POST -H "Content-Type: application/json" -d '{"codigoPalete":"TESTE"}'
```

**Da máquina onde o serviço está rodando, teste se consegue acessar a impressora:**

```bash
telnet 10.27.30.75 6101
# ou
telnet 10.27.30.75 9100
```

### 6. Reiniciar o Servidor Next.js (se aplicável)

Se você configurou via `.env.local` no servidor Next.js:

1. Pare o servidor (Ctrl+C)
2. Inicie novamente: `npm run dev`

## 🔍 Verificação de Roteamento

Se o coletor não conseguir acessar o serviço, verifique:

1. **Roteamento entre as redes:**
   - O gateway `10.27.10.254` precisa rotear para `10.27.30.0/24`
   - Ou o gateway `10.27.30.254` precisa rotear para `10.27.10.0/24`

2. **Firewall:**
   - A porta `3001` precisa estar aberta no firewall da máquina onde o serviço roda
   - O firewall precisa permitir conexões da rede `10.27.10.0/24`

3. **Teste de conectividade:**
   ```bash
   # Do coletor, teste ping
   ping IP_DA_MAQUINA
   
   # Teste de porta
   telnet IP_DA_MAQUINA 3001
   ```

## 📝 Resumo da Configuração

```
Coletor (10.27.10.137)
    ↓
    HTTP Request para: http://IP_SERVICO:3001/print
    ↓
Serviço Intermediário (rodando em IP_SERVICO:3001)
    ↓
    TCP/IP para: 10.27.30.75:6101
    ↓
Impressora (10.27.30.75)
```

## ⚠️ Importante

- O serviço intermediário **DEVE** rodar em uma máquina com acesso à rede `10.27.30.0/24`
- O serviço intermediário **DEVE** ser acessível pelo coletor (via roteamento ou mesma rede)
- A variável `NEXT_PUBLIC_PRINTER_SERVICE_URL` no coletor **DEVE** apontar para o IP correto da máquina onde o serviço está rodando

## 🆘 Troubleshooting

### Erro: "Connection refused" do coletor
- Verifique se o serviço está rodando
- Verifique se a porta 3001 está aberta no firewall
- Verifique se o IP está correto na configuração

### Erro: "Timeout" do coletor
- Verifique o roteamento entre as redes
- Teste conectividade: `ping IP_SERVICO` do coletor
- Verifique firewall

### Erro: "Não foi possível conectar à impressora" do serviço
- Verifique se a máquina onde o serviço roda tem acesso à rede `10.27.30.0/24`
- Teste: `telnet 10.27.30.75 6101` da máquina do serviço
- Verifique se a impressora está ligada

