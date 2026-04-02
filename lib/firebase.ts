import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBt2RxRPiSUSffKx4n9ny8zmRpUNZeTJsM",
  authDomain: "rai-pride-app.firebaseapp.com",
  projectId: "rai-pride-app",
  storageBucket: "rai-pride-app.firebasestorage.app",
  messagingSenderId: "59936450466",
  appId: "1:59936450466:web:d758085416236b8e76b4fb"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
