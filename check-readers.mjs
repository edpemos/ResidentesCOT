import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDvROFQfv_YfA9lO5iz_hV9d_dsCDprf60",
  authDomain: "residentescothsjda.firebaseapp.com",
  projectId: "residentescothsjda",
  storageBucket: "residentescothsjda.firebasestorage.app",
  messagingSenderId: "710025797602",
  appId: "1:710025797602:web:763ee283df7aba22f663bb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

import { getDoc, doc } from 'firebase/firestore';

async function check() {
  try {
    const email = 'marianogarciaborbolla@gmail.com';
    const docRef = doc(db, 'readers', email);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.log('Reader found:', snap.id, JSON.stringify(snap.data()));
    } else {
      console.log('Reader not found:', email);
    }
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

check();
