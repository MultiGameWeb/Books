// Paste the Firebase Web App config from Firebase Console > Project settings > Your apps.
// This file is public in a browser-based GitHub Pages site. Do not put private service-account
// credentials, private keys, or other server secrets here.
export const firebaseConfig = {
  apiKey: "PASTE_FIREBASE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_STORAGE_BUCKET",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID",
  appId: "PASTE_FIREBASE_APP_ID"
};

export function isFirebaseConfigured() {
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  return required.every((key) => {
    const value = String(firebaseConfig[key] || "").trim();
    return value && !/PASTE_|REPLACE_|YOUR_/i.test(value);
  });
}
