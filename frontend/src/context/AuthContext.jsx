import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, providers } from '../config/firebase.js';
import { authApi } from '../lib/api';

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return { user: action.payload, isAuthenticated: true, isLoading: false, error: null };
    case 'AUTH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOADING':
      return { ...state, isLoading: true, error: null };
    default:
      return state;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then((data) => dispatch({ type: 'AUTH_SUCCESS', payload: data.user }))
      .catch(() => dispatch({ type: 'LOGOUT' }));
    return () => controller.abort();
  }, []);

  const register = useCallback(async (email, username, password) => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await authApi.register({ email, username, password });
      dispatch({ type: 'AUTH_SUCCESS', payload: data.user });
    } catch (err) {
      dispatch({ type: 'AUTH_ERROR', payload: err.message });
    }
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await authApi.login({ email, password });
      dispatch({ type: 'AUTH_SUCCESS', payload: data.user });
    } catch (err) {
      dispatch({ type: 'AUTH_ERROR', payload: err.message });
    }
  }, []);

  const loginWithProvider = useCallback(async (providerName) => {
    dispatch({ type: 'LOADING' });
    try {
      const result = await signInWithPopup(auth, providers[providerName]);
      const idToken = await result.user.getIdToken();
      const data = await authApi.oauthLogin(idToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: data.user });
    } catch (err) {
      await firebaseSignOut(auth).catch(() => {});
      let message = err.message;
      if (err.code === 'auth/account-exists-with-different-credential') {
        const other = providerName === 'google' ? 'GitHub' : 'Google';
        message = `An account with this email already exists. Try signing in with ${other} instead.`;
      }
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear local state even if request fails
    }
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = {
    ...state,
    register,
    login,
    loginWithProvider,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
