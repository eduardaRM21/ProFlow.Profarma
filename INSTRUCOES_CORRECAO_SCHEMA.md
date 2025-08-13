# 🔧 INSTRUÇÕES PARA CORRIGIR INCOMPATIBILIDADE DE SCHEMA

## 📋 PROBLEMA IDENTIFICADO

Você está enfrentando um erro de incompatibilidade de tipos entre dois schemas diferentes:

- **`database-schema.sql`** - usa `TEXT` para o `id` da tabela `sessions`
- **`database-schema-complete.sql`** - usa `UUID` para o `id` da tabela `sessions`

O erro específico é:
```
ERROR: 42804: foreign key constraint "notas_fiscais_session_id_fkey" cannot be implemented
DETAIL: Key columns "session_id" and "id" are of incompatible types: uuid and text.
```

## 🚀 SOLUÇÃO

### Passo 1: Executar o Script de Correção

Execute o arquivo `fix-schema-incompatibility.sql` **ANTES** de executar o `database-schema-complete.sql`.

```sql
-- Execute este comando no seu banco de dados
\i fix-schema-incompatibility.sql
```

### Passo 2: Executar o Schema Completo

Após executar o script de correção, você pode executar o schema completo:

```sql
-- Execute este comando no seu banco de dados
\i database-schema-complete.sql
```

## 🔍 O QUE O SCRIPT DE CORREÇÃO FAZ

1. **Verifica a estrutura atual** das tabelas existentes
2. **Converte tabelas** de `TEXT` para `UUID` quando necessário
3. **Preserva dados existentes** durante a conversão
4. **Cria tabelas ausentes** com a estrutura correta
5. **Estabelece foreign keys** com tipos compatíveis

## 📊 TABELAS QUE SERÃO CORRIGIDAS

- ✅ `sessions` - conversão de `TEXT` para `UUID`
- ✅ `relatorios` - conversão de `TEXT` para `UUID`
- ✅ `notas_fiscais` - criação/verificação
- ✅ `divergencias` - criação/verificação
- ✅ `carros_embalagem` - criação/verificação
- ✅ `inventario` - criação/verificação
- ✅ `users` - criação/verificação
- ✅ Tabelas auxiliares - criação se necessário

## ⚠️ IMPORTANTE

- **Faça backup** do seu banco antes de executar os scripts
- Execute primeiro o script de correção
- Depois execute o schema completo
- O script é seguro e não perde dados existentes

## 🎯 RESULTADO ESPERADO

Após executar os scripts, todas as tabelas terão:
- Tipos de dados consistentes (`UUID` para IDs)
- Foreign keys funcionando corretamente
- Estrutura compatível com o schema completo
- Dados existentes preservados

## 🆘 EM CASO DE PROBLEMAS

Se encontrar algum erro durante a execução:

1. Verifique se a extensão `uuid-ossp` está habilitada
2. Confirme que você tem permissões de administrador no banco
3. Verifique se não há transações pendentes
4. Consulte os logs de erro para detalhes específicos

## 📞 SUPORTE

Se precisar de ajuda adicional, verifique:
- Os logs de execução do script
- A estrutura atual das tabelas usando `\d+ nome_tabela`
- As constraints existentes usando `\d+ nome_tabela`

---

**✅ Execute o `fix-schema-incompatibility.sql` primeiro e depois o `database-schema-complete.sql`**
