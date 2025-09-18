/**
 * Serviço para salvar notas fiscais no banco de dados
 * Integração com o sistema existente
 */

import { getSupabase } from './supabase-client'

export interface NotaFiscal {
  id: string
  data: string
  nota: string
  volume: number
  destino: string
  fornecedor: string
  clienteDestino: string
  tipo: string
  transportadora: string
  usuario: string
  dataEntrada: string
  codigoCompleto: string
}

export interface SaveNotesResult {
  success: boolean
  message: string
  savedNotes: number
  totalNotes: number
  errors: string[]
}

export class SaveNotesService {
  /**
   * Salvar notas do localStorage no banco de dados
   */
  static async saveNotesFromLocalStorage(): Promise<SaveNotesResult> {
    try {
      console.log('🚀 Iniciando salvamento de notas do localStorage...')
      
      // Verificar se estamos no navegador
      if (typeof window === 'undefined') {
        return {
          success: false,
          message: 'Este serviço deve ser executado no navegador',
          savedNotes: 0,
          totalNotes: 0,
          errors: ['Execução fora do navegador']
        }
      }

      // Ler dados do localStorage
      const notasData = localStorage.getItem('sistema_notas_consolidado')
      if (!notasData) {
        return {
          success: true,
          message: 'Nenhuma nota encontrada no localStorage',
          savedNotes: 0,
          totalNotes: 0,
          errors: []
        }
      }

      const notes: NotaFiscal[] = JSON.parse(notasData)
      console.log(`📦 Encontradas ${notes.length} notas no localStorage`)

      // Validar dados
      const validationResults = this.validateNotes(notes)
      if (!validationResults.isValid) {
        return {
          success: false,
          message: 'Dados inválidos encontrados',
          savedNotes: 0,
          totalNotes: notes.length,
          errors: validationResults.errors
        }
      }

      // Salvar no banco
      const result = await this.saveNotesToDatabase(notes)
      
      // Se salvamento foi bem-sucedido, limpar localStorage (opcional)
      if (result.success && result.savedNotes > 0) {
        console.log('✅ Notas salvas com sucesso!')
        // Descomente a linha abaixo para limpar o localStorage após salvar
        // localStorage.removeItem('sistema_notas_consolidado')
      }

      return result

    } catch (error) {
      console.error('❌ Erro ao salvar notas:', error)
      return {
        success: false,
        message: `Erro ao salvar notas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        savedNotes: 0,
        totalNotes: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      }
    }
  }

  /**
   * Salvar notas no banco de dados
   */
  static async saveNotesToDatabase(notes: NotaFiscal[]): Promise<SaveNotesResult> {
    try {
      const supabase = getSupabase()
      let savedCount = 0
      const errors: string[] = []

      // Testar conexão
      const { error: testError } = await supabase
        .from('sessions')
        .select('id')
        .limit(1)

      if (testError) {
        throw new Error(`Erro de conexão: ${testError.message}`)
      }

      console.log('✅ Conexão estabelecida com sucesso')

      // Processar cada nota
      for (const nota of notes) {
        try {
          // Buscar ou criar sessão
          const session = await this.getOrCreateSession(nota)
          if (!session) {
            errors.push(`Não foi possível criar sessão para nota ${nota.nota}`)
            continue
          }

          // Verificar se a nota já existe
          const { data: existingNota } = await supabase
            .from('notas_consolidado')
            .select('id')
            .eq('numero_nf', nota.nota)
            .eq('session_id', session.id)
            .single()

          if (existingNota) {
            console.log(`⚠️ Nota ${nota.nota} já existe, pulando...`)
            continue
          }

          // Salvar nota
          const { data: savedNota, error: saveError } = await supabase
            .from('notas_consolidado')
            .insert([{
              codigo_completo: nota.codigoCompleto || '',
              numero_nf: nota.nota,
              data: nota.data,
              volumes: nota.volume,
              destino: nota.destino,
              fornecedor: nota.fornecedor,
              cliente_destino: nota.clienteDestino,
              tipo_carga: nota.tipo,
              transportadora: nota.transportadora,
              usuario: nota.usuario,
              data_entrada: nota.dataEntrada,
              status: 'recebida',
              session_id: session.id
            }])
            .select()
            .single()

          if (saveError) {
            errors.push(`Erro ao salvar nota ${nota.nota}: ${saveError.message}`)
          } else {
            console.log(`✅ Nota ${nota.nota} salva com ID: ${savedNota.id}`)
            savedCount++
          }

        } catch (error) {
          errors.push(`Erro ao processar nota ${nota.nota}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
      }

      return {
        success: errors.length === 0,
        message: `Salvamento concluído: ${savedCount} notas salvas, ${errors.length} erros`,
        savedNotes: savedCount,
        totalNotes: notes.length,
        errors
      }

    } catch (error) {
      console.error('❌ Erro ao salvar notas no banco:', error)
      return {
        success: false,
        message: `Erro ao salvar notas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        savedNotes: 0,
        totalNotes: notes.length,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      }
    }
  }

  /**
   * Validar notas antes de salvar
   */
  static validateNotes(notes: NotaFiscal[]): { isValid: boolean; validCount: number; errors: string[] } {
    const errors: string[] = []
    let validCount = 0

    console.log('🔍 Iniciando validação de notas:', notes.length)

    for (let i = 0; i < notes.length; i++) {
      const nota = notes[i]
      const notaErrors: string[] = []

      console.log(`🔍 Validando nota ${i + 1}:`, {
        id: nota.id,
        nota: nota.nota,
        data: nota.data,
        volume: nota.volume,
        destino: nota.destino,
        fornecedor: nota.fornecedor,
        transportadora: nota.transportadora,
        usuario: nota.usuario,
        clienteDestino: nota.clienteDestino,
        tipo: nota.tipo,
        dataEntrada: nota.dataEntrada,
        codigoCompleto: nota.codigoCompleto
      })

      // Validar campos obrigatórios
      if (!nota.id) notaErrors.push('ID é obrigatório')
      if (!nota.nota) notaErrors.push('Número da nota é obrigatório')
      if (!nota.data) notaErrors.push('Data é obrigatória')
      if (!nota.volume || nota.volume <= 0) notaErrors.push('Volume deve ser maior que zero')
      if (!nota.destino) notaErrors.push('Destino é obrigatório')
      if (!nota.fornecedor) notaErrors.push('Fornecedor é obrigatório')
      if (!nota.transportadora) notaErrors.push('Transportadora é obrigatória')
      if (!nota.usuario) notaErrors.push('Usuário é obrigatório')

      // Validar formato da data
      if (nota.data && !this.isValidDate(nota.data)) {
        notaErrors.push('Formato de data inválido (DD/MM/YYYY)')
      }

      // Validar número da nota
      if (nota.nota && !this.isValidNotaNumber(nota.nota)) {
        notaErrors.push('Número da nota deve conter apenas números')
      }

      if (notaErrors.length === 0) {
        validCount++
        console.log(`✅ Nota ${i + 1} válida`)
      } else {
        console.log(`❌ Nota ${i + 1} inválida:`, notaErrors)
        errors.push(`Nota ${nota.nota || nota.id}: ${notaErrors.join(', ')}`)
      }
    }

    console.log(`📊 Resultado da validação: ${validCount}/${notes.length} notas válidas`)
    if (errors.length > 0) {
      console.log('❌ Erros encontrados:', errors)
    }

    return {
      isValid: errors.length === 0,
      validCount,
      errors
    }
  }

  /**
   * Validar formato de data DD/MM/YYYY
   */
  static isValidDate(dateString: string): boolean {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!dateRegex.test(dateString)) return false

    const [day, month, year] = dateString.split('/')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.getDate() === parseInt(day) && 
           date.getMonth() === parseInt(month) - 1 && 
           date.getFullYear() === parseInt(year)
  }

  /**
   * Validar número da nota (apenas números)
   */
  static isValidNotaNumber(nota: string): boolean {
    return /^\d+$/.test(nota)
  }

  /**
   * Buscar ou criar sessão para a nota
   */
  static async getOrCreateSession(nota: NotaFiscal): Promise<any> {
    try {
      const supabase = getSupabase()
      const data = nota.data
      const turno = 'A' // Assumir turno padrão

      // Tentar buscar sessão existente
      const { data: existingSession, error: searchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('area', 'recebimento')
        .eq('data', data)
        .eq('turno', turno)
        .eq('status', 'ativa')
        .single()

      if (existingSession) {
        return existingSession
      }

      // Criar nova sessão se não existir
      const sessionId = `recebimento_${data}_${turno}_${Date.now()}`
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert([{
          id: sessionId,
          area: 'recebimento',
          colaboradores: ['Sistema'], // Campo obrigatório
          data: data,
          turno: turno,
          login_time: new Date().toISOString(),
          status: 'ativa'
        }])
        .select()
        .single()

      if (createError) {
        console.log(`⚠️ Erro ao criar sessão: ${createError.message}`)
        return null
      }

      console.log(`✅ Nova sessão criada para recebimento - ${data} - ${turno}`)
      return newSession

    } catch (error) {
      console.log(`❌ Erro ao buscar/criar sessão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return null
    }
  }

  /**
   * Fazer backup das notas do localStorage
   */
  static backupNotesToFile(): void {
    if (typeof window === 'undefined') {
      console.log('⚠️ Esta função deve ser executada no navegador')
      return
    }

    const notasData = localStorage.getItem('sistema_notas_consolidado')
    if (!notasData) {
      console.log('ℹ️ Nenhuma nota encontrada no localStorage')
      return
    }

    const notes = JSON.parse(notasData)
    const backupData = {
      timestamp: new Date().toISOString(),
      totalNotes: notes.length,
      notes: notes
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_notas_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('✅ Backup criado e baixado')
  }

  /**
   * Limpar notas duplicadas do localStorage
   */
  static cleanDuplicateNotes(): { removed: number; total: number } {
    if (typeof window === 'undefined') {
      console.log('⚠️ Esta função deve ser executada no navegador')
      return { removed: 0, total: 0 }
    }

    const notasData = localStorage.getItem('sistema_notas_consolidado')
    if (!notasData) {
      console.log('ℹ️ Nenhuma nota encontrada no localStorage')
      return { removed: 0, total: 0 }
    }

    const notes = JSON.parse(notasData)
    const uniqueNotes = []
    const seen = new Set()

    for (const nota of notes) {
      const key = `${nota.nota}_${nota.data}_${nota.transportadora}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueNotes.push(nota)
      }
    }

    if (uniqueNotes.length !== notes.length) {
      localStorage.setItem('sistema_notas_consolidado', JSON.stringify(uniqueNotes))
      const removed = notes.length - uniqueNotes.length
      console.log(`✅ Removidas ${removed} notas duplicadas`)
      console.log(`📊 Total de notas únicas: ${uniqueNotes.length}`)
      return { removed, total: notes.length }
    } else {
      console.log('✅ Nenhuma duplicata encontrada')
      return { removed: 0, total: notes.length }
    }
  }
}
