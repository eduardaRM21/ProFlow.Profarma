# 🖨️ Configuração de Impressão - Passo a Passo

## ⚠️ Problema Atual

Você está vendo esta mensagem no console:
```
⚠️ PRINTER_SERVICE_URL não configurado, usando API do Next.js
```

Isso significa que a variável de ambiente não está configurada ou não está sendo lida.

## ✅ Solução em 4 Passos

### Passo 1: Verificar a Configuração Atual

Execute este comando para ver o que está faltando:

```bash
npm run verificar-impressao
```

Este script vai mostrar:
- ✅ Se o arquivo `.env.local` existe
- ✅ Se a variável está configurada
- ✅ Se o serviço intermediário está rodando

### Passo 2: Criar/Editar o Arquivo `.env.local`

1. Na raiz do projeto, crie ou edite o arquivo `.env.local`
2. Adicione esta linha:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001
```

**⚠️ IMPORTANTE:**
- ✅ Correto: `http://localhost:3001`
- ❌ Errado: `http://localhost:3001/print`
- ❌ Errado: `http://localhost:3001/api/print`

### Passo 3: Iniciar o Serviço Intermediário

Em um terminal separado, execute:

```bash
npm run printer-service
```

Você deve ver:
```
🚀 Serviço de Impressão iniciado!
📡 Escutando na porta 3001
```

**Mantenha este terminal aberto!** O serviço precisa estar rodando.

### Passo 4: Reiniciar o Servidor Next.js

**CRÍTICO:** Variáveis `NEXT_PUBLIC_*` só são carregadas quando o servidor inicia!

1. **Pare completamente o servidor Next.js** (pressione Ctrl+C)
2. **Inicie novamente:**
   ```bash
   npm run dev
   ```

### Passo 5: Verificar se Funcionou

1. Abra o console do navegador (F12)
2. Tente imprimir uma etiqueta
3. Verifique os logs:

**✅ SUCESSO - Você deve ver:**
```
🔧 PRINTER_SERVICE_URL configurado: http://localhost:3001
📡 Usando serviço de impressão: http://localhost:3001/print
```

**❌ ERRO - Se você ainda ver:**
```
⚠️ PRINTER_SERVICE_URL não configurado
```

**Solução:**
1. Verifique se o arquivo `.env.local` foi salvo
2. Certifique-se de que parou e reiniciou o servidor Next.js
3. Execute `npm run verificar-impressao` novamente

## 📋 Checklist Rápido

- [ ] Arquivo `.env.local` existe na raiz do projeto
- [ ] Arquivo contém: `NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001`
- [ ] Serviço intermediário está rodando (`npm run printer-service`)
- [ ] Servidor Next.js foi reiniciado após adicionar a variável
- [ ] Console mostra: `🔧 PRINTER_SERVICE_URL configurado`

## 🔍 Verificação Rápida

Execute este comando para verificar tudo de uma vez:

```bash
npm run verificar-impressao
```

## ❓ Ainda não funciona?

Consulte: `TROUBLESHOOTING_IMPRESSAO.md`

