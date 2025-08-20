# Como Criar a Tabela embalagem_notas_bipadas no Supabase

## Resumo da Solução

As notas bipadas no setor de embalagem agora devem ser:
1. **Validadas** pela tabela `notas_fiscais` (verificando se a NF foi processada em algum setor)
2. **Armazenadas** na tabela específica `embalagem_notas_bipadas`

## Passos para Criar a Tabela

### 1. Acessar o Painel do Supabase
- Vá para [supabase.com](https://supabase.com)
- Faça login na sua conta
- Acesse o projeto `vzqibndtoitnppvgkekc`

### 2. Abrir o SQL Editor
- No painel do Supabase, clique em "SQL Editor" no menu lateral
- Clique em "New query"

### 3. Executar o SQL
Copie e cole o seguinte SQL no editor:

```sql
-- =====================================================
-- TABELA DE NOTAS BIPADAS DO SETOR DE EMBALAGEM
-- =====================================================
CREATE TABLE IF NOT EXISTS embalagem_notas_bipadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_nf VARCHAR(50) NOT NULL,
    codigo_completo VARCHAR(255) NOT NULL,
    carro_id VARCHAR(255), -- Alterado de UUID para VARCHAR para compatibilidade
    session_id VARCHAR(255),
    colaboradores TEXT,
    data DATE NOT NULL,
    turno VARCHAR(50) NOT NULL,
    volumes INTEGER DEFAULT 1,
    destino VARCHAR(255),
    fornecedor VARCHAR(255),
    cliente_destino VARCHAR(255),
    tipo_carga VARCHAR(100),
    status VARCHAR(50) DEFAULT 'bipada',
    observacoes TEXT,
    timestamp_bipagem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_codigo_completo ON embalagem_notas_bipadas(codigo_completo);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_numero_nf ON embalagem_notas_bipadas(numero_nf);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_carro_id ON embalagem_notas_bipadas(carro_id);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_session_id ON embalagem_notas_bipadas(session_id);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_data ON embalagem_notas_bipadas(data);
CREATE INDEX IF NOT EXISTS idx_embalagem_notas_bipadas_timestamp ON embalagem_notas_bipadas(timestamp_bipagem);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_embalagem_notas_bipadas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_embalagem_notas_bipadas_updated_at
    BEFORE UPDATE ON embalagem_notas_bipadas
    FOR EACH ROW
    EXECUTE FUNCTION update_embalagem_notas_bipadas_updated_at();
```

### 4. Executar o Comando
- Clique no botão "Run" para executar o SQL
- Aguarde a confirmação de que a tabela foi criada

### 5. Verificar a Criação
- Vá para "Table Editor" no menu lateral
- Procure pela tabela `embalagem_notas_bipadas`
- Confirme que ela foi criada com todas as colunas

## ⚠️ Importante: Mudança no Tipo do Campo carro_id

**ATENÇÃO**: O campo `carro_id` foi alterado de `UUID` para `VARCHAR(255)` para compatibilidade com os IDs dos carros gerados pelo sistema. Isso resolve o erro de tipo que estava ocorrendo.

### Por que essa mudança?

O sistema gera IDs dos carros no formato `"carro_X_timestamp"` (ex: `"carro_4_1755552575038"`), mas a tabela estava configurada para aceitar apenas UUIDs válidos. Com essa alteração, o sistema funcionará corretamente.

## Configuração de Permissões (RLS)

Após criar a tabela, configure as políticas RLS:

```sql
-- Habilitar RLS
ALTER TABLE embalagem_notas_bipadas ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção
CREATE POLICY "Permitir inserção de notas bipadas" ON embalagem_notas_bipadas
    FOR INSERT WITH CHECK (true);

-- Política para permitir leitura
CREATE POLICY "Permitir leitura de notas bipadas" ON embalagem_notas_bipadas
    FOR SELECT USING (true);

-- Política para permitir atualização
CREATE POLICY "Permitir atualização de notas bipadas" ON embalagem_notas_bipadas
    FOR UPDATE USING (true);

-- Política para permitir exclusão
CREATE POLICY "Permitir exclusão de notas bipadas" ON embalagem_notas_bipadas
    FOR DELETE USING (true);
```

## Funcionalidades Implementadas

### 1. Validação
- As notas são validadas contra a tabela `notas_fiscais`
- Apenas notas que foram processadas em algum setor podem ser embaladas
- A validação usa a coluna `codigo_completo` para busca

### 2. Detecção de Duplicatas
- **Verificação automática**: O sistema verifica se a nota já foi bipada em outro carro
- **Prevenção de duplicação**: Não é possível bipar a mesma nota em carros diferentes
- **Informações detalhadas**: Mostra em qual carro e quando a nota foi bipada anteriormente

### 3. Armazenamento Inteligente
- **Salvamento condicional**: As notas só são salvas no banco quando o carro for marcado como "embalar carro"
- **Estado local**: Durante a bipagem, as notas ficam apenas no estado local do carro
- **Persistência automática**: Quando o carro é marcado para embalagem, todas as notas são salvas automaticamente
- **Tabela específica**: As notas são salvas na tabela `embalagem_notas_bipadas`
- **Informações completas**: Cada nota inclui dados do carro, sessão, colaboradores, timestamp, etc.
- **Sincronização com Admin**: Carros marcados como "embalar carro" aparecem na página admin com status "embalando"

### 4. Serviços
- `EmbalagemNotasBipadasService` para gerenciar as operações
- **Verificação de duplicatas**: `verificarNotaJaBipada()` para detectar notas já bipadas
- **Salvamento condicional**: `salvarNotaBipada()` para persistir no banco
- **Busca e consulta**: Funções para buscar por carro, sessão e gerar estatísticas
- **Estatísticas em tempo real**: `buscarEstatisticas()` e `buscarCarrosProntos()` para dashboard
- **Tratamento de erros**: Sistema robusto de logs e tratamento de falhas

### 5. Interface
- **Componente atualizado**: `nfs-bipadas-section.tsx` com nova lógica de validação e salvamento
- **Verificação em tempo real**: Alerta imediato se nota já foi bipada em outro carro
- **Logs detalhados**: Sistema completo de logs para debug e monitoramento
- **Feedback visual**: Mensagens informativas e alertas para o usuário
- **Fluxo otimizado**: Processo de bipagem → validação → estado local → salvamento no banco
- **Dashboard em tempo real**: Estatísticas "NFs Bipadas" e "Carros Prontos" baseadas na tabela `embalagem_notas_bipadas`
- **Botão Finalizar**: Botão para marcar carro como "finalizado" e sincronizar com página admin

## Arquivos Modificados

1. **`create-embalagem-notas-bipadas-table.sql`** - Script SQL para criar a tabela
2. **`lib/embalagem-notas-bipadas-service.ts`** - Serviço completo com verificação de duplicatas, salvamento condicional e estatísticas
3. **`app/painel/components/nfs-bipadas-section.tsx`** - Componente principal com nova lógica de validação e fluxo de salvamento
4. **`hooks/use-embalagem-stats.ts`** - Hook personalizado para buscar estatísticas em tempo real
5. **`app/painel/page.tsx`** - Painel principal atualizado com estatísticas baseadas na tabela `embalagem_notas_bipadas`
6. **`CRIAR_TABELA_EMBALAGEM.md`** - Documentação atualizada com todas as funcionalidades

## Próximos Passos

1. Execute o SQL no Supabase para criar a tabela
2. Configure as políticas RLS
3. Teste a funcionalidade no sistema
4. Verifique se as notas estão sendo salvas corretamente

## 🔧 Script de Correção (Se Necessário)

Se você já criou a tabela com o tipo UUID incorreto e está enfrentando o erro `invalid input syntax for type uuid`, use o script de correção:

**Arquivo**: `fix-carro-id-uuid.sql`

Este script corrige o tipo do campo `carro_id` de `UUID` para `VARCHAR(255)` para compatibilidade com os IDs dos carros do sistema.

## Troubleshooting

Se encontrar problemas:

1. **Tabela não encontrada**: Verifique se o SQL foi executado corretamente
2. **Erro de permissão**: Configure as políticas RLS
3. **Erro de validação**: Verifique se a tabela `notas_fiscais` contém as NFs
4. **Erro de tipo UUID**: Se encontrar erro `invalid input syntax for type uuid`, verifique se o campo `carro_id` foi criado como `VARCHAR(255)` e não como `UUID`
5. **Logs de erro**: Verifique o console do navegador para detalhes

## 🔄 Sincronização com Página Admin

### Fluxo de Sincronização

Quando um carro é processado no setor de embalagem, ele é automaticamente sincronizado com a página admin:

#### **1. Carro Marcado como "Embarar Carro"**
- **Status**: Muda para `"embalando"`
- **Página Admin**: Aparece na seção "Gerenciar Carros" com status "Embalando"
- **Localização**: Tabela `embalagem_notas_bipadas` + localStorage `profarma_carros_embalagem`
- **Sincronização**: Automática via localStorage compartilhado

#### **2. Carro Finalizado**
- **Status**: Muda para `"finalizado"`
- **Página Admin**: Aparece na seção "Gerenciar Carros" com status "Finalizado"
- **Botão**: "Finalizar Carro" disponível quando status é "embalando"
- **Data**: `dataFinalizacao` é registrada automaticamente

#### **3. Estrutura de Dados Compartilhada**
```typescript
interface CarroAdmin {
  id: string                    // ID único do carro
  nomeCarro: string            // Nome do carro
  colaboradores: string[]      // Lista de colaboradores
  data: string                 // Data da sessão
  turno: string                // Turno de trabalho
  destinoFinal: string         // Destinos das NFs
  quantidadeNFs: number        // Total de NFs bipadas
  totalVolumes: number         // Total de volumes
  statusCarro: "embalando" | "finalizado"  // Status sincronizado
  dataCriacao: string          // Data de criação
  dataInicioEmbalagem: string  // Data de início da embalagem
  dataFinalizacao?: string     // Data de finalização (quando aplicável)
}
```

### Funcionalidades Implementadas

1. **Sincronização Automática**: Carros são sincronizados automaticamente com a página admin
2. **Status em Tempo Real**: Mudanças de status são refletidas imediatamente
3. **Botão Finalizar**: Interface para marcar carro como finalizado
4. **Logs Detalhados**: Sistema de logs para monitorar sincronização
5. **Compatibilidade**: Estrutura de dados compatível com página admin existente

## 📊 Estatísticas em Tempo Real

### Dashboard do Painel Principal

As estatísticas "NFs Bipadas" e "Carros Prontos" agora são calculadas em tempo real baseadas na tabela `embalagem_notas_bipadas`:

#### **NFs Bipadas**
- **Contador**: Total de notas bipadas para a data e turno atuais
- **Volumes**: Total de volumes das notas bipadas
- **Fonte**: Tabela `embalagem_notas_bipadas` com `status = 'bipada'`

#### **Carros Prontos**
- **Contador**: Total de carros com status "embalando" ou "em_producao"
- **Carros Utilizados**: Total de carros únicos que tiveram notas bipadas
- **Fonte**: Tabela `embalagem_notas_bipadas` com filtros por status

#### **Funcionalidades Adicionais**
- **Atualização automática**: Estatísticas são carregadas automaticamente ao abrir o painel
- **Indicador de erro**: Mensagem de erro e botão "Tentar Novamente" em caso de falha
- **Loading states**: Indicadores visuais durante o carregamento

### Arquivos de Estatísticas

1. **`hooks/use-embalagem-stats.ts`** - Hook personalizado para buscar estatísticas
2. **`lib/embalagem-notas-bipadas-service.ts`** - Funções `buscarEstatisticas()` e `buscarCarrosProntos()`
3. **`app/painel/page.tsx`** - Interface atualizada com estatísticas em tempo real

## Teste

Após criar a tabela, teste as seguintes funcionalidades:

### 1. Validação e Detecção de Duplicatas
- Bipe uma nota válida e verifique se é aceita
- Tente bipar a mesma nota em outro carro e verifique se é bloqueada
- Verifique se a mensagem de erro mostra informações do carro anterior

### 2. Salvamento Condicional
- Bipe várias notas em um carro (elas ficam apenas no estado local)
- Marque o carro como "embalar carro" e verifique se as notas são salvas no banco
- Verifique os logs para confirmar o processo de salvamento
- **Sincronização Admin**: Verifique se o carro aparece na página admin com status "Embalando"

### 3. Verificação no Banco
- Consulte a tabela `embalagem_notas_bipadas` para ver as notas salvas
- Verifique se todas as informações estão corretas (carro_id, session_id, colaboradores, etc.)

### 4. Logs e Feedback
- Verifique o console do navegador para logs detalhados
- Confirme se as mensagens de sucesso e erro são exibidas corretamente

### 5. Estatísticas em Tempo Real
- **Dashboard**: Verifique se as estatísticas "NFs Bipadas" e "Carros Prontos" são exibidas corretamente
- **Loading**: Confirme se os indicadores de carregamento ("...") são exibidos durante as consultas
- **Erros**: Teste cenários de erro (ex: tabela não criada) para verificar se as mensagens de erro são exibidas
- **Volumes e Carros**: Verifique se as informações adicionais (volumes, carros utilizados) são exibidas corretamente

### 6. Sincronização com Página Admin
- **Status "Embalando"**: Após marcar carro como "embalar carro", verifique se aparece na página admin
- **Botão Finalizar**: Teste o botão "Finalizar Carro" quando o status for "embalando"
- **Status "Finalizado"**: Verifique se o carro muda para "finalizado" na página admin
- **Dados Compartilhados**: Confirme se todas as informações são sincronizadas corretamente
