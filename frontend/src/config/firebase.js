import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';

const getMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.content || '';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || getMeta('fb-api-key'),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || getMeta('fb-auth-domain'),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || getMeta('fb-project-id'),
});

export const auth = getAuth(app);
export const providers = {
  google: new GoogleAuthProvider(),
  github: new GithubAuthProvider(),
};
