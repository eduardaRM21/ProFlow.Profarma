# Deploy das Edge Functions

## Problema Resolvido

O erro `net::ERR_FAILED` e problemas de CORS eram causados por URLs muito longas ao buscar divergências de relatórios com muitas notas fiscais. A solução implementa uma Edge Function que processa as consultas em lotes no servidor.

## Solução Implementada

### 1. Edge Function (`supabase/functions/divergencias-batch/index.ts`)
- Processa consultas grandes de divergências em lotes de 50 IDs
- Evita problemas de URL longa e CORS
- Retorna dados consolidados

### 2. Hook Atualizado (`hooks/use-optimized-data.ts`)
- Usa Edge Function como método principal
- Fallback para método original com lotes menores (10 IDs)
- Tratamento robusto de erros

### 3. Script de Deploy (`scripts/deploy-edge-functions.js`)
- Automatiza o deploy das Edge Functions
- Verifica dependências e autenticação

## Como Fazer o Deploy

### Pré-requisitos
1. Instalar Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Fazer login no Supabase:
   ```bash
   supabase login
   ```

### Deploy
```bash
npm run deploy:functions
```

### Deploy Manual
```bash
cd supabase/functions
supabase functions deploy divergencias-batch --project-ref ehqxboqxtubeumaupjeq
```

## Verificação

Após o deploy, a Edge Function estará disponível em:
- URL: `https://ehqxboqxtubeumaupjeq.supabase.co/functions/v1/divergencias-batch`
- Método: POST
- Body: `{ "notaIds": ["id1", "id2", ...], "relatorioId": "relatorio_id" }`

## Benefícios

1. **Performance**: Processa consultas grandes no servidor
2. **Confiabilidade**: Evita problemas de URL longa e CORS
3. **Escalabilidade**: Pode processar milhares de IDs
4. **Fallback**: Método alternativo se a Edge Function falhar
5. **Logs**: Monitoramento detalhado do processamento

## Monitoramento

Os logs mostram:
- Quantidade de notas processadas
- Número de lotes processados
- Tempo de processamento
- Erros e fallbacks

## Troubleshooting

Se a Edge Function falhar:
1. Verificar se o deploy foi feito corretamente
2. Verificar logs no Supabase Dashboard
3. O sistema automaticamente usa o método de fallback
4. Verificar permissões de RLS na tabela `divergencias`
