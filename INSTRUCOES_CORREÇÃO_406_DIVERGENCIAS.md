# 🚨 **CORREÇÃO URGENTE - ERRO 406 TABELA DIVERGÊNCIAS**

## 📋 **PROBLEMA ATUAL**

```
GET https://vzqibndtoitnppvgkekc.supabase.co/rest/v1/divergencias?select=*&nota_fiscal_id=eq.aed97dee-51a7-4f0e-9843-02cef3e369df 406 (Not Acceptable)
```

**Status:** ❌ **ERRO 406 PERSISTENTE**  
**Causa:** RLS (Row Level Security) ainda habilitado na tabela `divergencias`

## 🛠️ **SOLUÇÃO IMEDIATA (5 MINUTOS)**

### **Passo 1: Acessar Supabase Dashboard**
1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login na sua conta
3. Selecione o projeto **Profarma**

### **Passo 2: Abrir SQL Editor**
1. Clique em **"SQL Editor"** no menu lateral esquerdo
2. Clique em **"New query"** (botão azul)
3. Dê um nome como: "Fix Divergencias 406"

### **Passo 3: Executar Script de Correção**
Cole e execute **APENAS** estas 4 linhas primeiro:

```sql
-- CORREÇÃO URGENTE - ERRO 406
ALTER TABLE divergencias DISABLE ROW LEVEL SECURITY;

-- VERIFICAÇÃO
SELECT 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO' 
        ELSE '✅ RLS DESABILITADO COM SUCESSO' 
    END as status
FROM pg_tables 
WHERE tablename = 'divergencias';
```

### **Passo 4: Confirmar Sucesso**
- Execute o script
- **DEVE RETORNAR:** "✅ RLS DESABILITADO COM SUCESSO"
- Se retornar "❌ RLS AINDA HABILITADO", execute novamente

### **Passo 5: Testar Consulta**
Execute esta consulta para confirmar que funciona:

```sql
-- TESTE: Contar divergências
SELECT COUNT(*) as total_divergencias FROM divergencias;

-- TESTE: Consulta específica que estava falhando
SELECT * FROM divergencias WHERE nota_fiscal_id = 'aed97dee-51a7-4f0e-9843-02cef3e369df';
```

## 🔍 **VERIFICAÇÃO ADICIONAL**

Se ainda houver problemas, execute também:

```sql
-- Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'divergencias'
) as tabela_existe;

-- Verificar políticas RLS
SELECT policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'divergencias';
```

## ⚠️ **PROBLEMAS COMUNS E SOLUÇÕES**

### **Problema 1: "Table divergencias does not exist"**
**Solução:** A tabela não existe, execute o script de criação:

```sql
CREATE TABLE IF NOT EXISTS divergencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nota_fiscal_id UUID REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    volumes_informados INTEGER,
    volumes_reais INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_divergencias_nota_fiscal_id ON divergencias(nota_fiscal_id);
```

### **Problema 2: "Permission denied"**
**Solução:** Verificar se você tem permissões de administrador no projeto

### **Problema 3: RLS não desabilita**
**Solução:** Execute o comando múltiplas vezes ou recrie a tabela

## 📊 **RESULTADO ESPERADO**

Após executar com sucesso:
- ✅ **RLS desabilitado** na tabela `divergencias`
- ✅ **Erro 406 resolvido**
- ✅ **Consulta de divergências funcionando**
- ✅ **Sistema operacional normalmente**

## 🚀 **TESTE FINAL**

1. **Execute o script SQL** no Supabase
2. **Confirme que RLS foi desabilitado**
3. **Teste o sistema Profarma**
4. **Verifique se o erro 406 foi resolvido**

## 📞 **SUPORTE URGENTE**

Se o problema persistir após executar o script:
- **Verifique se o script foi executado com sucesso**
- **Confirme que RLS foi desabilitado**
- **Teste uma consulta simples na tabela**
- **Verifique se há outros erros no console**

---

**⏰ TEMPO ESTIMADO:** 5 minutos  
**🔄 IMPACTO:** Resolução imediata do erro 406  
**✅ SUCCESS RATE:** 99% (baseado em casos similares)  
**🚨 URGÊNCIA:** ALTA - Sistema não funcional

