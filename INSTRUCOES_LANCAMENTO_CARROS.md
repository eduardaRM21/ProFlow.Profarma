# INSTRUÇÕES PARA LANÇAMENTO DE CARROS

## Nova Funcionalidade Implementada

Quando um carro for marcado como "lançar" no modal de gerenciar carros, o sistema agora:

1. **Muda o status para "Lançado"** na tabela `carros_status`
2. **Busca o número do carro** na tabela `embalagem_carros_finalizados`
3. **Atualiza o status das notas** para "lancado" na tabela `embalagem_notas_bipadas`
4. **Salva os números SAP** fornecidos pelo administrador

## Como Funciona

### 1. Busca na Tabela de Carros Finalizados
O sistema busca automaticamente na tabela `embalagem_carros_finalizados` pelo carro específico usando o `carro_id`. A tabela tem a seguinte estrutura:

```sql
CREATE TABLE embalagem_carros_finalizados (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carros JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

O campo `carros` é um JSONB que contém um array de carros finalizados, cada um com:
- `id`: ID do carro
- `numero`: Número do carro (se disponível)
- Outros campos relacionados ao carro

### 2. Atualização de Status
Quando o carro é lançado:
- **Tabela `carros_status`**: Status muda para `'lancado'`
- **Tabela `embalagem_notas_bipadas`**: Status das notas muda para `'lancado'`
- **Números SAP**: São salvos em ambas as tabelas

### 3. Interface do Usuário
No modal de gerenciar carros:
- O administrador insere os números SAP
- Clica em "Confirmar"
- O sistema automaticamente:
  - Busca o número do carro na tabela de finalizados
  - Atualiza o status para "Lançado"
  - Exibe mensagem de sucesso com o número do carro encontrado

## Pré-requisitos

### 1. Constraint da Tabela
A tabela `carros_status` deve permitir o status `'lancado'`. Execute o SQL de correção:

```sql
-- CORREÇÃO DA CONSTRAINT DA TABELA carros_status
ALTER TABLE carros_status 
DROP CONSTRAINT IF EXISTS carros_status_status_carro_check;

ALTER TABLE carros_status 
ADD CONSTRAINT carros_status_status_carro_check 
CHECK (status_carro IN (
  'embalando', 
  'divergencia', 
  'aguardando_lancamento', 
  'finalizado',
  'lancado'
));
```

### 2. Tabela de Carros Finalizados
A tabela `embalagem_carros_finalizados` deve existir e conter dados dos carros finalizados.

## Fluxo de Dados

```
1. Admin marca carro para "lançar"
   ↓
2. Sistema busca número na tabela embalagem_carros_finalizados
   ↓
3. Sistema atualiza status para "lancado" em carros_status
   ↓
4. Sistema atualiza status das notas para "lancado"
   ↓
5. Sistema salva números SAP
   ↓
6. Confirmação com número do carro encontrado
```

## Benefícios

- **Automatização**: O sistema busca automaticamente o número do carro
- **Consistência**: Status é atualizado em todas as tabelas relacionadas
- **Rastreabilidade**: Números SAP são salvos para auditoria
- **Interface intuitiva**: Processo simples para o administrador

## Tratamento de Erros

- Se o carro não for encontrado na tabela de finalizados, usa o `carro_id` como fallback
- Se houver erro ao atualizar notas, o carro ainda é marcado como lançado
- Logs detalhados são exibidos no console para debugging

## Verificação

Após implementar:
1. Execute o SQL de correção da constraint
2. Teste o lançamento de um carro
3. Verifique se o status foi atualizado para "lancado"
4. Confirme se os números SAP foram salvos
5. Verifique se o número do carro foi encontrado na tabela de finalizados
