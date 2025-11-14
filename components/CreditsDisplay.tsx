import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface CreditsDisplayProps {
  onLogout: () => void;
  onProfileClick: () => void;
  onFavoritesClick: () => void;
}

const ProfileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const FavoritesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
);

const AdminIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


export const CreditsDisplay: React.FC<CreditsDisplayProps> = ({ onLogout, onProfileClick, onFavoritesClick }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) return null;

  if (currentUser.username === 'Admin') {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-4 bg-brand-secondary/50 backdrop-blur-sm p-2 rounded-lg border border-brand-secondary">
          <div className="text-sm font-bold text-brand-accent">Admin</div>
          <button
              onClick={() => window.location.hash = 'admin'}
              title="Вернуться в панель администратора"
              className="text-brand-text-secondary hover:text-brand-accent transition-colors"
          >
              <AdminIcon />
          </button>
          <button 
            onClick={onLogout}
            title="Выйти из режима просмотра"
            className="text-brand-text-secondary hover:text-red-500 transition-colors"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-4 bg-brand-secondary/50 backdrop-blur-sm p-2 rounded-lg border border-brand-secondary">
        <div className="text-sm">
            <span className="text-brand-text-secondary">Кредиты: </span>
            <span className="font-bold text-brand-accent">{currentUser.credits}</span>
        </div>
        <button
            onClick={onFavoritesClick}
            title="Избранное"
            className="text-brand-text-secondary hover:text-brand-accent transition-colors"
        >
            <FavoritesIcon />
        </button>
        <button
            onClick={onProfileClick}
            title="Профиль"
            className="text-brand-text-secondary hover:text-brand-accent transition-colors"
        >
            <ProfileIcon />
        </button>
        <button 
          onClick={onLogout}
          title="Выйти"
          className="text-brand-text-secondary hover:text-red-500 transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
    </div>
  );
};