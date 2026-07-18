import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
/* const firebaseConfig = {
    apiKey: "AIzaSyA8O822G8v4LlsSZq3wR3Qjj6zj-D_uA9c",
    authDomain: "agrovista-id.firebaseapp.com",
    projectId: "agrovista-id",
    storageBucket: "agrovista-id.firebasestorage.app",
     messagingSenderId: "945770628537",
     appId: "1:945770628537:web:7485fc8f6471b67f0f2268",
    measurementId: "G-XSBBRVQEYY"
}; */

const firebaseConfig = {
    apiKey: "AIzaSyCpKf5Sqo-iw047sg2-iTxe--wXu-SFUr4",
    authDomain: "agrovista-test.firebaseapp.com",
    projectId: "agrovista-test",
    storageBucket: "agrovista-test.firebasestorage.app",
     messagingSenderId: "15019553962",
    appId: "1:15019553962:web:59c6093e770057e76fccd3",
    measurementId: "G-EYQ2LHZ9T0"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Persistence disabled for diagnostic purposes
/*
if (typeof window !== 'undefined') {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore persistence not supported in this browser');
        }
    });
}
*/



export default app;
