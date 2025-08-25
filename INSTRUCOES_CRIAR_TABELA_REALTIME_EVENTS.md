# Instruções para Criar a Tabela realtime_events

## Problema Identificado
A exclusão de carros não está funcionando porque a tabela `realtime_events` não existe no banco de dados. Esta tabela é necessária para a sincronização em tempo real entre a página admin e a sessão "Carros Produzidos".

## Solução
Execute o seguinte SQL no seu banco de dados Supabase:

## Passos:

### 1. Acesse o Painel do Supabase
- Vá para [https://supabase.com](https://supabase.com)
- Faça login na sua conta
- Acesse o projeto ProFlow_Profarma

### 2. Vá para SQL Editor
- No menu lateral, clique em "SQL Editor"
- Clique em "New query"

### 3. Cole o SQL abaixo e execute:

```sql
-- Criar tabela para eventos em tempo real
CREATE TABLE IF NOT EXISTS realtime_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  carro_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_realtime_events_event_type ON realtime_events(event_type);
CREATE INDEX IF NOT EXISTS idx_realtime_events_carro_id ON realtime_events(carro_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_timestamp ON realtime_events(timestamp);

-- Habilitar RLS (Row Level Security)
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de eventos
CREATE POLICY "Permitir inserção de eventos" ON realtime_events
  FOR INSERT WITH CHECK (true);

-- Política para permitir leitura de eventos
CREATE POLICY "Permitir leitura de eventos" ON realtime_events
  FOR SELECT USING (true);

-- Comentários
COMMENT ON TABLE realtime_events IS 'Tabela para sincronização em tempo real de eventos do sistema';
COMMENT ON COLUMN realtime_events.event_type IS 'Tipo do evento (ex: carro_excluido, carro_criado)';
COMMENT ON COLUMN realtime_events.carro_id IS 'ID do carro relacionado ao evento';
COMMENT ON COLUMN realtime_events.data IS 'Dados adicionais do evento em formato JSON';
```

### 4. Execute o Script
- Clique no botão "Run" (▶️) ou pressione Ctrl+Enter
- Aguarde a execução completar
- Verifique se não há erros

### 5. Verificação
Após executar o SQL, você deve ver:
- ✅ Tabela `realtime_events` criada
- ✅ Índices criados
- ✅ RLS habilitado
- ✅ Políticas criadas

## O que isso resolve:

1. **Exclusão de Carros**: A exclusão agora funcionará corretamente
2. **Sincronização em Tempo Real**: Quando um carro for excluído na página admin, ele será automaticamente removido da sessão "Carros Produzidos"
3. **Eventos de Sistema**: O sistema poderá emitir eventos para sincronização entre diferentes sessões

## Teste
Após criar a tabela:
1. Vá para a página admin
2. Tente excluir um carro
3. Verifique se ele foi removido da sessão "Carros Produzidos"
4. Verifique se apareceu um toast de confirmação

## Arquivos Modificados
- `lib/embalagem-notas-bipadas-service.ts` - Adicionada emissão de eventos
- `hooks/use-realtime-monitoring.ts` - Adicionado listener de eventos
- `app/painel/components/carros-produzidos-section.tsx` - Adicionada escuta de eventos

## Suporte
Se ainda houver problemas após criar a tabela, verifique os logs do console do navegador para identificar possíveis erros.
