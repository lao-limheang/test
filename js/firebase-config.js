// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-pT0gkyo_Ay7XOrnPoVcAJyD7ZnLw-z8",
  authDomain: "checkin-chafe.firebaseapp.com",
  projectId: "checkin-chafe",
  storageBucket: "checkin-chafe.firebasestorage.app",
  messagingSenderId: "1087154606159",
  appId: "1:1087154606159:web:473aaf686512be8a72da3a",
  measurementId: "G-VXL6D96DFT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.db = db;
window.auth = auth;

export { db, auth };