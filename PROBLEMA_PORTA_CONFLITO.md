# Problema: Conflito de Porta

## 🔍 Diagnóstico

O teste mostrou:
- ✅ Porta 3001 está aberta e acessível
- ❌ Status 404 com resposta HTML do Next.js

**Isso significa que na porta 3001 está rodando o Next.js, não o serviço intermediário!**

## 🎯 Causa

O Next.js está usando a porta 3001 porque a 3000 estava ocupada:
```
⚠ Port 3000 is in use, trying 3001 instead.
- Local:        http://localhost:3001
```

E o serviço intermediário também está configurado para usar a porta 3001, causando conflito.

## ✅ Soluções

### Solução 1: Mudar Porta do Serviço Intermediário (Recomendado)

Modifique o arquivo `scripts/printer-service.js` para usar outra porta:

```javascript
const SERVICE_PORT = 3002; // Mudar de 3001 para 3002
```

Depois:
1. Atualize `.env.local`:
   ```env
   NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3002
   ```
2. Reinicie o servidor Next.js
3. Inicie o serviço intermediário:
   ```powershell
   node scripts/printer-service.js
   ```

### Solução 2: Mudar Porta do Next.js

Configure o Next.js para usar outra porta:

1. Pare o servidor Next.js
2. Libere a porta 3000 (feche o que está usando)
3. Ou force o Next.js a usar outra porta:
   ```powershell
   $env:PORT=3002; npm run dev
   ```

### Solução 3: Usar Porta Diferente no Desenvolvimento

Crie um arquivo `.env.local` com porta diferente para desenvolvimento:

```env
NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3002
```

E modifique `scripts/printer-service.js` para ler a porta de variável de ambiente:

```javascript
const SERVICE_PORT = process.env.PRINTER_SERVICE_PORT || 3002;
```

## 🚀 Solução Rápida

**Opção mais rápida**: Mude a porta do serviço intermediário para 3002:

1. Edite `scripts/printer-service.js`:
   ```javascript
   const SERVICE_PORT = 3002; // Linha 21
   ```

2. Atualize `.env.local`:
   ```env
   NEXT_PUBLIC_PRINTER_SERVICE_URL=http://10.27.10.175:3002
   ```

3. Reinicie o Next.js:
   ```powershell
   # Parar (Ctrl+C) e iniciar novamente
   npm run dev
   ```

4. Inicie o serviço intermediário:
   ```powershell
   node scripts/printer-service.js
   ```

5. Teste:
   ```powershell
   node scripts/test-printer-service.js http://10.27.10.175:3002
   ```

## ✅ Verificação

Após mudar a porta, o teste deve mostrar:

```
✅ Porta está aberta e acessível
✅ Serviço respondeu (status 200)
✅ Resposta válida do serviço
```

E a resposta deve ser JSON, não HTML:

```json
{"success":true,"message":"Etiqueta do palete TESTE impressa com sucesso"}
```

## 📝 Nota

Para produção (Vercel), você pode manter a porta 3001 no serviço intermediário, pois o Vercel não usa essa porta localmente. Mas para desenvolvimento local, use portas diferentes.

