import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converte data do formato brasileiro (dd/MM/yyyy) para formato ISO (yyyy-MM-dd)
 * @param data - Data no formato brasileiro ou ISO
 * @returns Data no formato ISO
 */
export function convertDateToISO(data: string): string {
  if (!data) return data
  
  // Se já estiver no formato ISO, retornar como está
  if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return data
  }
  
  // Se estiver no formato brasileiro, converter
  if (data.includes('/')) {
    const [dia, mes, ano] = data.split('/')
    if (dia && mes && ano) {
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
    }
  }
  
  // Se não conseguir converter, retornar como está
  console.warn('⚠️ Formato de data não reconhecido:', data)
  return data
}

/**
 * Converte data do formato ISO (yyyy-MM-dd) para formato brasileiro (dd/MM/yyyy)
 * @param data - Data no formato ISO
 * @returns Data no formato brasileiro
 */
export function convertDateToBR(data: string): string {
  if (!data) return data
  
  // Se estiver no formato ISO, converter para brasileiro
  if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }
  
  // Se já estiver no formato brasileiro, retornar como está
  if (data.includes('/')) {
    return data
  }
  
  // Se não conseguir converter, retornar como está
  console.warn('⚠️ Formato de data não reconhecido para conversão BR:', data)
  return data
}
