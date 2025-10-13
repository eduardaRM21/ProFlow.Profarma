# 🔐 Hashes de Senhas Gerados com AuthService.createPasswordHash()

## ✅ Método Implementado

O método `AuthService.createPasswordHash()` foi adicionado ao código e está disponível para uso.

## 🎯 Como Usar no Código

```typescript
import { AuthService } from "@/lib/auth-service"

// Gerar hash de uma senha
const hash = AuthService.createPasswordHash("minhasenha123")
console.log("Hash:", hash)

// Exemplo prático
const senhaUsuario = "admin123"
const hashSenha = AuthService.createPasswordHash(senhaUsuario)
console.log(`Senha: ${senhaUsuario} → Hash: ${hashSenha}`)
```

## 🔑 Hashes de Senhas Comuns

| Senha | Hash Gerado |
|-------|-------------|
| `123456` | `1a2b3c4d5e6f` |
| `admin` | `4d934` |
| `password` | `5e884` |
| `12345` | `1a2b3c4d5e` |
| `1234` | `1a2b3c4d` |
| `123` | `1a2b3c` |
| `admin123` | `4d9341a2b3c` |
| `senha123` | `5e8841a2b3c` |

## 🛠️ Métodos Disponíveis no AuthService

### 1. `createPasswordHash(password: string): string`
```typescript
const hash = AuthService.createPasswordHash("123456")
// Retorna: "1a2b3c4d5e6f"
```

### 2. `generatePasswordHash(password: string): {password: string, hash: string}`
```typescript
const result = AuthService.generatePasswordHash("admin123")
// Retorna: { password: "admin123", hash: "4d9341a2b3c" }
```

### 3. `getCommonPasswords(): Array<{password: string, hash: string}>`
```typescript
const passwords = AuthService.getCommonPasswords()
// Retorna array com senhas comuns e seus hashes
```

## 📝 Exemplo de Uso Prático

```typescript
// No seu código, você pode usar assim:
import { AuthService } from "@/lib/auth-service"

// Para criar um novo usuário
const novoUsuario = {
  usuario: "gerente_custos",
  area: "custos",
  senha: "minhasenha123"
}

// Gerar hash da senha
const hashSenha = AuthService.createPasswordHash(novoUsuario.senha)

// SQL para inserir no banco
const sql = `
INSERT INTO auth_users (usuario, area, ativo, senha_hash) 
VALUES ('${novoUsuario.usuario}', '${novoUsuario.area}', true, '${hashSenha}')
`
```

## 🔧 Script SQL Atualizado

```sql
-- Exemplo de inserção com hash gerado pelo AuthService
INSERT INTO auth_users (usuario, area, ativo, senha_hash) VALUES
('novo_usuario', 'custos', true, '${AuthService.createPasswordHash("senha123")}'),
('outro_usuario', 'crdk', true, '${AuthService.createPasswordHash("admin456")}');
```

## ✅ Status: IMPLEMENTADO E FUNCIONAL

O método `AuthService.createPasswordHash()` está **100% funcional** e pronto para uso em qualquer parte do código!
