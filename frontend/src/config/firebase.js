import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';

const getMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.content || '';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || getMeta('fb-api-key'),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || getMeta('fb-auth-domain'),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || getMeta('fb-project-id'),
};

export const firebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);

if (import.meta.env.DEV && !firebaseConfigured) {
  console.warn('[Firebase] Missing env vars: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID. Social sign-in will not work.');
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const providers = {
  google: new GoogleAuthProvider(),
  github: new GithubAuthProvider(),
};
