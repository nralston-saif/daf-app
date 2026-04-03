import * as XLSX from 'xlsx'

/**
 * Convert an Excel file (ArrayBuffer) to CSV text.
 * Uses the first sheet in the workbook.
 */
export function xlsxToCsv(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_csv(firstSheet)
}
