/**
 * diagnose_shift.mjs
 * Herramienta de diagnóstico para inspeccionar el valor RAW de una celda
 * del Excel de planificación para un nombre y fecha específicos.
 *
 * Uso:
 *   node scripts/diagnose_shift.mjs <ruta_al_excel.xlsx> <nombre_parcial> <fecha_dd/mm>
 *
 * Ejemplo:
 *   node scripts/diagnose_shift.mjs downloads/planificacion_2026_08.xlsx baquero 10/08
 */

import xlsx from 'xlsx';
import fs from 'fs';

const [,, filePath, searchName, searchDate] = process.argv;

if (!filePath || !searchName || !searchDate) {
  console.error('Uso: node scripts/diagnose_shift.mjs <ruta_excel.xlsx> <nombre_parcial> <fecha_dd/mm>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ Archivo no encontrado: ${filePath}`);
  process.exit(1);
}

const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

// 1. Encontrar la fila cabecera con fechas
let headerRowIndex = -1;
for (let r = 0; r < data.length; r++) {
  if (data[r].some(cell => typeof cell === 'string' && /^\d{2}\/\d{2}/.test(cell))) {
    headerRowIndex = r;
    break;
  }
}

if (headerRowIndex === -1) {
  console.error('❌ No se encontró la fila de cabecera con fechas.');
  process.exit(1);
}

const headerRow = data[headerRowIndex];

// 2. Encontrar la columna de la fecha buscada
const targetDateCol = headerRow.findIndex(cell =>
  typeof cell === 'string' && cell.startsWith(searchDate)
);

if (targetDateCol === -1) {
  console.error(`❌ No se encontró la fecha "${searchDate}" en la cabecera.`);
  console.log('   Fechas disponibles:', headerRow.filter(c => typeof c === 'string' && /^\d{2}\/\d{2}/.test(c)).join(', '));
  process.exit(1);
}

console.log(`\n✅ Fecha "${searchDate}" encontrada en columna ${targetDateCol} (valor cabecera: "${headerRow[targetDateCol]}")\n`);

// 3. Buscar filas que contengan el nombre parcial
const nameLower = searchName.toLowerCase();
const matches = [];

for (let r = headerRowIndex + 1; r < data.length; r++) {
  const row = data[r];
  const name = row[1];
  if (!name || typeof name !== 'string') continue;
  if (name.toLowerCase().includes(nameLower)) {
    const rawValue = row[targetDateCol];
    const rawType = typeof rawValue;
    const rawStr = rawValue !== undefined && rawValue !== null ? String(rawValue) : '(vacío)';
    const trimmed = rawStr.trim();
    const charCodes = [...trimmed].map(c => c.charCodeAt(0));

    matches.push({
      fila: r + 1,
      nombre: name,
      raw: rawValue,
      tipo: rawType,
      string: rawStr,
      trimmed,
      charCodes,
      longitud: trimmed.length
    });
  }
}

if (matches.length === 0) {
  console.log(`⚠️  No se encontró ninguna fila con el nombre que contenga "${searchName}".`);
  process.exit(0);
}

for (const m of matches) {
  console.log('═══════════════════════════════════════════');
  console.log(`👤 Nombre en Excel  : "${m.nombre}" (fila ${m.fila})`);
  console.log(`📦 Valor RAW        : ${JSON.stringify(m.raw)} (tipo JS: ${m.tipo})`);
  console.log(`📝 String completo  : "${m.string}"`);
  console.log(`✂️  Trimmed          : "${m.trimmed}" (${m.longitud} caracteres)`);
  console.log(`🔢 Char codes       : [${m.charCodes.join(', ')}]`);

  // Clasificación que haría el script
  const raw = m.trimmed;
  let status = raw;
  if      (raw === 'QMU')                              status = '→ Diferida Mañana';
  else if (raw === 'QMT')                              status = '→ Diferida Tarde';
  else if (raw === 'CM' || raw === 'CT' ||
           raw.startsWith('CM') || raw.startsWith('CT')) status = '→ Consulta';
  else if (raw.startsWith('QM'))                       status = '→ Quirófano Mañana';
  else if (raw.startsWith('QT'))                       status = '→ Quirófano Tarde';
  else if (raw === 'PLA')                              status = '→ Planta';
  else if (raw === 'Ges')                              status = '→ Gestión';
  else if (raw === 'Cur' || raw === 'C')               status = '→ Curso/Congreso';
  else if (raw === 'GPF' || raw === 'G')               status = '→ De Guardia';
  else if (raw === 'GLO')                              status = '→ Localizado';

  console.log(`🏷️  Status asignado  : ${status}`);
  console.log('═══════════════════════════════════════════\n');
}
