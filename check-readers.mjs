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

async function check() {
  try {
    const snap = await getDocs(collection(db, 'readers'));
    console.log('Readers count:', snap.size);
    snap.forEach(d => {
      console.log(' - Reader:', d.id, JSON.stringify(d.data()));
    });
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

check();
