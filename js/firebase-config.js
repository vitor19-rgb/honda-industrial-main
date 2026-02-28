// js/firebase-config.js

// 1. Importar as ferramentas do Firebase (Versão Modular V9 via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. As Tuas Chaves Oficiais do Projeto "Sistema Honda"
const firebaseConfig = {
  apiKey: "AIzaSyCVeWVpT_iKbd251rJ8oGDZoWJgRCIfs5I",
  authDomain: "sistema-honda.firebaseapp.com",
  projectId: "sistema-honda",
  storageBucket: "sistema-honda.firebasestorage.app",
  messagingSenderId: "1071177541366",
  appId: "1:1071177541366:web:ae2b1ad8875a635fb1eed7",
  measurementId: "G-4BPMY5E931"
};

// 3. Inicializar a Aplicação Firebase
const app = initializeApp(firebaseConfig);

// 4. Inicializar os Serviços que vamos usar
const db = getFirestore(app); // O nosso novo Banco de Dados
const auth = getAuth(app); // O sistema de Login
const googleProvider = new GoogleAuthProvider(); // O provedor do Google

// 5. Exportar tudo para usarmos nos outros ficheiros (login, tecnico, gestor...)
export { db, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged };