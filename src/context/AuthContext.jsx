import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase/config";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loginWithEmail(email, password) {
    setError(null);
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function loginWithGoogle() {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      return await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function logout() {
    setError(null);
    return signOut(auth);
  }

  async function getToken() {
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          setRole(tokenResult.claims.role || null);
          setCurrentUser(user);
        } catch (err) {
          console.error("Error retrieving user token result:", err);
          setRole(null);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function loginAsGuest() {
    if (!import.meta.env.DEV) {
      console.warn("loginAsGuest is disabled in production environments.");
      return;
    }
    setError(null);
    setCurrentUser({
      email: "admin-test@avsrubino.it",
      displayName: "Admin Test Locale",
      getIdToken: async () => "demo-token",
    });
    setRole("Super_Admin");
  }

  const value = {
    currentUser,
    role,
    loading,
    error,
    loginWithEmail,
    loginWithGoogle,
    loginAsGuest,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
