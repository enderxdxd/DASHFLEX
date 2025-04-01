import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCtMwzWiPm5ppMSI3rPURkkGlPkO6bZxQs",
  authDomain: "chatpos-aff1a.firebaseapp.com",
  projectId: "chatpos-aff1a",
  storageBucket: "chatpos-aff1a.appspot.com",
  messagingSenderId: "840413567529",
  appId: "1:840413567529:web:f8e90d05d3c80a4e989a38",
  measurementId: "G-J82TTSP270"
};

// Inicializa o Firebase apenas uma vez
const app = initializeApp(firebaseConfig);

// Exporta os serviços
export const auth = getAuth(app); // Autenticação
export const db = getFirestore(app); // Firestore
export const storage = getStorage(app); // Storage

