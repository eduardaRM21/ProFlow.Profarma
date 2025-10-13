# Configurações de Timeout - Modal Relatórios de Recebimento

## Timeouts Implementados

### 1. **Carregamento Inicial dos Relatórios**
- **Timeout**: 60 segundos (aumentado de 30 segundos)
- **Escopo**: Carregamento completo dos dados básicos dos relatórios
- **Inclui**: 
  - Busca de relatórios na tabela `relatorios`
  - Busca de colaboradores para cada relatório
- **Fallback**: Se timeout, exibe erro específico

### 1.1. **Busca de Novos Relatórios (Database Service)**
- **Timeout**: 60 segundos
- **Escopo**: Busca de relatórios no serviço principal
- **Inclui**:
  - Função `getRelatorios()` principal
  - Busca de relatórios finalizados
  - Busca de relatórios antigos (últimos 7 dias)
- **Fallback**: Retorna array vazio se timeout

### 2. **Carregamento de Colaboradores**
- **Timeout**: 15 segundos por relatório (aumentado de 5 segundos)
- **Escopo**: Busca de colaboradores individuais
- **Inclui**:
  - Busca na tabela `relatorio_colaboradores`
  - Busca alternativa na tabela `users`
- **Fallback**: Se timeout, colaboradores ficam vazios

### 3. **Carregamento de Notas (Sob Demanda)**
- **Timeout**: 45 segundos (aumentado de 20 segundos)
- **Escopo**: Carregamento completo das notas de um relatório
- **Inclui**:
  - Busca de IDs das notas na tabela `relatorio_notas`
  - Busca de detalhes das notas na tabela `notas_fiscais`
  - Busca de divergências na tabela `divergencias`
- **Fallback**: Se timeout, exibe erro específico

### 4. **Timeouts de Interface**
- **Abertura do Modal**: 500ms (aumentado de 200ms)
- **Aplicação de Filtros**: 500ms (aumentado de 300ms)

## Benefícios dos Timeouts

### 1. **Prevenção de Travamentos**
- Evita que o modal fique carregando indefinidamente
- Força falha rápida em caso de problemas de rede

### 2. **Melhor Experiência do Usuário**
- Feedback claro quando operações demoram muito
- Mensagens de erro específicas para cada tipo de timeout

### 3. **Recuperação de Erros**
- Usuário pode tentar novamente após timeout
- Sistema não fica em estado inconsistente

### 4. **Performance Otimizada**
- Timeouts apropriados para cada tipo de operação
- Evita esperas desnecessárias

## Configurações Atualizadas (Versão 2.0)

### Tempos Aumentados para Melhor Tolerância
- **Carregamento Inicial**: 60 segundos (dobrou de 30s)
- **Busca de Relatórios**: 60 segundos (novo timeout específico)
- **Colaboradores**: 15 segundos (triplicou de 5s)
- **Notas**: 45 segundos (mais que dobrou de 20s)
- **Interface**: 500ms (aumentou de 200-300ms)

### Benefícios dos Novos Tempos
- **Melhor para Redes Lentas**: Mais tempo para operações complexas
- **Grandes Volumes de Dados**: Suporta relatórios com muitas notas
- **Estabilidade**: Reduz falhas por timeout em condições adversas
- **Experiência do Usuário**: Menos interrupções por timeout
- **Busca Robusta**: Timeout específico de 60s para todas as operações de busca de relatórios

### Implementação Técnica
- **Nova Função**: `retryWithBackoffAndTimeout()` com timeout configurável
- **Aplicação**: Todas as funções de busca de relatórios no `database-service.ts`
- **Cobertura**: 
  - `getRelatorios()` - busca principal
  - Busca de relatórios finalizados
  - Busca de relatórios antigos (7 dias)

## Configurações Recomendadas

### Para Ambientes com Rede Muito Lenta
- Manter configurações atuais (já otimizadas)
- Considerar aumentar para 90s no carregamento inicial se necessário

### Para Ambientes com Rede Rápida
- Manter configurações atuais (boa margem de segurança)
- Reduzir apenas se houver necessidade específica de resposta ultra-rápida

## Monitoramento

### Logs de Timeout
- Todos os timeouts são logados no console
- Mensagens específicas para cada tipo de timeout
- Facilita debugging de problemas de performance

### Indicadores Visuais
- Loading spinners durante carregamento
- Botões desabilitados durante operações
- Mensagens de erro claras para o usuário
