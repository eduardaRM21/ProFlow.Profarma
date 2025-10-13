# Implementação do Loader ProFlow

## Visão Geral

Foi implementado um componente de loader moderno e responsivo baseado no design fornecido. O loader inclui animações suaves, logo da empresa e indicadores de progresso.

## Componentes Criados

### 1. `components/ui/loader.tsx`

Componente principal do loader com as seguintes funcionalidades:

- **Loader Principal**: Tela de carregamento completa com logo animado
- **SmallLoader**: Loader compacto para botões e elementos menores
- **Hook useLoader**: Hook para gerenciar estado de loading

#### Props do Loader Principal:
```typescript
interface LoaderProps {
  text?: string;           // Texto exibido (padrão: "Carregando")
  showProgress?: boolean;  // Mostrar barra de progresso (padrão: true)
  className?: string;      // Classes CSS adicionais
  duration?: number;       // Duração em milissegundos (padrão: 2500ms = 2.5s)
  onComplete?: () => void; // Callback quando o loader terminar
}
```

### 2. `styles/loading-animations.css`

Arquivo CSS com todas as animações personalizadas:
- `pulse-custom`: Animação de pulsação do logo
- `fade-in-out`: Animação de fade do texto
- `blink`: Animação dos pontos de carregamento
- `loading`: Animação da barra de progresso
- `float`: Animação dos círculos de fundo

## Implementações Realizadas

### 1. Tela de Login (`app/page.tsx`)

```typescript
import { Loader } from "@/components/ui/loader";

// Estado para controlar o loader de processamento
const [isLoading, setIsLoading] = useState(false);

// No componente:
{isLoading && <Loader text="Processando..." duration={0} />}
```

**Funcionalidade**: 
- **Processamento**: Loader sem duração automática durante validação e salvamento
- **Redirecionamento**: Imediato após processamento completo

### 2. Página de Recebimento (`app/recebimento/page.tsx`)

```typescript
import { Loader } from "@/components/ui/loader";

// Estados para controlar diferentes tipos de loader
const [finalizando, setFinalizando] = useState(false);
const [showSuccessLoader, setShowSuccessLoader] = useState(false);

// No componente:
{finalizando && <Loader text="Processando relatório..." duration={0} />}
{showSuccessLoader && <Loader text="Relatório finalizado com sucesso!" duration={3000} />}

// Tela de carregamento de sessão
if (!sessionData) {
  return <Loader text="Carregando sessão..." duration={0} />
}
```

**Funcionalidade**:
- **Carregamento de Sessão**: Loader sem duração automática durante carregamento da sessão
- **Processamento**: Loader sem duração automática durante salvamento do relatório
- **Sucesso**: Loader de 3 segundos após processamento completo, antes de limpar dados

### 3. Páginas com Carregamento de Sessão

#### CRDK (`app/crdk/page.tsx`)
```typescript
if (!sessionData) {
  return <Loader text="Carregando sessão CRDK..." duration={0} />;
}
```

#### Painel (`app/painel/page.tsx`)
```typescript
if (!sessionData) {
  return <Loader text="Carregando painel..." duration={0} />;
}
```

#### Inventário (`app/inventario/page.tsx`)
```typescript
if (!session) {
  return <Loader text="Carregando inventário..." duration={0} />;
}
```

## Como Usar em Outras Páginas

### Exemplo com Processamento Simples

```typescript
import { Loader } from "@/components/ui/loader";

export default function MinhaPage() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async () => {
    setIsProcessing(true);
    
    try {
      // Sua operação assíncrona aqui
      await minhaOperacao();
      
      // Desativar loader de processamento
      setIsProcessing(false);
      
      // Executar ações imediatamente após processamento
      // Redirecionar ou executar outras ações
      
    } catch (error) {
      setIsProcessing(false);
      alert("Erro na operação");
    }
  };

  return (
    <>
      {isProcessing && <Loader text="Processando..." duration={0} />}
      <div className="min-h-screen">
        {/* Seu conteúdo aqui */}
      </div>
    </>
  );
}
```

### Exemplo com Callback

```typescript
import { Loader } from "@/components/ui/loader";

export default function MinhaPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async () => {
    setIsLoading(true);
    // Sua operação assíncrona aqui
    await minhaOperacao();
  };

  const handleLoaderComplete = () => {
    setIsLoading(false);
    // Executar ações após o loader terminar
    console.log("Loader finalizado!");
  };

  return (
    <>
      {isLoading && (
        <Loader 
          text="Processando..." 
          duration={3000} 
          onComplete={handleLoaderComplete}
        />
      )}
      <div className="min-h-screen">
        {/* Seu conteúdo aqui */}
      </div>
    </>
  );
}
```

### Usando o Hook useLoader com Duração

```typescript
import { useLoader } from "@/components/ui/loader";

export default function MinhaPage() {
  // Hook configurado para 3 segundos
  const { isLoading, startLoading, stopLoading } = useLoader(3000);

  const handleAction = async () => {
    startLoading(); // Inicia e para automaticamente após 3 segundos
    try {
      await minhaOperacao();
    } finally {
      // Opcional: parar manualmente se necessário
      // stopLoading();
    }
  };

  return (
    <>
      {isLoading && <Loader text="Carregando dados..." />}
      {/* Seu conteúdo aqui */}
    </>
  );
}
```

### Componentes Pré-configurados

```typescript
import { Loader2Segundos, Loader3Segundos, LoaderCustomizado } from "@/components/ui/loader";

export default function MinhaPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      {/* Loader de 2 segundos */}
      {isLoading && <Loader2Segundos text="Carregando rápido..." />}
      
      {/* Loader de 3 segundos */}
      {isLoading && <Loader3Segundos text="Carregando..." />}
      
      {/* Loader customizado */}
      {isLoading && <LoaderCustomizado text="Processando..." duration={4000} />}
      
      {/* Seu conteúdo aqui */}
    </>
  );
}
```

### Loader Pequeno para Botões

```typescript
import { SmallLoader } from "@/components/ui/loader";

export default function MeuBotao() {
  const [loading, setLoading] = useState(false);

  return (
    <button disabled={loading}>
      {loading ? <SmallLoader /> : "Salvar"}
    </button>
  );
}
```

## Características do Design

### Visual
- **Logo**: SVG animado com pulsação suave
- **Cores**: Verde ProFlow (#48C142) como cor principal
- **Spinner**: Anel rotativo ao redor do logo
- **Texto**: Animação de fade in/out
- **Pontos**: Animação sequencial de piscar
- **Barra de Progresso**: Animação de preenchimento
- **Fundo**: Círculos flutuantes animados

### Responsividade
- **Desktop**: Logo 200x200px, texto 24px
- **Mobile**: Logo 150x150px, texto 20px
- **Barra de Progresso**: 300px (desktop) / 250px (mobile)

### Acessibilidade
- **Semântica**: Uso correto de roles e labels
- **Contraste**: Cores com bom contraste
- **Animações**: Respeitam preferências de movimento reduzido

## Integração com Tailwind CSS

O loader utiliza classes Tailwind CSS para:
- Posicionamento (`fixed`, `inset-0`, `flex`, `items-center`, `justify-center`)
- Cores (`bg-white`, `text-gray-800`, `border-green-200`)
- Animações (`animate-spin`, `animate-pulse`)
- Responsividade (`sm:`, `lg:`)

## Performance

- **CSS Otimizado**: Animações usando `transform` e `opacity` para melhor performance
- **Lazy Loading**: Componente carregado apenas quando necessário
- **Z-index**: Configurado para sobrepor outros elementos (z-50)

## Próximos Passos

Para implementar o loader em outras páginas:

1. Importe o componente: `import { Loader } from "@/components/ui/loader"`
2. Adicione o estado de loading: `const [isLoading, setIsLoading] = useState(false)`
3. Renderize condicionalmente: `{isLoading && <Loader text="Seu texto" />}`
4. Controle o estado durante operações assíncronas

## Exemplos de Uso por Área

### Admin
```typescript
{isLoading && <Loader text="Carregando relatórios" duration={2500} />}
```

### Custos
```typescript
{isLoading && <Loader text="Calculando custos" duration={3000} />}
```

### Embalagem
```typescript
{isLoading && <Loader text="Processando embalagem" duration={2000} />}
```

### CRDK
```typescript
{isLoading && <Loader text="Atualizando dados" duration={2500} />}
```

## Durações Recomendadas

- **Operações Rápidas**: 2 segundos (2000ms)
- **Operações Médias**: 2.5 segundos (2500ms) - **Padrão**
- **Operações Longas**: 3 segundos (3000ms)
- **Operações Muito Longas**: 4-5 segundos (4000-5000ms)

## Funcionalidades de Duração

### ✅ Implementado
- **Duração Automática**: O loader se fecha automaticamente após o tempo especificado
- **Callback onComplete**: Executa função quando o loader termina
- **Hook useLoader**: Suporte a duração automática
- **Componentes Pré-configurados**: Loader2Segundos, Loader3Segundos, LoaderCustomizado
- **Flexibilidade**: Pode ser controlado manualmente ou automaticamente
- **Processamento Antes do Loader**: Tratamento do usuário acontece antes da tela de loader

### 🎯 Benefícios
- **UX Consistente**: Tempo de carregamento previsível
- **Menos Código**: Não precisa gerenciar estado manualmente
- **Flexibilidade**: Suporte a diferentes durações por contexto
- **Performance**: Auto-cleanup evita vazamentos de memória
- **Fluxo Melhorado**: Processamento completo antes da confirmação visual

## Padrão de Uso Recomendado

### 1. **Processamento** (duration={0})
- Durante validação, salvamento, operações assíncronas
- Controlado manualmente pelo estado
- Texto: "Processando...", "Salvando...", "Validando..."

### 2. **Sucesso** (duration={2500-3000})
- Após processamento completo
- Duração automática de 2-3 segundos
- Texto: "Sucesso!", "Concluído!", "Realizado com sucesso!"

### 3. **Fluxo Simples**
```typescript
// 1. Iniciar processamento
setIsProcessing(true);

// 2. Executar operação
await minhaOperacao();

// 3. Desativar processamento
setIsProcessing(false);

// 4. Executar ações imediatamente
// Redirecionar ou limpar dados
```

O loader está pronto para uso em todo o sistema ProFlow, proporcionando uma experiência de usuário consistente e profissional com o tratamento do usuário acontecendo antes da tela de loader.
