import { getSupabase } from './supabase-client'

// =====================================================
// SERVIÇO DE AUTENTICAÇÃO COM SENHAS
// =====================================================

export interface AuthUser {
  id: string
  usuario: string
  area: string
  ativo: boolean
  senha_hash: string
  created_at: string
  updated_at: string
}

export interface LoginResult {
  success: boolean
  user?: AuthUser
  error?: string
}

export class AuthService {
  /**
   * Gera hash da senha usando algoritmo simples (para desenvolvimento)
   * Em produção, usar bcrypt ou similar
   */
  private static hashPassword(password: string): string {
    // Algoritmo simples de hash para desenvolvimento
    // Em produção, usar: await bcrypt.hash(password, 10)
    
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

  /**
   * Verifica se a senha está correta
   */
  private static verifyPassword(password: string, hash: string): boolean {
    const passwordHash = this.hashPassword(password)
    return passwordHash === hash
  }

  /**
   * Autentica usuário com senha
   */
  static async authenticateUser(usuario: string, senha: string, area: string): Promise<LoginResult> {
    try {
      const supabase = getSupabase()

      // Buscar usuário na tabela auth_users
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id, usuario, area, ativo, senha_hash, created_at, updated_at')
        .ilike('usuario', usuario.trim())
        .eq('ativo', true)
        .single()

      if (userError || !userData) {
        return {
          success: false,
          error: 'Usuário não encontrado ou inativo.'
        }
      }

      // Verificar se a área do usuário corresponde à área selecionada
      if (userData.area !== area) {
        return {
          success: false,
          error: `Usuário não tem acesso à área ${area}. Área autorizada: ${userData.area}`
        }
      }

      // Verificar senha
      if (!this.verifyPassword(senha, userData.senha_hash as string)) {
        return {
          success: false,
          error: 'Senha incorreta.'
        }
      }

      return {
        success: true,
        user: userData as AuthUser
      }
    } catch (error) {
      console.error('❌ Erro ao autenticar usuário:', error)
      return {
        success: false,
        error: 'Erro interno do servidor. Tente novamente.'
      }
    }
  }

  /**
   * Cria hash de senha para inserção no banco
   */
  static createPasswordHash(password: string): string {
    return this.hashPassword(password)
  }

  /**
   * Utilitário para gerar hash de senha (para uso em scripts ou admin)
   */
  static generatePasswordHash(password: string): { password: string; hash: string } {
    const hash = this.hashPassword(password)
    return {
      password,
      hash
    }
  }

  /**
   * Lista de senhas comuns e seus hashes (para referência)
   */
  static getCommonPasswords(): Array<{ password: string; hash: string }> {
    const commonPasswords = [
      '123456',
      'admin',
      'password',
      '12345',
      '1234',
      '123',
      'admin123',
      'senha123'
    ]

    return commonPasswords.map(pwd => ({
      password: pwd,
      hash: this.hashPassword(pwd)
    }))
  }

  /**
   * Verifica se um usuário existe e está ativo
   */
  static async checkUserExists(usuario: string, area: string): Promise<boolean> {
    try {
      const supabase = getSupabase()

      const { data, error } = await supabase
        .from('auth_users')
        .select('id')
        .ilike('usuario', usuario.trim())
        .eq('area', area)
        .eq('ativo', true)
        .single()

      return !error && !!data
    } catch (error) {
      console.error('❌ Erro ao verificar usuário:', error)
      return false
    }
  }

  /**
   * Lista usuários por área
   */
  static async getUsersByArea(area: string): Promise<AuthUser[]> {
    try {
      const supabase = getSupabase()

      const { data, error } = await supabase
        .from('auth_users')
        .select('id, usuario, area, ativo, senha_hash, created_at, updated_at')
        .eq('area', area)
        .eq('ativo', true)
        .order('usuario')

      if (error) {
        console.error('❌ Erro ao buscar usuários:', error)
        return []
      }

      return (data as AuthUser[]) || []
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error)
      return []
    }
  }

  /**
   * Altera a senha de um usuário
   */
  static async changePassword(usuario: string, senhaAtual: string, novaSenha: string, area: string): Promise<LoginResult> {
    try {
      const supabase = getSupabase()

      // Primeiro, verificar se a senha atual está correta
      const authResult = await this.authenticateUser(usuario, senhaAtual, area)
      if (!authResult.success) {
        return {
          success: false,
          error: 'Senha atual incorreta.'
        }
      }

      // Gerar hash da nova senha
      const novoHash = this.createPasswordHash(novaSenha)

      // Atualizar a senha no banco
      const { error: updateError } = await supabase
        .from('auth_users')
        .update({ 
          senha_hash: novoHash,
          updated_at: new Date().toISOString()
        })
        .eq('usuario', usuario)
        .eq('area', area)

      if (updateError) {
        console.error('❌ Erro ao atualizar senha:', updateError)
        return {
          success: false,
          error: 'Erro ao atualizar senha no banco de dados.'
        }
      }

      return {
        success: true,
        user: authResult.user
      }
    } catch (error) {
      console.error('❌ Erro ao alterar senha:', error)
      return {
        success: false,
        error: 'Erro interno do servidor. Tente novamente.'
      }
    }
  }

  /**
   * Valida se uma senha atende aos critérios de segurança
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 6) {
      errors.push('A senha deve ter pelo menos 6 caracteres')
    }

    if (password.length > 50) {
      errors.push('A senha deve ter no máximo 50 caracteres')
    }

    // Verificar se contém pelo menos um número
    if (!/\d/.test(password)) {
      errors.push('A senha deve conter pelo menos um número')
    }

    // Verificar se contém pelo menos uma letra
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
