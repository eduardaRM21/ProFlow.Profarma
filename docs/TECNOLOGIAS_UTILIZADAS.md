# 📋 Documentação de Tecnologias - Sistema ProFlow

## 🎯 Visão Geral

O **ProFlow** é um sistema completo de gestão de fluxo entre setores da Profarma, desenvolvido com tecnologias modernas para garantir alta performance, escalabilidade e uma excelente experiência do usuário.

---

## 🏗️ Arquitetura Geral

### **Padrão de Arquitetura**
- **Frontend**: Next.js 14 com App Router
- **Backend**: Supabase (Backend-as-a-Service)
- **Banco de Dados**: PostgreSQL (via Supabase)
- **Deploy**: Vercel
- **Autenticação**: Sistema híbrido (local + Supabase Auth)

---

## 🎨 Frontend

### **Framework Principal**
- **Next.js 14.2.31** - Framework React com App Router
  - Server-Side Rendering (SSR)
  - Static Site Generation (SSG)
  - API Routes integradas
  - Otimizações automáticas de performance

### **Linguagem e Tipagem**
- **TypeScript 5** - Tipagem estática para JavaScript
- **React 18** - Biblioteca para interfaces de usuário
- **React DOM 18** - Renderização do React no DOM

### **Estilização**
- **Tailwind CSS 3.4.17** - Framework CSS utilitário
- **CSS Variables** - Para temas dinâmicos
- **PostCSS 8.5** - Processador CSS
- **Autoprefixer 10.4.20** - Prefixos CSS automáticos

### **Componentes UI**
- **Radix UI** - Biblioteca de componentes acessíveis
  - `@radix-ui/react-accordion` - Acordeões
  - `@radix-ui/react-alert-dialog` - Diálogos de alerta
  - `@radix-ui/react-avatar` - Avatares
  - `@radix-ui/react-checkbox` - Checkboxes
  - `@radix-ui/react-dialog` - Modais
  - `@radix-ui/react-dropdown-menu` - Menus dropdown
  - `@radix-ui/react-label` - Labels
  - `@radix-ui/react-popover` - Popovers
  - `@radix-ui/react-select` - Seletores
  - `@radix-ui/react-tabs` - Abas
  - `@radix-ui/react-toast` - Notificações
  - `@radix-ui/react-tooltip` - Tooltips
- **shadcn/ui** - Sistema de design baseado em Radix UI
- **Lucide React 0.454.0** - Ícones SVG

### **Gerenciamento de Estado**
- **React Hooks** - useState, useEffect, useCallback
- **SWR 2.3.6** - Data fetching e cache
- **Context API** - Para estado global (tema)

### **Formulários**
- **React Hook Form 7.54.1** - Gerenciamento de formulários
- **@hookform/resolvers 3.9.1** - Validadores para React Hook Form
- **Zod 3.24.1** - Validação de esquemas

### **Animações e Interações**
- **Framer Motion 12.23.12** - Animações avançadas
- **Tailwind CSS Animate 1.0.7** - Animações CSS
- **Embla Carousel React 8.5.1** - Carrosséis

### **Utilitários**
- **Class Variance Authority 0.7.1** - Variantes de classes CSS
- **clsx 2.1.1** - Utilitário para classes condicionais
- **tailwind-merge 2.5.5** - Merge de classes Tailwind
- **date-fns** - Manipulação de datas
- **cmdk 1.0.4** - Interface de comando

### **Gráficos e Visualizações**
- **Recharts 2.15.0** - Biblioteca de gráficos React

### **Notificações**
- **Sonner 1.7.1** - Sistema de toast/notificações

---

## 🔧 Backend e Banco de Dados

### **Backend-as-a-Service**
- **Supabase 2.53.0** - Plataforma completa de backend
  - PostgreSQL como banco de dados
  - API REST automática
  - Real-time subscriptions
  - Autenticação integrada
  - Edge Functions (Deno)

### **Banco de Dados**
- **PostgreSQL** - Banco relacional robusto
  - Extensões: `uuid-ossp` para UUIDs
  - Índices otimizados para performance
  - Triggers para atualização automática de timestamps
  - Row Level Security (RLS) para segurança

### **Estrutura do Banco**
```sql
-- Tabelas principais
- users (usuários/colaboradores)
- sessions (sessões de trabalho)
- notas_fiscais (notas fiscais processadas)
- divergencias (divergências encontradas)
- carros_embalagem (carros de embalagem)
- carro_itens (itens em cada carro)
- inventario (controle de inventário)
- relatorios (relatórios de produção)
- activity_logs (log de atividades)
- system_config (configurações do sistema)
```

### **Edge Functions**
- **Deno** - Runtime JavaScript/TypeScript
- **Divergências Batch** - Processamento em lote de divergências
- **Optimized Queries** - Consultas otimizadas

---

## 🔐 Autenticação e Segurança

### **Sistema de Autenticação Híbrido**
- **Áreas Operacionais** (Recebimento, Embalagem, Inventário)
  - Autenticação por nome de usuário
  - Validação no banco de dados
  - Sem senhas (acesso direto)

- **Áreas Administrativas** (Custos, CRDK, Admin Embalagem)
  - Autenticação com usuário e senha
  - Hash de senhas com algoritmo customizado
  - Validação de área de acesso

### **Segurança**
- **Row Level Security (RLS)** - Segurança a nível de linha
- **Circuit Breaker** - Proteção contra falhas em cascata
- **Retry com Backoff Exponencial** - Resiliência de rede
- **Validação de Dados** - Zod para validação de esquemas

---

## 📱 Progressive Web App (PWA)

### **Manifest**
- **Web App Manifest** - Configuração PWA
- **Ícones SVG** - Ícones responsivos
- **Tema de Cores** - Verde (#16a34a)
- **Orientação** - Portrait (vertical)

### **Funcionalidades PWA**
- **Instalação** - Pode ser instalado como app
- **Offline** - Funciona sem conexão (localStorage)
- **Responsivo** - Adaptável a diferentes telas

---

## 🔄 Gerenciamento de Estado e Cache

### **Cache Estratégico**
- **localStorage** - Cache local para dados críticos
- **Session Cache** - Cache em memória para sessões
- **SWR Cache** - Cache inteligente para requisições
- **Circuit Breaker Cache** - Cache de conectividade

### **Estratégias de Sincronização**
- **Offline-First** - Funciona sem internet
- **Sync Automático** - Sincronização quando conectado
- **Fallback Local** - Dados locais como backup

---

## 🚀 Deploy e Infraestrutura

### **Plataforma de Deploy**
- **Vercel** - Deploy automático
- **Next.js Build** - Build otimizado
- **Edge Functions** - Funções serverless

### **Configurações de Deploy**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "framework": "nextjs",
  "functions": {
    "maxDuration": 60
  }
}
```

---

## 📊 Monitoramento e Logs

### **Sistema de Logs**
- **Console Logs** - Logs estruturados
- **Activity Logs** - Log de atividades no banco
- **Error Tracking** - Rastreamento de erros
- **Performance Monitoring** - Monitoramento de performance

### **Métricas**
- **Connection Health** - Saúde da conexão
- **Circuit Breaker State** - Estado do circuit breaker
- **Cache Hit Rate** - Taxa de acerto do cache

---

## 🛠️ Ferramentas de Desenvolvimento

### **Build Tools**
- **Next.js** - Build system integrado
- **TypeScript** - Compilação e verificação de tipos
- **PostCSS** - Processamento CSS
- **ESLint** - Linting (desabilitado em build)

### **Scripts de Desenvolvimento**
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "setup-env": "node scripts/setup-env.js",
  "setup-database": "node scripts/setup-database.js",
  "migrate-data": "node scripts/migrate-data.js"
}
```

---

## 📱 Funcionalidades Específicas

### **Scanner de Código de Barras**
- **@zxing/library** - Biblioteca de leitura de códigos
- **Camera API** - Acesso à câmera do dispositivo
- **Timeout Configurável** - 30 segundos por padrão

### **Sistema de Notificações**
- **Audio Notifications** - Sons para diferentes eventos
- **Visual Notifications** - Toast/Sonner
- **Real-time Updates** - Atualizações em tempo real

### **Temas**
- **Dark/Light Mode** - Suporte a temas
- **CSS Variables** - Variáveis dinâmicas
- **next-themes** - Gerenciamento de temas

---

## 🔧 Configurações Específicas

### **Variáveis de Ambiente**
```env
NEXT_PUBLIC_SUPABASE_URL=https://ehqxboqxtubeumaupjeq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_NAME=ProFlow Bipagem
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_SCANNER_TIMEOUT=30000
NEXT_PUBLIC_ENABLE_BARCODE_SCANNER=true
```

### **Configurações Next.js**
```javascript
{
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true }
}
```

---

## 📈 Performance e Otimizações

### **Otimizações de Performance**
- **Lazy Loading** - Carregamento sob demanda
- **Code Splitting** - Divisão de código
- **Image Optimization** - Otimização de imagens
- **Bundle Optimization** - Otimização do bundle

### **Estratégias de Cache**
- **Browser Cache** - Cache do navegador
- **Service Worker** - Cache offline
- **Memory Cache** - Cache em memória
- **Database Cache** - Cache de consultas

---

## 🔄 Fluxo de Dados

### **Fluxo Principal**
1. **Login** → Validação de usuário
2. **Sessão** → Criação de sessão de trabalho
3. **Operações** → Recebimento/Embalagem/Inventário
4. **Sincronização** → Dados locais + banco
5. **Relatórios** → Geração e finalização

### **Estratégia de Sincronização**
- **Online**: Dados salvos no banco + localStorage
- **Offline**: Dados salvos apenas no localStorage
- **Reconexão**: Sincronização automática

---

## 🎯 Conclusão

O sistema ProFlow utiliza uma stack tecnológica moderna e robusta, combinando:

- **Frontend**: Next.js + React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Deploy**: Vercel
- **PWA**: Manifest + Service Workers
- **Segurança**: RLS + Circuit Breaker + Validação

Esta arquitetura garante:
- ✅ **Alta Performance**
- ✅ **Escalabilidade**
- ✅ **Confiabilidade**
- ✅ **Experiência do Usuário**
- ✅ **Manutenibilidade**
- ✅ **Segurança**

O sistema está preparado para crescer e se adaptar às necessidades futuras da Profarma, mantendo sempre a qualidade e performance esperadas.
