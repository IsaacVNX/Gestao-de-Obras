
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "obracontrol-qrqpe",
  "appId": "1:145297492842:web:df12206bd0e87e425ff313",
  "storageBucket": "obracontrol-qrqpe.firebasestorage.app",
  "apiKey": "AIzaSyC7Z8sCFvzAPCCHLcMDaq-TtJix6-5Gj9o",
  "authDomain": "obracontrol-qrqpe.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "145297492842"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
