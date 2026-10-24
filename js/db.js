import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestoreSafe(app);

// Keep the modular SDK functions in one place so app code remains easy to maintain.
export {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
};

export async function getAllBooks() {
  const snapshot = await getDocs(collection(db, "books"));
  return snapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : Number.MAX_SAFE_INTEGER;
      return orderA - orderB || String(a.title || "").localeCompare(String(b.title || ""));
    });
}

export async function getBookPages(bookId) {
  const snapshot = await getDocs(collection(db, "books", bookId, "pages"));
  return snapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .sort((a, b) => {
      const aOrder = Number.parseInt(a.sortOrder ?? a.id, 10);
      const bOrder = Number.parseInt(b.sortOrder ?? b.id, 10);
      return (Number.isFinite(aOrder) ? aOrder : 0) - (Number.isFinite(bOrder) ? bOrder : 0);
    });
}

function getFirestoreSafe(firebaseApp) {
  return getFirestore(firebaseApp);
}

// Imported as a named function above so the initialisation stays explicit.
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
