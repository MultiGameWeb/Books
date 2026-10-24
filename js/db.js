import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const configured = isFirebaseConfigured();
export const app = configured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

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
  if (!db) throw new Error("Firebase is not configured yet. Update js/firebase-config.js first.");
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
  if (!db) throw new Error("Firebase is not configured yet. Update js/firebase-config.js first.");
  const snapshot = await getDocs(collection(db, "books", bookId, "pages"));
  return snapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .sort((a, b) => {
      const aOrder = Number.parseInt(a.sortOrder ?? a.id, 10);
      const bOrder = Number.parseInt(b.sortOrder ?? b.id, 10);
      return (Number.isFinite(aOrder) ? aOrder : 0) - (Number.isFinite(bOrder) ? bOrder : 0);
    });
}
