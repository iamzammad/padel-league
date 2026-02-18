import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, push, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3OvcACWfo8sbkmdt01BN977mSEE8wTgk",
  authDomain: "aptl-x-padium.firebaseapp.com",
  databaseURL: "https://aptl-x-padium-default-rtdb.firebaseio.com",
  projectId: "aptl-x-padium",
  storageBucket: "aptl-x-padium.firebasestorage.app",
  messagingSenderId: "493121725372",
  appId: "1:493121725372:web:9459b3d910cfc86d9581b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth, app };
