import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as net from 'net'
import { gerarZPL, type DadosEtiqueta } from '@/lib/zpl-generator'

const execAsync = promisify(exec)

/**
 * SOLUÇÃO SIMPLIFICADA E ESTÁVEL PARA IMPRESSÃO ZPL NO WINDOWS
 * 
 * Esta implementação usa a API do Windows para enviar RAW data diretamente
 * para a impressora, que é o método mais confiável para ZPL.
 */

// Função para obter informações da impressora no Windows
async function getPrinterPort(printerName: string): Promise<string | null> {
  try {
    const psScript = `Get-Printer -Name '${printerName.replace(/'/g, "''")}' | Select-Object -ExpandProperty PortName`
    const psScriptFile = path.join(process.cwd(), 'temp', `getport_${Date.now()}.ps1`)
    const tempDir = path.dirname(psScriptFile)
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    fs.writeFileSync(psScriptFile, psScript, 'utf8')
    
    const command = `powershell.exe -ExecutionPolicy Bypass -NoProfile -NonInteractive -WindowStyle Hidden -File "${psScriptFile}"`
    
    const { stdout } = await execAsync(command, {
      windowsHide: true,
      timeout: 5000
    })
    
    try {
      fs.unlinkSync(psScriptFile)
    } catch {}
    
    const port = stdout.trim()
    return port || null
  } catch (error) {
    console.warn(`⚠️ [API Local] Erro ao obter porta:`, error)
    return null
  }
}

// Função para extrair IP da porta da impressora
function extractIPFromPort(printerPort: string): string | null {
  // Formato 1: TCPIP_192.168.1.100
  const match1 = printerPort.match(/TCPIP[^_]*_(\d+\.\d+\.\d+\.\d+)/i)
  if (match1) return match1[1]
  
  // Formato 2: IP_192.168.1.100
  const match2 = printerPort.match(/IP[^_]*_(\d+\.\d+\.\d+\.\d+)/i)
  if (match2) return match2[1]
  
  // Formato 3: TCP_192.168.1.100
  const match3 = printerPort.match(/TCP[^_]*_(\d+\.\d+\.\d+\.\d+)/i)
  if (match3) return match3[1]
  
  // Formato 4: Já é um IP direto
  if (printerPort.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return printerPort
  }
  
  // Formato 5: TCPIP_192.168.1.100_9100
  const match5 = printerPort.match(/TCPIP[^_]*_(\d+\.\d+\.\d+\.\d+)_\d+/i)
  if (match5) return match5[1]
  
  return null
}

/**
 * MÉTODO 1: RAW TCP Printing (Mais confiável para impressoras de rede)
 * Envia ZPL diretamente via TCP/IP na porta 9100 (padrão Zebra)
 */
async function printViaRawTCP(printerIP: string, zpl: string, codigoPalete: string): Promise<NextResponse> {
  return new Promise((resolve, reject) => {
    const ports = [9100, 6101] // Portas padrão Zebra
    let currentPortIndex = 0
    
    const tryNextPort = () => {
      if (currentPortIndex >= ports.length) {
        reject(new Error(`Não foi possível conectar à impressora ${printerIP} nas portas ${ports.join(' ou ')}`))
        return
      }
      
      const port = ports[currentPortIndex]
      const socket = new net.Socket()
      let connected = false
      let dataSent = false
      
      socket.setTimeout(5000)
      
      socket.on('connect', () => {
        connected = true
        console.log(`✅ [RAW TCP] Conectado à ${printerIP}:${port}`)
        
        // Enviar ZPL com quebra de linha no final
        const zplCompleto = zpl.endsWith('\n') ? zpl : zpl + '\n'
        socket.write(zplCompleto, 'utf8', (err) => {
          if (err) {
            console.error(`❌ [RAW TCP] Erro ao enviar:`, err)
            socket.destroy()
            currentPortIndex++
            tryNextPort()
          } else {
            dataSent = true
            console.log(`📤 [RAW TCP] ZPL enviado (${zplCompleto.length} bytes)`)
            setTimeout(() => socket.end(), 200)
          }
        })
      })
      
      socket.on('close', () => {
        if (connected && dataSent) {
          console.log(`✅ [RAW TCP] Etiqueta ${codigoPalete} impressa com sucesso`)
          resolve(NextResponse.json({
            success: true,
            message: `Etiqueta ${codigoPalete} enviada via RAW TCP (${printerIP}:${port})`
          }))
        } else if (!connected) {
          currentPortIndex++
          tryNextPort()
        }
      })
      
      socket.on('error', (error) => {
        console.warn(`⚠️ [RAW TCP] Erro na porta ${port}:`, error.message)
        socket.destroy()
        currentPortIndex++
        tryNextPort()
      })
      
      socket.on('timeout', () => {
        console.warn(`⚠️ [RAW TCP] Timeout na porta ${port}`)
        socket.destroy()
        currentPortIndex++
        tryNextPort()
      })
      
      console.log(`🔌 [RAW TCP] Tentando conectar em ${printerIP}:${port}`)
      socket.connect(port, printerIP)
    }
    
    tryNextPort()
  })
}

/**
 * MÉTODO 2: Método simples usando copy /B para porta da impressora
 * Mais confiável e simples que a Windows RAW API
 */
async function printViaCopyToPrinterPort(printerName: string, tempFile: string, codigoPalete: string): Promise<NextResponse> {
  try {
    console.log(`🔄 [Copy Method] Tentando obter porta da impressora: ${printerName}`)
    
    // Obter porta da impressora
    const printerPort = await getPrinterPort(printerName)
    
    if (!printerPort) {
      throw new Error('Não foi possível obter a porta da impressora')
    }
    
    console.log(`🔍 [Copy Method] Porta encontrada: ${printerPort}`)
    
    // Se for porta TCP/IP, não usar copy (usar RAW TCP)
    if (printerPort.includes('TCP') || printerPort.includes('IP_')) {
      throw new Error('Porta TCP/IP detectada, use RAW TCP')
    }
    
    // Verificar se o arquivo existe antes de copiar
    if (!fs.existsSync(tempFile)) {
      throw new Error(`Arquivo ZPL não encontrado: ${tempFile}`)
    }
    
    const fileStats = fs.statSync(tempFile)
    console.log(`📊 [Copy Method] Arquivo ZPL: ${tempFile}`)
    console.log(`📊 [Copy Method] Tamanho: ${fileStats.size} bytes`)
    
    // Usar copy /B para enviar dados RAW
    const command = `copy /B "${tempFile}" "${printerPort}"`
    console.log(`🔧 [Copy Method] Executando: ${command}`)
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        windowsHide: true,
        timeout: 10000
      })
      
      console.log(`📤 [Copy Method] stdout: ${stdout || '(vazio)'}`)
      if (stderr && stderr.trim()) {
        console.warn(`⚠️ [Copy Method] stderr: ${stderr}`)
      }
      
      // Verificar se a cópia foi bem-sucedida
      // O comando copy retorna "1 arquivo(s) copiado(s)" em caso de sucesso
      if (stdout && stdout.includes('copiado')) {
        console.log(`✅ [Copy Method] Comando copy executado com sucesso`)
      } else {
        console.warn(`⚠️ [Copy Method] Comando copy não retornou mensagem de sucesso esperada`)
        console.warn(`⚠️ [Copy Method] Isso pode indicar que os dados não foram enviados corretamente`)
      }
    } catch (copyError: any) {
      console.error(`❌ [Copy Method] Erro ao executar copy /B:`, copyError)
      if (copyError.stdout) {
        console.error(`   stdout: ${copyError.stdout}`)
      }
      if (copyError.stderr) {
        console.error(`   stderr: ${copyError.stderr}`)
      }
      throw copyError
    }
    
    // Não deletar arquivo imediatamente - manter para debug
    console.log(`✅ [Copy Method] Etiqueta ${codigoPalete} enviada via copy /B`)
    console.log(`⚠️ [Copy Method] ATENÇÃO: Se a etiqueta não sair, o método copy /B pode não funcionar para esta impressora`)
    console.log(`⚠️ [Copy Method] Tente usar o Windows RAW API ou configure a impressora para usar porta TCP/IP`)
    
    return NextResponse.json({
      success: true,
      message: `Etiqueta ${codigoPalete} enviada para impressora ${printerName} via RAW (copy /B). Verifique se a etiqueta saiu na impressora física. Se não sair, o método copy /B pode não funcionar para esta impressora.`
    })
  } catch (error) {
    throw new Error(`Erro ao usar copy /B: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * MÉTODO 3: Windows RAW Printing API (Mais confiável para impressoras locais)
 * Usa a API do Windows para enviar RAW data diretamente, sem passar pelo driver
 */
async function printViaWindowsRawAPI(printerName: string, zpl: string, codigoPalete: string, tempFile: string): Promise<NextResponse> {
  try {
    console.log(`🔄 [RAW API] Iniciando impressão via Windows RAW API para: ${printerName}`)
    
    // Escapar caracteres especiais no nome da impressora
    const printerEscaped = printerName.replace(/'/g, "''").replace(/"/g, '`"')
    
    // Usar caminho absoluto e normalizar para PowerShell
    const absolutePath = path.resolve(tempFile)
    console.log(`🔍 [DEBUG] Caminho original: ${tempFile}`)
    console.log(`🔍 [DEBUG] Caminho absoluto: ${absolutePath}`)
    
    // Verificar se o arquivo existe antes de criar o script
    console.log(`🔍 [DEBUG] Verificando existência do arquivo antes de criar script PowerShell:`)
    console.log(`   - Caminho recebido: ${tempFile}`)
    console.log(`   - Caminho absoluto: ${absolutePath}`)
    console.log(`   - Arquivo existe? ${fs.existsSync(absolutePath)}`)
    
    if (!fs.existsSync(absolutePath)) {
      // Listar arquivos no diretório para debug
      const tempDir = path.dirname(absolutePath)
      console.log(`🔍 [DEBUG] Arquivo não encontrado. Listando arquivos no diretório: ${tempDir}`)
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir)
        console.log(`🔍 [DEBUG] Arquivos encontrados no diretório:`, files)
        const zplFiles = files.filter(f => f.endsWith('.zpl'))
        console.log(`🔍 [DEBUG] Arquivos .zpl encontrados:`, zplFiles)
      } else {
        console.log(`🔍 [DEBUG] Diretório não existe: ${tempDir}`)
      }
      throw new Error(`Arquivo ZPL não existe antes de criar script PowerShell: ${absolutePath}`)
    }
    
    // Verificar tamanho do arquivo
    const fileStats = fs.statSync(absolutePath)
    console.log(`🔍 [DEBUG] Arquivo encontrado. Tamanho: ${fileStats.size} bytes`)
    
    // Para PowerShell, usar aspas simples para evitar problemas com espaços
    // Escapar apenas aspas simples dentro de aspas simples (duplicar)
    const filePathForPS = absolutePath.replace(/'/g, "''")
    
    console.log(`🔍 [DEBUG] Caminho para PowerShell: ${filePathForPS}`)
    console.log(`🔍 [DEBUG] Nome do arquivo: ${path.basename(absolutePath)}`)
    
    // Script PowerShell simplificado e mais robusto
    const psScript = `
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$printerName = "${printerEscaped}"
$filePath = '${filePathForPS}'

try {
  # Obter caminho absoluto e normalizar
  $absolutePath = [System.IO.Path]::GetFullPath($filePath)
  Write-Host "INFO: Verificando arquivo: $absolutePath"
  
  # Garantir que o diretório existe
  $tempDir = Split-Path -Parent $absolutePath
  if (-not (Test-Path $tempDir)) {
    Write-Host "INFO: Criando diretório: $tempDir"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    if (-not (Test-Path $tempDir)) {
      Write-Host "ERRO: Não foi possível criar diretório: $tempDir"
      exit 1
    }
    Write-Host "INFO: Diretório criado com sucesso"
  }
  
  # Verificar se o arquivo existe
  Write-Host "INFO: Verificando arquivo: $absolutePath"
  Write-Host "INFO: Nome do arquivo esperado: $(Split-Path -Leaf $absolutePath)"
  
  if (-not (Test-Path $absolutePath)) {
    Write-Host "WARN: Arquivo especificado não encontrado: $absolutePath"
    Write-Host "INFO: Caminho original fornecido: $filePath"
    Write-Host "INFO: Diretório atual: $(Get-Location)"
    Write-Host "INFO: Diretório temp: $tempDir"
    Write-Host "INFO: Diretório temp existe: $(Test-Path $tempDir)"
    Write-Host "INFO: Procurando arquivos .zpl no diretório temp..."
    
    if (Test-Path $tempDir) {
      $zplFiles = Get-ChildItem $tempDir -Filter "*.zpl" -ErrorAction SilentlyContinue
      if ($zplFiles) {
        Write-Host "INFO: Arquivos .zpl encontrados:"
        $zplFiles | ForEach-Object { 
          Write-Host "   - $($_.Name) (Tamanho: $($_.Length) bytes, Modificado: $($_.LastWriteTime))"
        }
        Write-Host "INFO: Usando o arquivo .zpl mais recente..."
        $latestZpl = $zplFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestZpl) {
          $absolutePath = $latestZpl.FullName
          Write-Host "INFO: Usando arquivo: $absolutePath"
        } else {
          Write-Host "ERRO: Não foi possível encontrar arquivo .zpl"
          exit 1
        }
      } else {
        Write-Host "ERRO: Nenhum arquivo .zpl encontrado no diretório temp"
        exit 1
      }
    } else {
      Write-Host "ERRO: Diretório temp não existe: $tempDir"
      exit 1
    }
  }
  
  Write-Host "INFO: Arquivo encontrado: $absolutePath"
  $fileInfo = Get-Item $absolutePath
  Write-Host "INFO: Tamanho do arquivo: $($fileInfo.Length) bytes"
  
  # Ler conteúdo do arquivo usando caminho absoluto
  $zplContent = Get-Content -Path $absolutePath -Raw -Encoding UTF8
  if (-not $zplContent) {
    Write-Host "ERRO: Arquivo ZPL vazio ou não foi possível ler"
    exit 1
  }
  
  Write-Host "INFO: Arquivo ZPL lido com sucesso ($($zplContent.Length) caracteres)"
  
  # Verificar se a impressora existe
  $printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue
  if (-not $printer) {
    # Tentar listar todas as impressoras para debug
    $allPrinters = Get-Printer | Select-Object -ExpandProperty Name
    Write-Host "ERRO: Impressora não encontrada: $printerName"
    Write-Host "Impressoras disponíveis: $($allPrinters -join ', ')"
    exit 1
  }
  
  Write-Host "INFO: Impressora encontrada: $($printer.Name)"
  Write-Host "INFO: Porta da impressora: $($printer.PortName)"
  
  # Usar .NET para enviar RAW data
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class RawPrinterHelper {
  [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
  
  [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  
  [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  
  [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  
  [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  
  [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  
  [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
  
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDataType;
  }
  
  public static bool SendStringToPrinter(string szPrinterName, string szString) {
    IntPtr hPrinter = IntPtr.Zero;
    DOCINFOA di = new DOCINFOA();
    bool bSuccess = false;
    int dwWritten = 0;
    
    di.pDocName = "ZPL Label";
    di.pDataType = "RAW";
    
    try {
      bool printerOpened = OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero);
      if (!printerOpened) {
        throw new Exception($"OpenPrinter falhou para: {szPrinterName}. Verifique se a impressora existe e está acessível.");
      }
      
      bool docStarted = StartDocPrinter(hPrinter, 1, di);
      if (!docStarted) {
        ClosePrinter(hPrinter);
        throw new Exception("StartDocPrinter falhou. Verifique se a impressora suporta RAW printing.");
      }
      
      bool pageStarted = StartPagePrinter(hPrinter);
      if (!pageStarted) {
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        throw new Exception("StartPagePrinter falhou.");
      }
      
      byte[] bytes = Encoding.UTF8.GetBytes(szString);
      IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
      Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
      bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
      Marshal.FreeCoTaskMem(pUnmanagedBytes);
      
      if (!bSuccess) {
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        throw new Exception($"WritePrinter falhou. Bytes escritos: {dwWritten} de {bytes.Length}");
      }
      
      EndPagePrinter(hPrinter);
      EndDocPrinter(hPrinter);
      ClosePrinter(hPrinter);
    } catch (Exception ex) {
      if (hPrinter != IntPtr.Zero) {
        try {
          ClosePrinter(hPrinter);
        } catch {}
      }
      throw new Exception($"Erro ao imprimir: {ex.Message}");
    }
    
    return bSuccess;
  }
}
"@
  
  Write-Host "INFO: Enviando ZPL para impressora via RAW API..."
  Write-Host "INFO: Tamanho do ZPL: $($zplContent.Length) caracteres"
  Write-Host "INFO: Primeiros 100 caracteres do ZPL: $($zplContent.Substring(0, [Math]::Min(100, $zplContent.Length)))"
  
  try {
    $result = [RawPrinterHelper]::SendStringToPrinter($printerName, $zplContent)
    Write-Host "INFO: SendStringToPrinter retornou: $result"
    
    if ($result) {
      Write-Host "SUCCESS"
      Write-Host "INFO: ZPL enviado com sucesso para a impressora"
      Write-Host "INFO: Verifique se a etiqueta saiu na impressora física"
      exit 0
    } else {
      Write-Host "FAILED: WritePrinter retornou false"
      Write-Host "INFO: A função WritePrinter retornou false. Verifique se a impressora suporta RAW printing."
      Write-Host "INFO: Possíveis causas:"
      Write-Host "   1. Impressora não suporta RAW printing"
      Write-Host "   2. Driver da impressora não está configurado para RAW"
      Write-Host "   3. Impressora não está acessível"
      exit 1
    }
  } catch {
    Write-Host "ERRO ao chamar SendStringToPrinter: $($_.Exception.Message)"
    Write-Host "ERRO Tipo: $($_.Exception.GetType().FullName)"
    if ($_.Exception.InnerException) {
      Write-Host "Inner: $($_.Exception.InnerException.Message)"
    }
    Write-Host "Stack: $($_.Exception.StackTrace)"
    exit 1
  }
} catch {
  Write-Host "ERRO: $($_.Exception.Message)"
  Write-Host "ERRO Tipo: $($_.Exception.GetType().FullName)"
  if ($_.Exception.InnerException) {
    Write-Host "Inner: $($_.Exception.InnerException.Message)"
  }
  Write-Host "Stack: $($_.Exception.StackTrace)"
  exit 1
}
    `
    
    const psScriptFile = path.join(process.cwd(), 'temp', `rawprint_${Date.now()}.ps1`)
    const tempDir = path.dirname(psScriptFile)
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    fs.writeFileSync(psScriptFile, psScript, 'utf8')
    console.log(`📝 [RAW API] Script PowerShell criado: ${psScriptFile}`)
    
    const command = `powershell.exe -ExecutionPolicy Bypass -NoProfile -NonInteractive -WindowStyle Hidden -File "${psScriptFile}"`
    
    try {
      console.log(`🔄 [RAW API] Executando PowerShell script...`)
      console.log(`📝 [RAW API] Nome da impressora: ${printerName}`)
      console.log(`📝 [RAW API] Arquivo ZPL: ${tempFile}`)
      console.log(`📝 [RAW API] Script PowerShell: ${psScriptFile}`)
      
      // Verificar se o arquivo existe antes de executar (não deletar!)
      console.log(`🔍 [RAW API] Verificando arquivo antes de executar PowerShell:`)
      console.log(`   - Arquivo ZPL: ${tempFile}`)
      console.log(`   - Arquivo existe? ${fs.existsSync(tempFile)}`)
      if (fs.existsSync(tempFile)) {
        const stats = fs.statSync(tempFile)
        console.log(`   - Tamanho: ${stats.size} bytes`)
        console.log(`   - Modificado: ${stats.mtime}`)
      } else {
        throw new Error(`Arquivo ZPL não existe antes de executar PowerShell: ${tempFile}`)
      }
      
      // IMPORTANTE: NÃO deletar o arquivo antes do PowerShell acessá-lo!
      if (!fs.existsSync(tempFile)) {
        console.error(`❌ [DEBUG] Arquivo ZPL não existe: ${tempFile}`)
        throw new Error(`Arquivo ZPL não encontrado: ${tempFile}`)
      }
      
      // Verificar tamanho do arquivo
      const fileStats = fs.statSync(tempFile)
      console.log(`📊 [DEBUG] Arquivo ZPL existe: ${tempFile}`)
      console.log(`📊 [DEBUG] Tamanho do arquivo: ${fileStats.size} bytes`)
      
      if (fileStats.size === 0) {
        throw new Error(`Arquivo ZPL está vazio: ${tempFile}`)
      }
      
      // Ler e verificar conteúdo do arquivo
      const fileContent = fs.readFileSync(tempFile, 'utf8')
      console.log(`📊 [DEBUG] Conteúdo do arquivo (primeiros 100 chars): ${fileContent.substring(0, 100)}`)
      console.log(`📊 [DEBUG] Tamanho do conteúdo: ${fileContent.length} caracteres`)
      
      // Aguardar um pouco para garantir que o arquivo foi escrito completamente
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Verificar novamente se o arquivo ainda existe
      if (!fs.existsSync(tempFile)) {
        throw new Error(`Arquivo ZPL foi deletado antes da execução: ${tempFile}`)
      }
      
      // Verificar se o script PowerShell foi criado
      if (!fs.existsSync(psScriptFile)) {
        throw new Error(`Script PowerShell não foi criado: ${psScriptFile}`)
      }
      
      console.log(`🔍 [DEBUG] Tudo pronto para executar PowerShell`)
      console.log(`   - Arquivo ZPL existe: ${fs.existsSync(tempFile)}`)
      console.log(`   - Script PS existe: ${fs.existsSync(psScriptFile)}`)
      console.log(`   - Comando: ${command}`)
      
      const { stdout, stderr } = await execAsync(command, {
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      })
      
      console.log(`📤 [RAW API] stdout: ${stdout || '(vazio)'}`)
      if (stderr && stderr.trim()) {
        console.warn(`⚠️ [RAW API] stderr: ${stderr}`)
      }
      
      const output = (stdout || '').trim()
      const errorOutput = (stderr || '').trim()
      
      // Verificar se há mensagens de erro no stderr
      if (errorOutput && (errorOutput.includes('ERRO') || errorOutput.includes('Exception') || errorOutput.includes('Error'))) {
        throw new Error(`PowerShell retornou erro: ${errorOutput}`)
      }
      
      console.log(`🔍 [DEBUG] Analisando saída do PowerShell:`)
      console.log(`   - stdout completo: "${stdout}"`)
      console.log(`   - stderr completo: "${stderr}"`)
      console.log(`   - output.trim(): "${output}"`)
      console.log(`   - errorOutput.trim(): "${errorOutput}"`)
      
      if (output.includes('SUCCESS')) {
        console.log(`✅ [DEBUG] PowerShell retornou SUCCESS`)
        // Limpar arquivos temporários, mas manter debug
        try {
          fs.unlinkSync(tempFile)
          fs.unlinkSync(psScriptFile)
        } catch {}
        
        console.log(`✅ [RAW API] Etiqueta ${codigoPalete} enviada via Windows RAW API`)
        console.log(`🔍 [DEBUG] Verifique se a etiqueta saiu na impressora física`)
        return NextResponse.json({
          success: true,
          message: `Etiqueta ${codigoPalete} enviada para impressora ${printerName} via RAW API. Verifique a impressora física.`
        })
      } else if (output.includes('FAILED') || output.includes('ERRO')) {
        console.error(`❌ [DEBUG] PowerShell retornou falha`)
        console.error(`❌ [DEBUG] Saída completa: ${output}${errorOutput ? ` | ${errorOutput}` : ''}`)
        throw new Error(`PowerShell retornou falha: ${output}${errorOutput ? ` | ${errorOutput}` : ''}`)
      } else {
        // Se não retornou SUCCESS mas também não deu erro, considerar sucesso
        console.warn(`⚠️ [RAW API] PowerShell não retornou SUCCESS explicitamente, mas não houve erro`)
        console.warn(`⚠️ [DEBUG] Isso pode indicar que a impressão não foi realmente executada`)
        console.warn(`⚠️ [DEBUG] Saída recebida: "${output}"`)
        // Limpar arquivos temporários, mas manter debug
        try {
          fs.unlinkSync(tempFile)
          fs.unlinkSync(psScriptFile)
        } catch {}
        
        console.log(`✅ [RAW API] Etiqueta ${codigoPalete} enviada (assumindo sucesso)`)
        console.log(`🔍 [DEBUG] ATENÇÃO: Verifique se a etiqueta realmente saiu na impressora`)
        return NextResponse.json({
          success: true,
          message: `Etiqueta ${codigoPalete} enviada para impressora ${printerName} via RAW API (assumindo sucesso). Verifique a impressora física.`
        })
      }
    } catch (error: any) {
      // Limpar arquivos
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
        if (fs.existsSync(psScriptFile)) fs.unlinkSync(psScriptFile)
      } catch {}
      
      // Capturar mensagem de erro detalhada
      let errorMessage = 'Erro desconhecido'
      let errorDetails = ''
      
      if (error?.stdout) {
        errorDetails += `stdout: ${error.stdout} | `
      }
      if (error?.stderr) {
        errorDetails += `stderr: ${error.stderr} | `
      }
      if (error?.message) {
        errorMessage = error.message
      }
      if (error?.code) {
        errorDetails += `código: ${error.code}`
      }
      
      const fullErrorMessage = errorDetails ? `${errorMessage} (${errorDetails})` : errorMessage
      
      console.error(`❌ [RAW API] Erro ao executar PowerShell:`)
      console.error(`   Mensagem: ${errorMessage}`)
      console.error(`   Detalhes: ${errorDetails || 'nenhum'}`)
      console.error(`   Erro completo:`, error)
      
      // Tentar ler o script gerado para debug
      try {
        if (fs.existsSync(psScriptFile)) {
          const scriptContent = fs.readFileSync(psScriptFile, 'utf8')
          console.error(`📝 [RAW API] Conteúdo do script (primeiras 500 chars):`, scriptContent.substring(0, 500))
        }
      } catch {}
      
      throw new Error(`Erro ao usar Windows RAW API: ${fullErrorMessage}`)
    }
  } catch (error) {
    throw new Error(`Erro ao usar Windows RAW API: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * MÉTODO 3: Copy /B para porta local (Fallback para portas LPT/COM)
 */
async function printViaLocalPort(printerPort: string, tempFile: string, codigoPalete: string): Promise<NextResponse> {
  try {
    const command = `copy /B "${tempFile}" "${printerPort}"`
    
    await execAsync(command, {
      windowsHide: true,
      timeout: 5000
    })
    
    try {
      fs.unlinkSync(tempFile)
    } catch {}
    
    console.log(`✅ [Local Port] Etiqueta ${codigoPalete} enviada via ${printerPort}`)
    return NextResponse.json({
      success: true,
      message: `Etiqueta ${codigoPalete} enviada para impressora via ${printerPort}`
    })
  } catch (error) {
    throw new Error(`Erro ao copiar para porta local: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * MÉTODO 4: Usar comando print do Windows (Fallback - NÃO RECOMENDADO para ZPL)
 * ATENÇÃO: Este método passa pelo driver da impressora e pode tratar ZPL como texto.
 * Use apenas como último recurso.
 */
async function printViaWindowsPrintCommand(printerName: string, tempFile: string, codigoPalete: string): Promise<NextResponse> {
  try {
    console.log(`🔄 [Print Command] Tentando usar comando print do Windows (último recurso)...`)
    console.warn(`⚠️ [Print Command] ATENÇÃO: Este método pode não funcionar para ZPL, pois passa pelo driver da impressora`)
    
    // Usar o comando print do Windows com /D para especificar a impressora
    const command = `print /D:"${printerName}" "${tempFile}"`
    
    await execAsync(command, {
      windowsHide: true,
      timeout: 10000
    })
    
    try {
      fs.unlinkSync(tempFile)
    } catch {}
    
    console.warn(`⚠️ [Print Command] Comando executado, mas ZPL pode ser tratado como texto pelo driver`)
    return NextResponse.json({
      success: true,
      message: `Etiqueta ${codigoPalete} enviada para impressora ${printerName} via comando print. ATENÇÃO: Se a etiqueta não sair corretamente, o driver pode estar tratando ZPL como texto. Configure a impressora para modo RAW.`
    })
  } catch (error) {
    throw new Error(`Erro ao usar comando print: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Função principal de impressão
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      codigoPalete,
      quantidadeNFs,
      totalVolumes,
      destino,
      posicoes,
      quantidadePaletes,
      codigoCarga,
      idWMS,
      printerName
    } = body

    if (!codigoPalete) {
      return NextResponse.json(
        { success: false, message: 'Código do palete é obrigatório' },
        { status: 400 }
      )
    }

    if (!printerName) {
      return NextResponse.json(
        { success: false, message: 'Nome da impressora é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se está rodando no Vercel
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined
    
    if (isVercel) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Impressão local não está disponível no Vercel. Use o serviço intermediário ou Zebra Browser Print.'
        },
        { status: 503 }
      )
    }

    // Gerar ZPL
    const dadosEtiqueta: DadosEtiqueta = {
      quantidadeNFs: quantidadeNFs || 0,
      totalVolumes: totalVolumes || 0,
      destino: destino || '',
      posicoes: posicoes || null,
      quantidadePaletes: quantidadePaletes || null,
      codigoCarga: codigoCarga || undefined,
      idWMS: idWMS || undefined
    }

    const zpl = gerarZPL(codigoPalete, dadosEtiqueta)
    console.log(`🖨️ [API Local] Imprimindo ${codigoPalete} na impressora: ${printerName}`)
    console.log(`📄 [API Local] ZPL gerado (${zpl.length} caracteres)`)
    console.log(`📋 [DEBUG] Primeiros 200 caracteres do ZPL:`, zpl.substring(0, 200))
    console.log(`📋 [DEBUG] Últimos 50 caracteres do ZPL:`, zpl.substring(zpl.length - 50))

    // Detectar sistema operacional
    const platform = process.platform

    if (platform === 'win32') {
      // Criar arquivo temporário
      const tempDir = path.join(process.cwd(), 'temp')
      
      // Garantir que o diretório existe ANTES de criar arquivos
      if (!fs.existsSync(tempDir)) {
        console.log(`📁 [DEBUG] Criando diretório temp: ${tempDir}`)
        fs.mkdirSync(tempDir, { recursive: true })
      }
      
      // Verificar novamente após criar
      if (!fs.existsSync(tempDir)) {
        throw new Error(`Não foi possível criar diretório temp: ${tempDir}`)
      }
      
      console.log(`✅ [DEBUG] Diretório temp existe: ${tempDir}`)
      
      const tempFile = path.join(tempDir, `zpl_${Date.now()}.zpl`)
      console.log(`📝 [DEBUG] Criando arquivo ZPL: ${tempFile}`)
      fs.writeFileSync(tempFile, zpl, 'utf8')
      
      // Verificar se o arquivo foi criado
      if (!fs.existsSync(tempFile)) {
        throw new Error(`Arquivo ZPL não foi criado: ${tempFile}`)
      }
      
      console.log(`✅ [DEBUG] Arquivo ZPL criado com sucesso: ${tempFile}`)
      
      // DEBUG: Criar arquivo de debug com informações detalhadas
      const debugFile = path.join(tempDir, `debug_${Date.now()}.txt`)
      const debugInfo = `
=== DEBUG DE IMPRESSÃO ===
Data/Hora: ${new Date().toISOString()}
Código Palete: ${codigoPalete}
Impressora: ${printerName}
Tamanho ZPL: ${zpl.length} caracteres
Arquivo ZPL: ${tempFile}
ZPL Completo:
${zpl}
=== FIM DEBUG ===
      `
      fs.writeFileSync(debugFile, debugInfo, 'utf8')
      console.log(`🔍 [DEBUG] Arquivo de debug criado: ${debugFile}`)
      console.log(`📁 [DEBUG] Arquivo ZPL criado: ${tempFile}`)
      
      // Verificar se o arquivo foi criado corretamente
      if (fs.existsSync(tempFile)) {
        const fileStats = fs.statSync(tempFile)
        const fileContent = fs.readFileSync(tempFile, 'utf8')
        console.log(`✅ [DEBUG] Arquivo ZPL existe: ${tempFile}`)
        console.log(`📊 [DEBUG] Tamanho do arquivo: ${fileStats.size} bytes`)
        console.log(`📊 [DEBUG] Conteúdo do arquivo (primeiros 200 chars): ${fileContent.substring(0, 200)}`)
        if (fileContent.length !== zpl.length) {
          console.error(`❌ [DEBUG] ERRO: Tamanho do arquivo (${fileContent.length}) diferente do ZPL original (${zpl.length})`)
        }
      } else {
        console.error(`❌ [DEBUG] ERRO: Arquivo ZPL não foi criado!`)
      }
      
      try {
        // ESTRATÉGIA DE IMPRESSÃO (em ordem de preferência):
        
        // 1. Tentar RAW TCP se a impressora tiver IP configurado
        console.log(`🔍 [DEBUG] Obtendo informações da impressora: ${printerName}`)
        const printerPort = await getPrinterPort(printerName)
        console.log(`🔍 [API Local] Porta da impressora: ${printerPort || 'não encontrada'}`)
        
        // DEBUG: Listar todas as impressoras disponíveis
        try {
          const listPrintersCommand = `powershell -Command "Get-Printer | Select-Object Name, PortName, DriverName | ConvertTo-Json"`
          const { stdout: printersList } = await execAsync(listPrintersCommand, {
            windowsHide: true,
            timeout: 5000
          })
          console.log(`🔍 [DEBUG] Impressoras disponíveis no sistema:`)
          console.log(printersList)
        } catch (err) {
          console.warn(`⚠️ [DEBUG] Não foi possível listar impressoras:`, err)
        }
        
        if (printerPort) {
          const printerIP = extractIPFromPort(printerPort)
          
          if (printerIP) {
            console.log(`🌐 [API Local] IP detectado: ${printerIP}`)
            console.log(`🔄 [API Local] Tentando RAW TCP...`)
            try {
              return await printViaRawTCP(printerIP, zpl, codigoPalete)
            } catch (tcpError) {
              console.warn(`⚠️ [API Local] RAW TCP falhou:`, tcpError instanceof Error ? tcpError.message : String(tcpError))
              console.log(`🔄 [API Local] Tentando Windows RAW API...`)
            }
          } else if (printerPort.startsWith('LPT') || printerPort.startsWith('COM')) {
            // Porta local (LPT/COM) - usar copy /B
            console.log(`🔄 [API Local] Porta local detectada, usando copy /B...`)
            try {
              return await printViaLocalPort(printerPort, tempFile, codigoPalete)
            } catch (localError) {
              console.warn(`⚠️ [API Local] Copy /B falhou:`, localError instanceof Error ? localError.message : String(localError))
            }
          }
        }
        
        // 2. Usar Windows RAW API PRIMEIRO (método mais confiável para RAW data)
        console.log(`🔄 [API Local] Tentando Windows RAW API (método RAW - PRIORIDADE)...`)
        console.log(`🔍 [DEBUG] Antes de chamar printViaWindowsRawAPI:`)
        console.log(`   - Nome impressora: ${printerName}`)
        console.log(`   - Arquivo ZPL: ${tempFile}`)
        console.log(`   - Tamanho ZPL: ${zpl.length} caracteres`)
        console.log(`   - Arquivo existe: ${fs.existsSync(tempFile)}`)
        
        try {
          const result = await printViaWindowsRawAPI(printerName, zpl, codigoPalete, tempFile)
          console.log(`✅ [DEBUG] printViaWindowsRawAPI retornou sucesso`)
          console.log(`📋 [DEBUG] Resultado:`, JSON.stringify(result))
          return result
        } catch (rawApiError) {
          const errorMsg = rawApiError instanceof Error ? rawApiError.message : String(rawApiError)
          console.error(`❌ [API Local] Windows RAW API falhou:`, errorMsg)
          console.error(`❌ [DEBUG] Erro completo:`, rawApiError)
          console.error(`❌ [DEBUG] Stack trace:`, rawApiError instanceof Error ? rawApiError.stack : 'N/A')
          console.log(`🔄 [API Local] Tentando copy /B como fallback...`)
          
          // 3. Fallback: Tentar copy /B apenas para portas LPT/COM ou não-TCP
          if (printerPort && (printerPort.startsWith('LPT') || printerPort.startsWith('COM'))) {
            try {
              console.log(`🔄 [API Local] Tentando copy /B para porta local (LPT/COM)...`)
              return await printViaLocalPort(printerPort, tempFile, codigoPalete)
            } catch (localError) {
              console.warn(`⚠️ [API Local] Copy /B para porta local falhou:`, localError instanceof Error ? localError.message : String(localError))
            }
          } else if (printerPort && !printerPort.includes('TCP') && !printerPort.includes('IP_')) {
            try {
              console.log(`🔄 [API Local] Tentando copy /B para porta não-TCP...`)
              return await printViaCopyToPrinterPort(printerName, tempFile, codigoPalete)
            } catch (copyError) {
              console.warn(`⚠️ [API Local] Copy /B falhou:`, copyError instanceof Error ? copyError.message : String(copyError))
            }
          }
          
          // Se tudo falhou, retornar erro detalhado
          console.error(`❌ [DEBUG] Todos os métodos falharam`)
          
          // Não deletar arquivos de debug em caso de erro
          console.log(`🔍 [DEBUG] Arquivos de debug mantidos para inspeção:`)
          console.log(`   - ZPL: ${tempFile}`)
          console.log(`   - Debug: ${debugFile}`)
          console.log(`   - Script PowerShell: ${path.join(tempDir, `rawprint_*.ps1`)}`)
          
          // Retornar erro detalhado
          return NextResponse.json(
            {
              success: false,
              message: `Não foi possível imprimir. Windows RAW API falhou: ${errorMsg}. Verifique os logs do servidor e os arquivos de debug em ${tempDir}.`,
              error: errorMsg,
              debugFiles: {
                zpl: tempFile,
                debug: debugFile,
                tempDir: tempDir
              }
            },
            { status: 500 }
          )
        }
      } catch (error) {
        // Limpar arquivo temporário em caso de erro
        try {
          fs.unlinkSync(tempFile)
        } catch {}
        throw error
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Sistema operacional não suportado. Apenas Windows é suportado.' },
        { status: 501 }
      )
    }
  } catch (error) {
    console.error('❌ [API Local] Erro geral:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido ao imprimir'
      },
      { status: 500 }
    )
  }
}
