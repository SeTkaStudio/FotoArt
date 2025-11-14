import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await login(username, password);

    if (!success) {
      setError('Неверный логин или пароль.');
      setIsLoading(false);
    }
    // No need to navigate, AuthContext change will trigger re-render in AppRouter
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-brand-primary">
      <div className="w-full max-w-sm p-8 space-y-6 bg-brand-secondary rounded-lg shadow-2xl">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-brand-accent mb-2">SeTka Project</h1>
            <p className="text-brand-text-secondary">Вход для пользователей</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            disabled={isLoading}
            className="w-full py-3 font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400 transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <div className="text-center">
            <button
                onClick={() => window.location.hash = 'admin'}
                className="text-xs text-brand-text-secondary hover:text-brand-accent transition-colors underline"
            >
                Вход для администратора
            </button>
        </div>
      </div>
    </div>
  );
};
