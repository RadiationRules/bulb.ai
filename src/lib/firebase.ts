import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGFij1pFUVNFP63QHxEq619c9jPnskzxY",
  authDomain: "bulbai-21f09.firebaseapp.com",
  projectId: "bulbai-21f09",
  storageBucket: "bulbai-21f09.firebasestorage.app",
  messagingSenderId: "366775652166",
  appId: "1:366775652166:web:9f0633faccbfd7db625f47",
  measurementId: "G-S7LRRREXNQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithEmail = (email: string, password: string) => 
  signInWithEmailAndPassword(auth, email, password);
export const signUpWithEmail = (email: string, password: string) => 
  createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);