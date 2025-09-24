import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { login as apiLogin, signup as apiSignup } from '../services/api';
import { ROLES } from '../constants'; // Assumindo que ROLES ainda é relevante para o frontend

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null; // Adiciona o token ao contexto
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (email: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [token, setToken] = useState<string | null>(null); // Novo estado para o token

  // Função para carregar o usuário e token do localStorage
  const loadAuthData = useCallback(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token'); // Carrega o token também

    if (savedUser && savedToken) {
      const parsedUser: User = JSON.parse(savedUser);
      setUser(parsedUser);
      setRole(parsedUser.role);
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    loadAuthData();
  }, [loadAuthData]);

  const login = async (email: string, password: string) => {
    // A função apiLogin agora retorna { user, token }
    const { user: loggedInUser, token: authToken } = await apiLogin(email, password);
    setUser(loggedInUser);
    setRole(loggedInUser.role);
    setToken(authToken); // Salva o token no estado
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('token', authToken); // Salva o token no localStorage
  };

  const signup = async (email: string, password: string) => {
    // A função apiSignup agora retorna { user, token }
    const { user: newUser, token: authToken } = await apiSignup(email, password);
    setUser(newUser);
    setRole(newUser.role);
    setToken(authToken); // Salva o token no estado
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('token', authToken); // Salva o token no localStorage
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    setToken(null); // Limpa o token
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Remove o token do localStorage
  };

  return (
    <AuthContext.Provider value={{ user, role, token, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};