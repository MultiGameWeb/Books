// Paste the Firebase Web App config from Firebase Console > Project settings > Your apps.
// This file is public in a browser-based GitHub Pages site. Do not put private service-account
// credentials, private keys, or other server secrets here.
export const firebaseConfig = {
  apiKey: "AIzaSyDm8Jr-79n8MRxS2uEPC8hQBNXCNj0NN6Q",
  authDomain: "dr-m-devendra-books.firebaseapp.com",
  projectId: "dr-m-devendra-books",
  storageBucket: "dr-m-devendra-books.firebasestorage.app",
  messagingSenderId: "4406457928",
  appId: "1:4406457928:web:40ce524741783f14d90a7d"
};

export function isFirebaseConfigured() {
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  return required.every((key) => {
    const value = String(firebaseConfig[key] || "").trim();
    return value && !/PASTE_|REPLACE_|YOUR_/i.test(value);
  });
}
