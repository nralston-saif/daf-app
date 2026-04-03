import * as XLSX from 'xlsx'

/**
 * Convert an Excel file (ArrayBuffer) to CSV text.
 * Uses the first sheet in the workbook.
 * Dates are formatted as MM/DD/YYYY to match the expected CSV format.
 */
export function xlsxToCsv(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_csv(firstSheet, { dateNF: 'MM/DD/YYYY' })
}
