import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

// Config parsed from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDc_9fgKZZSOLj6g9SeeAeN4FkzKarC2XU",
  authDomain: "project-3fa713f3-689d-408e-9a8.firebaseapp.com",
  projectId: "project-3fa713f3-689d-408e-9a8",
  storageBucket: "project-3fa713f3-689d-408e-9a8.firebasestorage.app",
  messagingSenderId: "206246044997",
  appId: "1:206246044997:web:4569565308685e25ff8a2c"
};

const app = initializeApp(firebaseConfig);

// Initialize named Firestore from config
export const db = getFirestore(app, "ai-studio-0f3b4c23-7965-4027-9d6f-9d14b9c5bd60");

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard login prompt with account selection
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Test connection on startup according to skill guidelines
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "test_connection", "ping"));
    console.log("Firestore connection test passed.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("client is offline")) {
      console.error("Firebase connection test failed: The client is offline.");
    } else {
      console.log("Firestore ping failed (this is expected for clean collections, but connection was made):", error.message);
    }
  }
}
testFirestoreConnection();
