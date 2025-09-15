/**
 * Script para salvar notas do localStorage no banco de dados
 * Executável no navegador
 * 
 * Como usar:
 * 1. Abra o console do navegador (F12)
 * 2. Cole este script
 * 3. Execute: saveNotesFromBrowser()
 */

// Configurações do Supabase
const SUPABASE_URL = 'https://vzqibndtoitnppvgkekc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

// Criar cliente Supabase
const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Função principal para salvar notas do localStorage
 */
async function saveNotesFromBrowser() {
  console.log('🚀 Iniciando salvamento de notas do localStorage...')
  
  try {
    // 1. Verificar se há dados no localStorage
    const notasData = localStorage.getItem('sistema_notas_consolidado')
    if (!notasData) {
      console.log('ℹ️ Nenhuma nota encontrada no localStorage')
      return {
        success: true,
        message: 'Nenhuma nota encontrada',
        savedNotes: 0
      }
    }
    
    const notes = JSON.parse(notasData)
    console.log(`📦 Encontradas ${notes.length} notas no localStorage`)
    
    // 2. Validar dados
    console.log('🔍 Validando dados das notas...')
    const validationResults = validateNotes(notes)
    
    if (!validationResults.isValid) {
      console.log('❌ Dados inválidos encontrados:')
      validationResults.errors.forEach(error => console.log(`  - ${error}`))
      return {
        success: false,
        message: 'Dados inválidos encontrados',
        errors: validationResults.errors
      }
    }
    
    console.log(`✅ ${validationResults.validCount} notas válidas encontradas`)

    // 3. Testar conexão com o banco
    console.log('📡 Testando conexão com banco de dados...')
    const { data: testData, error: testError } = await supabaseClient
      .from('sessions')
      .select('id')
      .limit(1)
    
    if (testError) {
      throw new Error(`Erro de conexão: ${testError.message}`)
    }
    
    console.log('✅ Conexão estabelecida com sucesso')

    // 4. Salvar notas no banco
    console.log('📦 Salvando notas no banco de dados...')
    
    let savedCount = 0
    let errorCount = 0
    const errors = []
    
    for (const nota of notes) {
      try {
        // Buscar ou criar sessão
        const session = await getOrCreateSession(nota)
        
        if (!session) {
          console.log(`⚠️ Não foi possível criar sessão para nota ${nota.nota}`)
          errorCount++
          errors.push(`Sessão não criada para nota ${nota.nota}`)
          continue
        }

        // Verificar se a nota já existe
        const { data: existingNota, error: checkError } = await supabaseClient
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
        const { data: savedNota, error: saveError } = await supabaseClient
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
          console.log(`❌ Erro ao salvar nota ${nota.nota}: ${saveError.message}`)
          errorCount++
          errors.push(`Erro ao salvar nota ${nota.nota}: ${saveError.message}`)
        } else {
          console.log(`✅ Nota ${nota.nota} salva com ID: ${savedNota.id}`)
          savedCount++
        }
        
      } catch (error) {
        console.log(`❌ Erro ao processar nota ${nota.nota}: ${error.message}`)
        errorCount++
        errors.push(`Erro ao processar nota ${nota.nota}: ${error.message}`)
      }
    }

    // 5. Validar dados salvos
    console.log('🔍 Validando dados salvos no banco...')
    const { data: savedNotes, error: fetchError } = await supabaseClient
      .from('notas_consolidado')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (fetchError) {
      console.log(`⚠️ Erro ao validar dados salvos: ${fetchError.message}`)
    } else {
      console.log(`✅ ${savedNotes.length} notas encontradas no banco`)
    }

    // 6. Resumo final
    console.log('\n📊 RESUMO DO SALVAMENTO:')
    console.log(`✅ Notas salvas com sucesso: ${savedCount}`)
    console.log(`❌ Erros encontrados: ${errorCount}`)
    console.log(`📊 Total processadas: ${notes.length}`)
    
    if (errorCount > 0) {
      console.log('\n⚠️ ERROS DETALHADOS:')
      errors.forEach(error => console.log(`  - ${error}`))
    }

    console.log('\n🎉 Salvamento concluído!')
    
    return {
      success: errorCount === 0,
      message: `Salvamento concluído: ${savedCount} notas salvas, ${errorCount} erros`,
      savedNotes: savedCount,
      totalNotes: notes.length,
      errors: errors
    }

  } catch (error) {
    console.error('❌ Erro durante salvamento:', error)
    return {
      success: false,
      message: `Erro durante salvamento: ${error.message}`,
      savedNotes: 0,
      errors: [error.message]
    }
  }
}

/**
 * Validar notas antes de salvar
 */
function validateNotes(notes) {
  const errors = []
  let validCount = 0
  
  for (const nota of notes) {
    const notaErrors = []
    
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
    if (nota.data && !isValidDate(nota.data)) {
      notaErrors.push('Formato de data inválido')
    }
    
    // Validar número da nota
    if (nota.nota && !isValidNotaNumber(nota.nota)) {
      notaErrors.push('Número da nota deve conter apenas números')
    }
    
    if (notaErrors.length === 0) {
      validCount++
    } else {
      errors.push(`Nota ${nota.nota || nota.id}: ${notaErrors.join(', ')}`)
    }
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
function isValidDate(dateString) {
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
  if (!dateRegex.test(dateString)) return false
  
  const [day, month, year] = dateString.split('/')
  const date = new Date(year, month - 1, day)
  return date.getDate() == day && date.getMonth() == month - 1 && date.getFullYear() == year
}

/**
 * Validar número da nota (apenas números)
 */
function isValidNotaNumber(nota) {
  return /^\d+$/.test(nota)
}

/**
 * Buscar ou criar sessão para a nota
 */
async function getOrCreateSession(nota) {
  try {
    // Extrair data e turno da nota
    const data = nota.data
    const turno = 'A' // Assumir turno padrão
    
    // Tentar buscar sessão existente
    const { data: existingSession, error: searchError } = await supabaseClient
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
    const { data: newSession, error: createError } = await supabaseClient
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
    console.log(`❌ Erro ao buscar/criar sessão: ${error.message}`)
    return null
  }
}

/**
 * Função para limpar notas duplicadas do localStorage
 */
function cleanDuplicateNotes() {
  console.log('🧹 Limpando notas duplicadas do localStorage...')
  
  const notasData = localStorage.getItem('sistema_notas_consolidado')
  if (!notasData) {
    console.log('ℹ️ Nenhuma nota encontrada no localStorage')
    return
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
    console.log(`✅ Removidas ${notes.length - uniqueNotes.length} notas duplicadas`)
    console.log(`📊 Total de notas únicas: ${uniqueNotes.length}`)
  } else {
    console.log('✅ Nenhuma duplicata encontrada')
  }
}

/**
 * Função para fazer backup das notas do localStorage
 */
function backupNotesToFile() {
  console.log('💾 Criando backup das notas...')
  
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

// Expor funções globalmente
window.saveNotesFromBrowser = saveNotesFromBrowser
window.cleanDuplicateNotes = cleanDuplicateNotes
window.backupNotesToFile = backupNotesToFile

console.log('📋 Script carregado! Funções disponíveis:')
console.log('  - saveNotesFromBrowser() - Salvar notas no banco')
console.log('  - cleanDuplicateNotes() - Limpar duplicatas')
console.log('  - backupNotesToFile() - Fazer backup')
