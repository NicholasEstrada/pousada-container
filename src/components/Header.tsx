
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserIcon } from './icons/UserIcon';

interface HeaderProps {
  onLoginClick: () => void;
  currentView: 'home' | 'admin';
  onViewChange: (view: 'home' | 'admin') => void;
}

const Header: React.FC<HeaderProps> = ({ onLoginClick, currentView, onViewChange }) => {
  const { user, logout, role } = useAuth();

  return (
    <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="text-2xl font-bold text-teal-700 cursor-pointer" onClick={() => onViewChange('home')}>
          Pousada Container
        </div>
        <nav className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-stone-600">
                <UserIcon className="w-5 h-5" />
                <span>{user.email}</span>
              </div>
              {role === 'admin' && (
                <button
                  onClick={() => onViewChange(currentView === 'home' ? 'admin' : 'home')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                    currentView === 'admin' 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  {currentView === 'home' ? 'Painel Admin' : 'Ver Site'}
                </button>
              )}
              <button onClick={logout} className="text-sm font-semibold text-stone-600 hover:text-teal-600">
                Sair
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="bg-teal-600 text-white font-semibold py-2 px-5 rounded-lg shadow hover:bg-teal-700 transition-colors"
            >
              Login / Cadastro
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
