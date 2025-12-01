import React, { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

// Configure axios base URL
export const API_URL = 'http://localhost:5000';
axios.defaults.baseURL = API_URL;

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('@FutScoreAdmin:user');
    const storedToken = localStorage.getItem('@FutScoreAdmin:token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  function signIn(newToken: string, newUser: User) {
    setUser(newUser);
    setToken(newToken);
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    localStorage.setItem('@FutScoreAdmin:user', JSON.stringify(newUser));
    localStorage.setItem('@FutScoreAdmin:token', newToken);
  }

  function signOut() {
    setUser(null);
    setToken(null);
    localStorage.clear();
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      signIn, 
      signOut,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
