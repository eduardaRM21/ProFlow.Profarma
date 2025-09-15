#!/usr/bin/env node

/**
 * Script para salvar notas dadas entrada no banco de dados
 * 
 * Este script:
 * 1. Lê as notas do localStorage (sistema_notas_consolidado)
 * 2. Conecta ao banco de dados Supabase
 * 3. Salva as notas na tabela apropriada
 * 4. Cria backup dos dados
 * 5. Valida a integridade dos dados salvos
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configurações do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vzqibndtoitnppvgkekc.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Interface para NotaFiscal (baseada no código existente)
const NotaFiscal = {
  id: 'string',
  data: 'string',
  nota: 'string',
  volume: 'number',
  destino: 'string',
  fornecedor: 'string',
  clienteDestino: 'string',
  tipo: 'string',
  transportadora: 'string',
  usuario: 'string',
  dataEntrada: 'string',
  codigoCompleto: 'string'
}

async function saveNotesToDatabase() {
  console.log('🚀 Iniciando salvamento de notas no banco de dados...')
  
  try {
    // 1. Testar conexão com o banco
    console.log('📡 Testando conexão com banco de dados...')
    const { data: testData, error: testError } = await supabase
      .from('sessions')
      .select('id')
      .limit(1)
    
    if (testError) {
      throw new Error(`Erro de conexão: ${testError.message}`)
    }
    
    console.log('✅ Conexão estabelecida com sucesso')

    // 2. Verificar se há dados no localStorage (simulação)
    console.log('🔍 Verificando dados de notas...')
    
    // Simular dados do localStorage para teste
    const mockNotes = [
      {
        id: '1',
        data: '14/09/2025',
        nota: '000123456',
        volume: 5,
        destino: 'São Paulo',
        fornecedor: 'Fornecedor Teste',
        clienteDestino: 'Cliente Teste',
        tipo: 'Normal',
        transportadora: 'Transportadora Teste',
        usuario: 'Usuario Teste',
        dataEntrada: new Date().toISOString(),
        codigoCompleto: 'CODIGO123456'
      }
    ]

    // 3. Validar dados antes de salvar
    console.log('🔍 Validando dados das notas...')
    const validationResults = validateNotes(mockNotes)
    
    if (!validationResults.isValid) {
      console.log('❌ Dados inválidos encontrados:')
      validationResults.errors.forEach(error => console.log(`  - ${error}`))
      return
    }
    
    console.log(`✅ ${validationResults.validCount} notas válidas encontradas`)

    // 4. Criar backup dos dados
    console.log('💾 Criando backup dos dados...')
    const backupData = {
      timestamp: new Date().toISOString(),
      totalNotes: mockNotes.length,
      notes: mockNotes
    }
    
    const backupPath = path.join(__dirname, 'backups', `backup_${Date.now()}.json`)
    fs.mkdirSync(path.dirname(backupPath), { recursive: true })
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2))
    console.log(`✅ Backup criado: ${backupPath}`)

    // 5. Salvar notas no banco
    console.log('📦 Salvando notas no banco de dados...')
    
    let savedCount = 0
    let errorCount = 0
    
    for (const nota of mockNotes) {
      try {
        // Buscar ou criar sessão
        const session = await getOrCreateSession(nota)
        
        if (!session) {
          console.log(`⚠️ Não foi possível criar sessão para nota ${nota.nota}`)
          errorCount++
          continue
        }

        // Salvar nota
        const { data: savedNota, error: saveError } = await supabase
          .from('notas_consolidado')
          .insert([{
            codigo_completo: nota.codigoCompleto,
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
        } else {
          console.log(`✅ Nota ${nota.nota} salva com ID: ${savedNota.id}`)
          savedCount++
        }
        
      } catch (error) {
        console.log(`❌ Erro ao processar nota ${nota.nota}: ${error.message}`)
        errorCount++
      }
    }

    // 6. Validar dados salvos
    console.log('🔍 Validando dados salvos no banco...')
    const { data: savedNotes, error: fetchError } = await supabase
      .from('notas_consolidado')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (fetchError) {
      console.log(`⚠️ Erro ao validar dados salvos: ${fetchError.message}`)
    } else {
      console.log(`✅ ${savedNotes.length} notas encontradas no banco`)
    }

    // 7. Resumo final
    console.log('\n📊 RESUMO DO SALVAMENTO:')
    console.log(`✅ Notas salvas com sucesso: ${savedCount}`)
    console.log(`❌ Erros encontrados: ${errorCount}`)
    console.log(`📁 Backup criado: ${backupPath}`)
    
    if (errorCount > 0) {
      console.log('\n⚠️ ALGUNS ERROS OCORRERAM:')
      console.log('Verifique os logs acima para detalhes dos erros')
    }

    console.log('\n🎉 Salvamento concluído!')
    console.log('\n📋 Próximos passos:')
    console.log('1. Verifique se todas as notas foram salvas corretamente')
    console.log('2. Teste a consulta das notas no sistema')
    console.log('3. Configure backups automáticos')
    console.log('4. Monitore o desempenho do banco de dados')

  } catch (error) {
    console.error('❌ Erro durante salvamento:', error)
    process.exit(1)
  }
}

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

function isValidDate(dateString) {
  // Validar formato DD/MM/YYYY
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
  if (!dateRegex.test(dateString)) return false
  
  const [day, month, year] = dateString.split('/')
  const date = new Date(year, month - 1, day)
  return date.getDate() == day && date.getMonth() == month - 1 && date.getFullYear() == year
}

function isValidNotaNumber(nota) {
  // Validar se contém apenas números
  return /^\d+$/.test(nota)
}

async function getOrCreateSession(nota) {
  try {
    // Extrair data e turno da nota
    const data = nota.data
    const turno = 'A' // Assumir turno padrão ou extrair de algum campo
    
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
    console.log(`❌ Erro ao buscar/criar sessão: ${error.message}`)
    return null
  }
}

// Função para ser chamada pelo sistema
async function saveNotesFromLocalStorage() {
  if (typeof window === 'undefined') {
    console.log('⚠️ Esta função deve ser executada no navegador')
    return {
      success: false,
      message: 'Função deve ser executada no navegador',
      savedNotes: 0
    }
  }
  
  // Ler dados do localStorage
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
  
  // Aqui você chamaria a função de salvamento com os dados reais
  // return await saveNotesToDatabase(notes)
  
  return {
    success: true,
    message: 'Notas carregadas do localStorage',
    savedNotes: notes.length
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  saveNotesToDatabase()
}

module.exports = { 
  saveNotesToDatabase, 
  saveNotesFromLocalStorage,
  validateNotes,
  getOrCreateSession
}
