import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA8O822G8v4LlsSZq3wR3Qjj6zj-D_uA9c",
  authDomain: "agrovista-id.firebaseapp.com",
  projectId: "agrovista-id",
  storageBucket: "agrovista-id.appspot.com",
  messagingSenderId: "945770628537",
  appId: "1:945770628537:web:7485fc8f6471b67f0f2268"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collections = ['users', 'entities', 'transactions', 'fin_applications', 'establishments', 'plots', 'trials', 'applications', 'events', 'custom_products'];

async function exportData() {
  console.log("--- INICIO DE EXPORTACIÓN ---");
  for (const name of collections) {
    try {
      const q = query(collection(db, name), limit(2));
      const snapshot = await getDocs(q);
      console.log(`COLECCIÓN: ${name}`);
      if (snapshot.empty) {
        console.log("  (Vacía o sin permisos)");
      } else {
        snapshot.forEach(doc => {
          console.log(`  ID: ${doc.id}`);
          console.log(`  DATA: ${JSON.stringify(doc.data(), null, 2)}`);
        });
      }
    } catch (err) {
      console.log(`COLECCIÓN: ${name} -> ERROR: ${err.message}`);
    }
    console.log("----------------------------");
  }
}

exportData().then(() => process.exit(0));
