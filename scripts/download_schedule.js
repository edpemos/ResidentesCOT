import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

// NOTA DE SEGURIDAD: Nunca guardamos credenciales en texto plano en el repositorio.
// Las cargamos desde variables de entorno. Para probarlo localmente puedes hacer:
// export GUARDISCOPIO_EMAIL="tu_email" && export GUARDISCOPIO_PASSWORD="tu_pass"
const email = process.env.GUARDISCOPIO_EMAIL;
const password = process.env.GUARDISCOPIO_PASSWORD;

async function run() {
  if (!email || !password) {
    console.error('❌ Error: Falta configurar GUARDISCOPIO_EMAIL o GUARDISCOPIO_PASSWORD en las variables de entorno.');
    process.exit(1);
  }

  console.log('🤖 Iniciando navegador...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('🌐 Navegando a la página de login de Guardiscopio...');
    await page.goto('https://www.guardiscopio.com/login/', { waitUntil: 'domcontentloaded' });

    console.log('⏳ Esperando a que carguen los campos...');
    await page.waitForSelector('input[placeholder="ejemplo@mail.com"], input[type="email"], input[name="email"]', { timeout: 10000 });

    console.log('✍️ Rellenando credenciales...');
    await page.fill('input[placeholder="ejemplo@mail.com"], input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);

    console.log('🔑 Enviando formulario...');
    const loginButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Iniciar sesión"), button:has-text("Entrar")');
    
    await loginButton.first().click();

    console.log('⏳ Esperando redirección al grupo...');
    try {
      // Intentamos esperar la redirección automática al grupo por 15 segundos
      await page.waitForURL('**/group/**', { timeout: 15000 });
      console.log('✅ Redirigido automáticamente al grupo.');
    } catch (e) {
      console.log('⚠️ Redirección automática no detectada. Forzando navegación manual...');
      // Usamos waitUntil: 'commit' para que responda instantáneamente en cuanto el servidor devuelva el primer byte
      await page.goto('https://www.guardiscopio.com/group/', { waitUntil: 'commit', timeout: 15000 }).catch(() => {});
    }

    // Esperamos a que el spinner de carga de la tabla desaparezca para que los botones sean interactivos
    console.log('⏳ Aceptando el aviso de cookies...');
    const cookieBtn = page.locator('button:has-text("Estoy de acuerdo"), a:has-text("Estoy de acuerdo")');
    if (await cookieBtn.count() > 0) {
      await cookieBtn.first().click();
      console.log('✅ Cookies aceptadas.');
    }

    console.log('⏳ Esperando a que carguen los datos de la planificación (15s)...');
    await page.waitForTimeout(15000); 

    try {
      const loadedScreenshot = path.resolve('./group_loaded.png');
      await page.screenshot({ path: loadedScreenshot });
      console.log(`📸 Captura de la página cargada guardada en: ${loadedScreenshot}`);
    } catch (e) {
      console.error('No se pudo tomar la captura de pantalla cargada:', e);
    }

    // Directorio donde guardaremos los archivos Excel descargados
    const downloadDir = path.resolve('./downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Vamos a procesar 3 meses: el actual y los 2 siguientes
    for (let i = 0; i < 3; i++) {
      console.log(`\n📅 Procesando mes ${i + 1} de 3...`);

      if (i > 0) {
        console.log('➡️ Navegando al siguiente mes...');
        const nextMonthBtn = page.locator('button:has-text("Siguiente"), button:has-text(">"), .next-month, [aria-label*="siguiente" i], [class*="next" i]');
        if (await nextMonthBtn.count() > 0) {
          await nextMonthBtn.first().click();
          // Esperamos 3 segundos para que se renderice la nueva tabla
          await page.waitForTimeout(3000);
        } else {
          console.warn('⚠️ No se ha encontrado un botón obvio para avanzar de mes. Es posible que el selector necesite afinarse.');
        }
      }

      console.log('📥 Intentando exportar tabla a Excel...');
      // Buscamos el botón de exportación a Excel
      const exportButton = page.locator('button:has-text("Excel"), a:has-text("Excel"), button:has-text("Exportar"), a:has-text("Exportar"), .btn-excel, .export-excel');

      if (await exportButton.count() > 0) {
        // Escuchamos el evento de descarga que iniciará al hacer clic
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          exportButton.first().click()
        ]);

        const date = new Date();
        date.setMonth(date.getMonth() + i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        const filename = `planificacion_${year}_${month}.xlsx`;
        const filepath = path.join(downloadDir, filename);

        await download.saveAs(filepath);
        console.log(`💾 Archivo guardado correctamente en: ${filepath}`);
      } else {
        console.error('❌ No se ha encontrado el botón de exportar a Excel en esta página.');
      }
    }

    console.log('\n🎉 Proceso finalizado con éxito.');

  } catch (error) {
    console.error('❌ Ocurrió un error durante la ejecución del script:', error);
    // Hacemos una captura de pantalla en caso de error para facilitar el debug
    try {
      const errorScreenshot = path.resolve('./error_screenshot.png');
      await page.screenshot({ path: errorScreenshot });
      console.log(`📸 Captura de pantalla de error guardada en: ${errorScreenshot}`);
    } catch (e) {
      console.error('No se pudo tomar la captura de pantalla de error:', e);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
