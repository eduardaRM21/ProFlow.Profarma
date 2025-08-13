# 🗄️ Implementação do Banco de Dados Centralizado - ProFlow

## 📋 Visão Geral

Este documento descreve a implementação completa de um banco de dados centralizado para o sistema ProFlow, substituindo o armazenamento local (localStorage) por um banco PostgreSQL hospedado no Supabase.

## 🎯 Benefícios da Implementação

### ✅ **Antes (localStorage)**
- Dados isolados por dispositivo
- Perda de dados ao limpar cache
- Sem sincronização entre usuários
- Limitações de armazenamento
- Sem backup automático

### 🚀 **Depois (Banco Centralizado)**
- Dados compartilhados entre todos os usuários
- Persistência garantida
- Sincronização em tempo real
- Escalabilidade ilimitada
- Backups automáticos
- Auditoria completa

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   PostgreSQL    │
│   (Next.js)     │◄──►│   (API Layer)   │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  localStorage   │    │  Real-time      │    │  Triggers &     │
│  (Fallback)     │    │  Subscriptions  │    │  Functions      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Estrutura do Banco de Dados

### **Tabelas Principais**

| Tabela | Descrição | Relacionamentos |
|--------|-----------|-----------------|
| `users` | Usuários/colaboradores | Referenciada por `sessions` |
| `sessions` | Sessões de trabalho | Referenciada por outras tabelas |
| `notas_fiscais` | Notas fiscais processadas | Referenciada por `divergencias`, `carro_itens`, `inventario` |
| `divergencias` | Divergências encontradas | Referencia `notas_fiscais` |
| `carros_embalagem` | Carros de embalagem | Referenciada por `carro_itens` |
| `carro_itens` | Itens em cada carro | Referencia `carros_embalagem` e `notas_fiscais` |
| `inventario` | Controle de inventário | Referencia `notas_fiscais` e `sessions` |
| `relatorios` | Relatórios de produção | Referencia `users` |
| `activity_logs` | Log de atividades | Referencia `users` |
| `system_config` | Configurações do sistema | - |

### **Índices de Performance**

```sql
-- Sessões
CREATE INDEX idx_sessions_area_data ON sessions(area, data);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Notas Fiscais
CREATE INDEX idx_notas_fiscais_numero ON notas_fiscais(numero_nf);
CREATE INDEX idx_notas_fiscais_session ON notas_fiscais(session_id);
CREATE INDEX idx_notas_fiscais_status ON notas_fiscais(status);
CREATE INDEX idx_notas_fiscais_data ON notas_fiscais(data);

-- Carros de Embalagem
CREATE INDEX idx_carros_session ON carros_embalagem(session_id);
CREATE INDEX idx_carros_status ON carros_embalagem(status);
CREATE INDEX idx_carros_ativo ON carros_embalagem(ativo);

-- Inventário
CREATE INDEX idx_inventario_rua ON inventario(rua);
CREATE INDEX idx_inventario_session ON inventario(session_id);

-- Relatórios
CREATE INDEX idx_relatorios_area_data ON relatorios(area, data);
CREATE INDEX idx_relatorios_status ON relatorios(status);
```

## 🚀 Passos de Implementação

### **1. Configuração do Supabase**

#### **1.1 Criar Projeto**
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a URL e chave anônima

#### **1.2 Configurar Variáveis de Ambiente**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_de_servico
```

### **2. Executar Schema do Banco**

#### **2.1 Via Script Automático**
```bash
# Instalar dependências
npm install

# Executar script de configuração
node scripts/setup-database.js
```

#### **2.2 Via SQL Manual**
1. Acesse o SQL Editor no Supabase
2. Execute o conteúdo de `database-schema-complete.sql`
3. Verifique se todas as tabelas foram criadas

### **3. Migração de Dados**

#### **3.1 Migração Automática**
```javascript
// No componente React
import { useCentralizedDatabase } from '@/lib/centralized-database-service'

const { migrateFromLocalStorage } = useCentralizedDatabase()

// Executar migração
const result = await migrateFromLocalStorage()
console.log(result.message)
```

#### **3.2 Migração Manual**
```bash
# Executar script de migração
node scripts/migrate-data.js
```

### **4. Integração no Frontend**

#### **4.1 Substituir Serviços Locais**
```javascript
// Antes (localStorage)
const notas = JSON.parse(localStorage.getItem('recebimento_2024_01_15') || '[]')

// Depois (Banco Centralizado)
const { getNotasBySession } = useCentralizedDatabase()
const notas = await getNotasBySession(sessionId)
```

#### **4.2 Configurar Sincronização em Tempo Real**
```javascript
const { setupRealtimeSubscriptions } = useCentralizedDatabase()

useEffect(() => {
  setupRealtimeSubscriptions({
    onNotaFiscalChange: (payload) => {
      console.log('Nova nota fiscal:', payload)
      // Atualizar interface
    },
    onCarroChange: (payload) => {
      console.log('Carro atualizado:', payload)
      // Atualizar interface
    }
  })
}, [])
```

## 🔧 Serviços Disponíveis

### **CentralizedDatabaseService**

#### **Gerenciamento de Usuários**
- `createUser(userData)` - Criar novo usuário
- `getUserById(id)` - Buscar usuário por ID
- `getUsersByArea(area)` - Listar usuários por área

#### **Gerenciamento de Sessões**
- `createSession(sessionData)` - Criar nova sessão
- `getActiveSession(area, data, turno)` - Buscar sessão ativa
- `closeSession(sessionId)` - Fechar sessão

#### **Gerenciamento de Notas Fiscais**
- `createNotaFiscal(notaData)` - Criar nova nota
- `getNotasBySession(sessionId)` - Listar notas por sessão
- `getNotaByNumero(numeroNF)` - Buscar nota por número

#### **Gerenciamento de Carros**
- `createCarro(carroData)` - Criar novo carro
- `addItemToCarro(itemData)` - Adicionar item ao carro
- `getCarrosBySession(sessionId)` - Listar carros por sessão

#### **Gerenciamento de Inventário**
- `createInventarioItem(itemData)` - Criar item de inventário
- `getInventarioByRua(rua)` - Listar itens por rua
- `getInventarioBySession(sessionId)` - Listar itens por sessão

#### **Gerenciamento de Relatórios**
- `createRelatorio(relatorioData)` - Criar novo relatório
- `getRelatoriosByArea(area, data?, turno?)` - Listar relatórios
- `updateRelatorioStatus(id, status, additionalData?)` - Atualizar status

#### **Funcionalidades Avançadas**
- `getSectorStats(area, data, turno)` - Estatísticas do setor
- `logActivity(logData)` - Registrar atividade
- `migrateFromLocalStorage()` - Migrar dados locais
- `setupRealtimeSubscriptions(callbacks)` - Configurar tempo real

## 📱 Exemplos de Uso

### **Exemplo 1: Criar Nova Nota Fiscal**
```javascript
const { createNotaFiscal, logActivity } = useCentralizedDatabase()

const handleCreateNota = async (notaData) => {
  try {
    // Criar nota no banco
    const novaNota = await createNotaFiscal({
      codigo_completo: notaData.codigo,
      numero_nf: notaData.numero,
      data: notaData.data,
      volumes: notaData.volumes,
      session_id: sessionId
    })

    // Registrar atividade
    await logActivity({
      action: 'nota_fiscal_criada',
      table_name: 'notas_fiscais',
      record_id: novaNota.id,
      details: { numero: notaData.numero, volumes: notaData.volumes }
    })

    console.log('Nota fiscal criada:', novaNota)
  } catch (error) {
    console.error('Erro ao criar nota:', error)
  }
}
```

### **Exemplo 2: Dashboard com Dados em Tempo Real**
```javascript
const { getSectorStats, setupRealtimeSubscriptions } = useCentralizedDatabase()
const [stats, setStats] = useState(null)

useEffect(() => {
  // Carregar estatísticas iniciais
  const loadStats = async () => {
    const sectorStats = await getSectorStats('recebimento', '2024-01-15', 'manhã')
    setStats(sectorStats)
  }
  
  loadStats()

  // Configurar atualizações em tempo real
  setupRealtimeSubscriptions({
    onNotaFiscalChange: async () => {
      // Recarregar estatísticas quando houver mudança
      const updatedStats = await getSectorStats('recebimento', '2024-01-15', 'manhã')
      setStats(updatedStats)
    }
  })
}, [])
```

### **Exemplo 3: Migração de Dados Existentes**
```javascript
const { migrateFromLocalStorage } = useCentralizedDatabase()

const handleMigration = async () => {
  try {
    setMigrationStatus('migrando')
    
    const result = await migrateFromLocalStorage()
    
    if (result.success) {
      setMigrationStatus('concluida')
      toast.success(result.message)
      
      // Limpar localStorage após migração bem-sucedida
      if (confirm('Migração concluída! Deseja limpar o localStorage?')) {
        localStorage.clear()
        toast.info('localStorage limpo com sucesso')
      }
    } else {
      setMigrationStatus('erro')
      toast.error(result.message)
    }
  } catch (error) {
    setMigrationStatus('erro')
    toast.error('Erro durante migração: ' + error.message)
  }
}
```

## 🔒 Segurança e Políticas

### **Row Level Security (RLS)**
Todas as tabelas têm RLS habilitado com políticas básicas:

```sql
-- Política para usuários autenticados
CREATE POLICY "Usuários autenticados podem ver dados" ON users
    FOR ALL USING (auth.role() = 'authenticated');
```

### **Políticas Recomendadas para Produção**
```sql
-- Exemplo: Usuários só podem ver dados de sua área
CREATE POLICY "Usuários veem apenas dados de sua área" ON notas_fiscais
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM sessions 
            WHERE area = auth.jwt() ->> 'area'
        )
    );
```

## 📊 Monitoramento e Logs

### **Logs de Atividade**
Todas as operações são registradas na tabela `activity_logs`:

```javascript
await logActivity({
  action: 'nota_fiscal_criada',
  table_name: 'notas_fiscais',
  record_id: novaNota.id,
  details: { 
    numero: notaData.numero, 
    volumes: notaData.volumes,
    user: currentUser.nome 
  }
})
```

### **Métricas de Performance**
- Tempo de resposta das consultas
- Número de conexões simultâneas
- Uso de recursos do banco
- Taxa de erros

## 🚨 Tratamento de Erros

### **Estratégia de Fallback**
```javascript
const { getNotasBySession } = useCentralizedDatabase()

const loadNotas = async () => {
  try {
    // Tentar carregar do banco centralizado
    const notas = await getNotasBySession(sessionId)
    setNotas(notas)
  } catch (error) {
    console.warn('Erro no banco centralizado, usando localStorage:', error)
    
    // Fallback para localStorage
    const notasLocais = JSON.parse(localStorage.getItem('recebimento_2024_01_15') || '[]')
    setNotas(notasLocais)
    
    // Notificar usuário
    toast.warning('Sistema funcionando em modo local devido a problemas de conexão')
  }
}
```

### **Reconexão Automática**
```javascript
const { getConnectionStatus, initialize } = useCentralizedDatabase()

useEffect(() => {
  const checkConnection = async () => {
    if (!getConnectionStatus()) {
      console.log('Tentando reconectar...')
      await initialize()
    }
  }

  const interval = setInterval(checkConnection, 30000) // A cada 30 segundos
  return () => clearInterval(interval)
}, [])
```

## 📈 Performance e Otimização

### **Estratégias de Cache**
```javascript
// Cache de consultas frequentes
const queryCache = new Map()

const getCachedData = async (key, queryFn) => {
  if (queryCache.has(key)) {
    const cached = queryCache.get(key)
    if (Date.now() - cached.timestamp < 30000) { // 30 segundos
      return cached.data
    }
  }
  
  const data = await queryFn()
  queryCache.set(key, { data, timestamp: Date.now() })
  return data
}
```

### **Paginação de Resultados**
```javascript
const { getNotasBySession } = useCentralizedDatabase()

const loadNotasPaginated = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit
  
  const { data, error, count } = await supabase
    .from('notas_fiscais')
    .select('*', { count: 'exact' })
    .eq('session_id', sessionId)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })
  
  return { data, total: count, page, limit }
}
```

## 🧪 Testes e Validação

### **Testes de Conexão**
```javascript
const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('key')
      .limit(1)
    
    if (error) throw error
    
    console.log('✅ Conexão com banco estabelecida')
    return true
  } catch (error) {
    console.error('❌ Erro de conexão:', error)
    return false
  }
}
```

### **Validação de Dados**
```javascript
const validateNotaFiscal = (nota) => {
  const errors = []
  
  if (!nota.numero_nf) errors.push('Número da NF é obrigatório')
  if (!nota.volumes || nota.volumes <= 0) errors.push('Volumes devem ser maiores que zero')
  if (!nota.data) errors.push('Data é obrigatória')
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

## 🔄 Migração Gradual

### **Fase 1: Implementação Paralela**
- Manter localStorage funcionando
- Implementar banco centralizado em paralelo
- Testar funcionalidades

### **Fase 2: Migração de Dados**
- Executar script de migração
- Validar integridade dos dados
- Testar funcionalidades

### **Fase 3: Transição Completa**
- Desabilitar localStorage
- Usar apenas banco centralizado
- Monitorar performance

### **Fase 4: Otimização**
- Ajustar índices
- Implementar cache
- Configurar backups

## 📚 Recursos Adicionais

### **Documentação do Supabase**
- [Documentação Oficial](https://supabase.com/docs)
- [Guia de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [API Reference](https://supabase.com/docs/reference/javascript/introduction)

### **Ferramentas de Desenvolvimento**
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Database Schema Visualizer](https://supabase.com/docs/guides/database/extensions/pg_graphql)
- [Real-time Dashboard](https://supabase.com/docs/guides/realtime)

### **Monitoramento e Analytics**
- [Supabase Analytics](https://supabase.com/docs/guides/analytics)
- [Database Monitoring](https://supabase.com/docs/guides/database/monitoring)
- [Performance Insights](https://supabase.com/docs/guides/database/performance)

## 🎯 Próximos Passos

1. **Configurar Supabase** - Criar projeto e configurar variáveis
2. **Executar Schema** - Rodar script de configuração do banco
3. **Migrar Dados** - Transferir dados existentes do localStorage
4. **Integrar Frontend** - Substituir serviços locais pelos centralizados
5. **Configurar Tempo Real** - Implementar sincronização automática
6. **Testar Funcionalidades** - Validar todas as operações
7. **Configurar Segurança** - Ajustar políticas RLS para produção
8. **Monitorar Performance** - Configurar alertas e métricas

## 📞 Suporte

Para dúvidas ou problemas durante a implementação:

1. **Verificar logs** - Console do navegador e logs do Supabase
2. **Consultar documentação** - Este guia e documentação oficial
3. **Testar conexão** - Usar scripts de teste incluídos
4. **Validar dados** - Verificar integridade das tabelas

---

**🎉 Implementação concluída! O ProFlow agora tem um banco de dados centralizado robusto e escalável!**
