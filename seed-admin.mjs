// Script para crear el documento de configuración de administrador en Firestore
// Uso: node seed-admin.mjs

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as readline from 'readline';

const firebaseConfig = {
  apiKey: "AIzaSyDvROFQfv_YfA9lO5iz_hV9d_dsCDprf60",
  authDomain: "residentescothsjda.firebaseapp.com",
  projectId: "residentescothsjda",
  storageBucket: "residentescothsjda.firebasestorage.app",
  messagingSenderId: "710025797602",
  appId: "1:710025797602:web:763ee283df7aba22f663bb"
};

const ADMIN_EMAIL = 'edpemos@gmail.com';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question(`Contraseña de Firebase para ${ADMIN_EMAIL}: `, async (password) => {
  rl.close();
  try {
    console.log('Iniciando sesión...');
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
    console.log('✓ Sesión iniciada');

    console.log('Escribiendo configuración en Firestore...');
    await setDoc(doc(db, 'config', 'settings'), { adminEmails: [ADMIN_EMAIL] });
    console.log(`✓ Hecho! "${ADMIN_EMAIL}" es ahora administrador.`);
    console.log('Puedes cerrar esta ventana y recargar la app.');
  } catch (err) {
    console.error('Error:', err.message);
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      console.log('→ Contraseña incorrecta. Inténtalo de nuevo.');
    } else if (err.code === 'permission-denied') {
      console.log('→ Reglas de Firestore bloqueando. Actualiza las reglas en Firebase Console:');
      console.log('   Firebase Console → Firestore → Rules → pega: allow read, write: if request.auth != null;');
    }
  }
  process.exit(0);
});
