// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, where,
  serverTimestamp, doc, deleteDoc, orderBy, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updatePassword, EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ----- Secondary app for creating users without losing admin session -----
let _secondaryApp = null;
function getSecondaryAuth() {
  if (!_secondaryApp) {
    _secondaryApp = initializeApp(firebaseConfig, "Secondary");
  }
  return getAuth(_secondaryApp);
}

export async function createStudentAuth(email, password) {
  const auth2 = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(auth2, email, password);
  const uid = cred.user.uid;
  await signOut(auth2);
  return uid;
}

export {
  collection, addDoc, getDocs, query, where,
  serverTimestamp, doc, deleteDoc, orderBy, updateDoc, getDoc,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  updatePassword, EmailAuthProvider, reauthenticateWithCredential
};
