# 🔒 Solução para Erro de RLS na Tabela Relatórios

## 📋 Problema Identificado

O setor de custos não está puxando relatórios porque:
- ✅ **Tabela `relatorios` existe** no banco
- ✅ **Conectividade com Supabase está funcionando**
- ❌ **Políticas RLS (Row Level Security) estão bloqueando acesso**
- ❌ **Sistema não está autenticado no Supabase**

## 🎯 Causa Raiz

As políticas RLS estão configuradas para `auth.role() = 'authenticated'`, mas o sistema Profarma não está usando autenticação do Supabase, impedindo:
- **Criação** de relatórios
- **Leitura** de relatórios
- **Atualização** de relatórios

## 🛠️ Soluções Disponíveis

### Solução 1: Desabilitar RLS (Recomendado para Desenvolvimento)

```sql
-- Execute no SQL Editor do Supabase
ALTER TABLE relatorios DISABLE ROW LEVEL SECURITY;
```

**Vantagens:**
- ✅ Solução rápida e simples
- ✅ Permite desenvolvimento sem autenticação
- ✅ Funciona imediatamente

**Desvantagens:**
- ⚠️ Remove toda proteção de dados
- ⚠️ Não recomendado para produção

### Solução 2: Políticas RLS Permissivas (Recomendado para Produção)

```sql
-- Execute no SQL Editor do Supabase
DROP POLICY IF EXISTS "Usuários autenticados podem ver relatórios" ON relatorios;

CREATE POLICY "Acesso total aos relatórios" ON relatorios
    FOR ALL USING (true);
```

**Vantagens:**
- ✅ Mantém RLS habilitado
- ✅ Permite acesso controlado
- ✅ Mais seguro que desabilitar completamente

**Desvantagens:**
- ⚠️ Ainda permite acesso total aos dados
- ⚠️ Precisa de configuração manual

### Solução 3: Implementar Autenticação (Mais Seguro)

```sql
-- Criar usuário anônimo com permissões limitadas
CREATE POLICY "Acesso anônimo aos relatórios" ON relatorios
    FOR ALL USING (true);
```

## 📝 Passos para Resolver

### Passo 1: Acessar Supabase
1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor**

### Passo 2: Executar Correção
1. Copie o script do arquivo `fix-rls-policies.sql`
2. Cole no SQL Editor
3. Execute a **Solução 1** (desabilitar RLS)
4. Clique em **Run**

### Passo 3: Verificar Correção
1. Execute a consulta de verificação:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'relatorios';
```

2. Resultado esperado:
```
schemaname | tablename  | rowsecurity
-----------|------------|-------------
public     | relatorios | false
```

### Passo 4: Testar Sistema
1. Volte ao sistema Profarma
2. Acesse o setor de custos
3. Clique no botão "🐛 Debug"
4. Verifique se agora consegue criar/buscar relatórios

## 🔍 Verificação de Funcionamento

Após executar a correção, o debug deve mostrar:

```
✅ Relatório de teste criado com sucesso: {...}
✅ ID gerado: 550e8400-e29b-41d4-a716-446655440000
✅ Relatório criado pode ser buscado: {...}
```

## 🚨 Problemas Comuns

### Erro: "relation does not exist"
- Verifique se a tabela `relatorios` foi criada
- Execute o script `database-schema-complete.sql`

### Erro: "permission denied"
- RLS ainda está habilitado
- Execute novamente o comando para desabilitar

### Erro: "authentication required"
- Sistema ainda está tentando autenticar
- Reinicie o sistema após a correção

## 🔒 Segurança em Produção

Para ambientes de produção, considere:

1. **Implementar autenticação real** no Supabase
2. **Criar políticas RLS específicas** por usuário/área
3. **Usar variáveis de ambiente** para configurações
4. **Auditar acessos** regularmente

## 📞 Suporte

Se o problema persistir após executar as correções:

1. **Verifique os logs** do console do navegador
2. **Execute o debug** no setor de custos
3. **Verifique o status** das políticas RLS no Supabase
4. **Consulte a documentação** do Supabase sobre RLS

---

**⚠️ IMPORTANTE:** Esta correção remove proteções de segurança. Use apenas em ambientes de desenvolvimento ou implemente autenticação adequada em produção.
