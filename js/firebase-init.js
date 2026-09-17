// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  deleteDoc,
  orderBy,
  updateDoc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  deleteDoc,
  orderBy,
  updateDoc,
  getDoc,
  setDoc
};
