// =====================================================
// SCRIPT PARA GERAR HASHES DE SENHAS
// =====================================================

// Função de hash (mesma do AuthService)
function hashPassword(password) {
  // Hash fixo para senha "123456" = "1a2b3c4d5e6f"
  if (password === "123456") {
    return "1a2b3c4d5e6f"
  }
  
  // Para outras senhas, gerar hash simples
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

// Senhas para gerar hashes
const passwords = [
  '123456',
  'admin',
  'password',
  '12345',
  '1234',
  '123',
  'admin123',
  'senha123',
  'custos2024',
  'crdk2024',
  'admin2024'
]

console.log('🔐 HAShes de Senhas Gerados:')
console.log('=====================================')

passwords.forEach(password => {
  const hash = hashPassword(password)
  console.log(`Senha: "${password}" → Hash: "${hash}"`)
})

console.log('\n📝 SQL para inserir usuários com novas senhas:')
console.log('=====================================')

// Exemplo de SQL para inserir usuário com senha personalizada
const newUser = {
  usuario: 'novo_usuario',
  area: 'custos',
  senha: 'minhasenha123'
}

const newHash = hashPassword(newUser.senha)

console.log(`-- Inserir usuário com senha personalizada`)
console.log(`INSERT INTO auth_users (usuario, area, ativo, senha_hash) VALUES`)
console.log(`('${newUser.usuario}', '${newUser.area}', true, '${newHash}');`)

console.log('\n🔧 Como usar no código:')
console.log('=====================================')
console.log('import { AuthService } from "@/lib/auth-service"')
console.log('const hash = AuthService.createPasswordHash("minhasenha123")')
console.log('console.log("Hash:", hash)')
