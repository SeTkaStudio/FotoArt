import React, { useState } from 'react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'SeTkaProject' && password === 'fghrty123QWE*') {
      setError('');
      onLoginSuccess();
    } else {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-brand-primary">
      <div className="w-full max-w-md p-8 space-y-4 bg-brand-secondary rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-brand-text-primary">
          Вход в личный кабинет
        </h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="text-sm font-medium text-brand-text-secondary"
            >
              Логин
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-brand-text-secondary"
            >
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
              required
            />
          </div>
          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400 transition-transform transform hover:scale-105"
          >
            Войти
          </button>
        </form>
        <button 
            onClick={() => window.location.hash = ''} 
            className="block w-full text-center text-sm text-brand-text-secondary hover:text-brand-accent underline"
        >
            Вернуться на главный экран
        </button>
      </div>
    </div>
  );
};