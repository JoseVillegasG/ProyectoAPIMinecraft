import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Change this to your backend URL
// For development: use your local IP (find it with `ipconfig` or `ifconfig`)
// For production: use your deployed backend URL
const API_URL = 'http://localhost:3000'; // or 'http://192.168.x.x:3000' for mobile testing

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Function to sync user with MongoDB
const syncUserWithBackend = async (user: User) => {
  try {
    const response = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to sync user with backend');
    }

    const data = await response.json();
    console.log('User synced with backend:', data);
  } catch (error) {
    console.error('Error syncing user with backend:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Sync with backend when user logs in
      if (user) {
        await syncUserWithBackend(user);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Sync new user with MongoDB
      await syncUserWithBackend(userCredential.user);
      
      console.log('User created and synced:', userCredential.user.uid);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Sync login with MongoDB (updates lastLogin)
      await syncUserWithBackend(userCredential.user);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};