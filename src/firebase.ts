import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCc1QgUMp7Z5xuYoyg_jJlbyfP4H8-9tZE",
  authDomain: "graphic-citadel-1gtt6.firebaseapp.com",
  projectId: "graphic-citadel-1gtt6",
  storageBucket: "graphic-citadel-1gtt6.firebasestorage.app",
  messagingSenderId: "541957991496",
  appId: "1:541957991496:web:c47a802865c90c7baa7c7d"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if available
export const db = getFirestore(app, "ai-studio-dataai-6a2a06da-b9bb-4e8b-b872-302824d8f0e6");

export default app;
