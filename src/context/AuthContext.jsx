import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { createUserProfile, getUserProfile } from '../services/db';
import { useLogger } from './LoggerContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Firestore profile
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const { addLog } = useLogger();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setProfileError(null);
      
      if (currentUser) {
        addLog(`Usuario autenticado: ${currentUser.email}`, 'info');
        try {
          // Ensure profile exists in DB
          await createUserProfile(currentUser);
          // Fetch full profile (including shopId)
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error fetching profile:", error);
          setProfileError(error.message);
          addLog(`Error cargando perfil: ${error.message}`, 'error');
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [addLog]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      addLog('Iniciando login con Google...', 'info');
      const result = await signInWithPopup(auth, provider);
      addLog(`Login exitoso: ${result.user.displayName}`, 'success');
      return result.user;
    } catch (error) {
      console.error("Google Login Error:", error);
      addLog(`Error en login: ${error.message}`, 'error');
      alert(`Error al iniciar sesión: ${error.message}`);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      addLog('Sesión cerrada', 'info');
    } catch (error) {
      addLog(`Error al cerrar sesión: ${error.message}`, 'error');
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    profileError,
    loginWithGoogle,
    logout,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
