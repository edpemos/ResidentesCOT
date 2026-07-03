import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

// 1. Inicializar Firebase Admin de forma segura con la clave de servicio
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountKey) {
  console.error('❌ Error: Falta configurar FIREBASE_SERVICE_ACCOUNT en los secretos de GitHub.');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(serviceAccountKey);
  
  // DIAGNÓSTICO SEGURO (sin comprometer la clave)
  console.log('--- DIAGNÓSTICO DE CREDENCIALES ---');
  console.log('Project ID:', serviceAccount.project_id);
  if (serviceAccount.private_key) {
    const pKey = serviceAccount.private_key;
    console.log('Key length:', pKey.length);
    console.log('Starts with BEGIN tag:', pKey.startsWith('-----BEGIN PRIVATE KEY-----'));
    console.log('Ends with END tag:', pKey.trim().endsWith('-----END PRIVATE KEY-----'));
    console.log('Has raw newlines:', pKey.includes('\n'));
    console.log('Has escaped newlines (\\\\n):', pKey.includes('\\n'));
    console.log('First 40 chars:', pKey.substring(0, 40));
    console.log('Last 40 chars:', pKey.substring(pKey.length - 40));
  } else {
    console.log('private_key is empty or undefined!');
  }
  console.log('-----------------------------------');

  if (serviceAccount.private_key) {
    // Reemplazar tanto \\n como saltos de línea literales mal codificados si los hubiera
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (e) {
  console.error('❌ Error al inicializar Firebase Admin:', e);
  process.exit(1);
}

const db = getFirestore();

// Mapeo de códigos de celdas a estados legibles para la App
const SHIFT_MAP = {
  'GLO': 'Localizado',
  'GPF': 'De Guardia',
  'G': 'De Guardia',
  'M': 'Mañana',
  'T': 'Tarde',
  'R': 'Refuerzo',
  'C': 'Curso/Congreso',
  'V': 'Vacaciones',
};

async function parseAndUpload() {
  const downloadDir = path.resolve('./downloads');
  
  if (!fs.existsSync(downloadDir)) {
    console.log('⚠️ No se ha encontrado el directorio de descargas downloads/. Nada que procesar.');
    return;
  }

  const files = fs.readdirSync(downloadDir).filter(f => f.endsWith('.xlsx'));
  
  if (files.length === 0) {
    console.log('⚠️ No hay archivos Excel (.xlsx) en el directorio downloads/.');
    return;
  }

  console.log(`📂 Encontrados ${files.length} archivos para procesar.`);

  for (const file of files) {
    const filePath = path.join(downloadDir, file);
    console.log(`\n📄 Procesando archivo: ${file}...`);

    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Procesamos la primera pestaña
      const sheet = workbook.Sheets[sheetName];

      // Convertimos la hoja a una matriz bidimensional (filas y columnas)
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      if (data.length === 0) {
        console.warn(`⚠️ El archivo ${file} está vacío.`);
        continue;
      }

      // 1. Buscar la fila cabecera que contiene las fechas
      let headerRowIndex = -1;
      for (let r = 0; r < data.length; r++) {
        const row = data[r];
        const hasDates = row.some(cell => typeof cell === 'string' && /^\d{2}\/\d{2}/.test(cell));
        if (hasDates) {
          headerRowIndex = r;
          break;
        }
      }

      if (headerRowIndex === -1) {
        console.error(`❌ No se encontró la fila de cabecera con fechas en el archivo ${file}.`);
        continue;
      }

      const headerRow = data[headerRowIndex];
      console.log(`📌 Cabecera encontrada en fila ${headerRowIndex + 1}.`);

      // 2. Extraer las fechas y sus índices de columna correspondientes
      const dateColumns = []; // { colIndex, dateStr }
      headerRow.forEach((cell, colIndex) => {
        if (typeof cell === 'string' && /^\d{2}\/\d{2}/.test(cell)) {
          dateColumns.push({ colIndex, dateStr: cell });
        }
      });

      console.log(`📅 Detectados ${dateColumns.length} días de planificación.`);

      // Tratamos de deducir el año del nombre del archivo (ej. planificacion_2026_07.xlsx)
      let year = new Date().getFullYear();
      const yearMatch = file.match(/_(\d{4})_/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }

      // Estructura temporal para agrupar por fecha
      const scheduleByDate = {};

      // 3. Procesar las filas de los médicos (todas las siguientes a la cabecera)
      for (let r = headerRowIndex + 1; r < data.length; r++) {
        const row = data[r];
        if (!row || row.length === 0) continue;

        // El nombre está en la columna 1 (B) debido a que la columna 0 (A) está vacía en este formato de Excel
        const name = row[1];
        if (!name || typeof name !== 'string' || name.trim() === '' || name.includes('Total') || name.includes('Sanitarios') || name.includes('Puestos')) {
          continue; // Saltamos filas vacías, totales o la propia leyenda
        }

        const sanitizedName = name.trim();
        const identityId = row[2] ? String(row[2]).trim() : ''; // Columna 2 (C): número de identidad
        let unit = row[4] ? String(row[4]).trim() : ''; // Columna 4 (E): unidad a la que pertenecen (Especialidad)

        // Reglas de reasignación de Unidades:
        // Jose Maria Perez -> Trauma, Veronica -> Trauma, Miembro Superior -> vacío/eliminado
        const lowerName = sanitizedName.toLowerCase();
        if ((lowerName.includes('perez') || lowerName.includes('pérez')) && 
            (lowerName.includes('jose') || lowerName.includes('josé')) && 
            (lowerName.includes('maria') || lowerName.includes('maría'))) {
          unit = 'Trauma';
        } else if (lowerName.includes('veronica') || lowerName.includes('verónica')) {
          unit = 'Trauma';
        } else if (unit === 'Miembro Superior') {
          unit = '';
        }

        // Comprobar si tiene alguna actividad en todo el mes (si todos los días están vacíos)
        let hasAnyActivity = false;
        dateColumns.forEach(({ colIndex }) => {
          const shiftVal = row[colIndex] ? String(row[colIndex]).trim() : '';
          if (shiftVal !== '') {
            hasAnyActivity = true;
          }
        });

        // "Quita los duplicados que no tengan actividad": si no tiene actividad, se ignora por completo
        if (!hasAnyActivity) {
          console.log(`ℹ️ Ignorando a ${sanitizedName} (Sin actividad en este cuadrante).`);
          continue;
        }

        // Para cada fecha detectada en la cabecera, leemos el turno de esta fila
        dateColumns.forEach(({ colIndex, dateStr }) => {
          const [dayStr, monthStr] = dateStr.split('/');
          const formattedDate = `${year}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;

          const rawShift = row[colIndex] ? String(row[colIndex]).trim() : '';
          
          // Si el turno está vacío, no lo guardamos
          if (rawShift === '') return;

          // Separar turnos combinados por el caracter '+'
          const shiftParts = rawShift.split('+').map(p => p.trim()).filter(Boolean);

          shiftParts.forEach(shiftPart => {
            let status = SHIFT_MAP[shiftPart] || shiftPart;
            
            // Deducir estado general del hospital de forma exacta para cada sub-turno
            if (shiftPart === 'QMU') {
              status = 'Diferida Mañana';
            } else if (shiftPart === 'QTU') {
              status = 'Diferida Tarde';
            } else if (shiftPart === 'CM' || shiftPart.startsWith('CM')) {
              status = 'Consulta Mañana';
            } else if (shiftPart === 'CT' || shiftPart.startsWith('CT')) {
              status = 'Consulta Tarde';
            } else if (shiftPart.startsWith('QM')) {
              status = 'Quirófano Mañana';
            } else if (shiftPart.startsWith('QT')) {
              status = 'Quirófano Tarde';
            } else if (shiftPart === 'PLA') {
              status = 'Planta';
            } else if (shiftPart === 'Ges') {
              status = 'Gestión';
            } else if (shiftPart === 'Cur' || shiftPart === 'C') {
              status = 'Curso/Congreso';
            }

            if (!scheduleByDate[formattedDate]) {
              scheduleByDate[formattedDate] = [];
            }

            scheduleByDate[formattedDate].push({
              name: sanitizedName,
              identityId: identityId, // Oculto detrás de la interfaz, pero almacenado en DB
              unit: unit,             // Unidad a la que pertenecen
              shift: shiftPart,
              status: status
            });
          });
        });
      }

      // 4. Subir la información agrupada a Firestore
      console.log('☁️ Subiendo planificaciones a Cloud Firestore...');
      const batch = db.batch();
      
      for (const [dateKey, scheduleList] of Object.entries(scheduleByDate)) {
        const [y, m, d] = dateKey.split('-').map(Number);
        
        const docRef = db.collection('attendingSchedule').doc(dateKey);
        batch.set(docRef, {
          date: dateKey,
          year: y,
          month: m,
          day: d,
          lastUpdated: FieldValue.serverTimestamp(),
          schedule: scheduleList
        }, { merge: true });
      }

      await batch.commit();
      console.log(`✅ Archivo ${file} procesado y subido correctamente.`);

    } catch (error) {
      console.error(`❌ Error al procesar el archivo ${file}:`, error);
    }
  }
}

parseAndUpload().then(() => {
  console.log('\n🌟 Carga completada.');
  process.exit(0);
});
