import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";
// Cargar variables de entorno desde el archivo .env
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
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
