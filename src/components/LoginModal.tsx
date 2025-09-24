
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { XIcon } from './icons/XIcon';

interface LoginModalProps {
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-sm relative transform transition-all animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-stone-800">
          <XIcon className="w-6 h-6" />
        </button>
        <div className="mb-6">
          <div className="flex border-b border-stone-200">
            <button
              onClick={() => setIsLogin(true)}
              className={`w-1/2 py-3 text-sm font-semibold transition-colors ${isLogin ? 'text-teal-600 border-b-2 border-teal-600' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`w-1/2 py-3 text-sm font-semibold transition-colors ${!isLogin ? 'text-teal-600 border-b-2 border-teal-600' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Cadastro
            </button>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-stone-800 mb-2">{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}</h2>
        <p className="text-center text-stone-500 mb-6 text-sm">{isLogin ? 'Acesse para gerenciar suas reservas.' : 'Rápido e fácil.'}</p>
        
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
