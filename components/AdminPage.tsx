import React, { useState, useEffect } from 'react';
import * as authService from '../services/authService';
import type { PromoCode, User } from '../services/authService';
import { AdminUserFavoritesView } from './AdminUserFavoritesView';
import { FavoritesPage } from './FavoritesPage';
import { useAuth } from '../contexts/AuthContext';


const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
);
const CopyIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>;
const GoToAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);


interface AdminPageProps {
    onLogout: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'promos' | 'users' | 'favorites'>('promos');
  const { login } = useAuth();
  
  // Promo code state
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [promoCredits, setPromoCredits] = useState(100);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // User state
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [lastCreatedUser, setLastCreatedUser] = useState<{ user: User, password: string } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({ username: '', password: '', credits: 0 });
  const [viewingUser, setViewingUser] = useState<User | null>(null);


  useEffect(() => {
    setPromoCodes(authService.fetchPromoCodes());
    setUsers(authService.fetchUsers());
    // The admin is authenticated via sessionStorage.
    // This login call populates the AuthContext with the admin user's data
    // so that child components (like the Favorites page) can access it.
    login('SeTkaProject', 'fghrty123QWE*');
  }, [login]);
  
  const handleCreateCode = (e: React.FormEvent) => {
    e.preventDefault();
    const newCode = authService.createPromoCode(promoCredits);
    if (newCode) {
        setPromoCodes(authService.fetchPromoCodes());
        setPromoCredits(100);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'password') => {
    navigator.clipboard.writeText(text).then(() => {
        if (type === 'code') {
            setCopiedCode(text);
            setTimeout(() => setCopiedCode(null), 2000);
        }
    });
  };
  
  const handleDeletePromo = (codeToDelete: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот промокод? Это действие нельзя отменить.')) {
      const success = authService.deletePromoCode(codeToDelete);
      if (success) {
        setPromoCodes(prevCodes => prevCodes.filter(c => c.code !== codeToDelete));
      } else {
        alert('Не удалось удалить промокод.');
      }
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setLastCreatedUser(null);
    const result = authService.adminCreateUser(newUsername);
    if (result) {
        setUsers(authService.fetchUsers());
        setLastCreatedUser(result);
        setNewUsername('');
    } else {
        alert('Пользователь с таким именем уже существует или имя некорректно.');
    }
  };

  const handleEditUserClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({ username: user.username, password: user.password, credits: user.credits });
  };

  const handleEditUserSave = () => {
    if (!editingUser) return;
    const result = authService.adminUpdateUser(editingUser.username, {
        username: editFormData.username,
        password: editFormData.password,
        credits: editFormData.credits,
    });
    if (result.success && result.users) {
        setUsers(result.users);
        setEditingUser(null);
    } else {
        alert(result.message);
    }
  };

  const handleDeleteUser = (username: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить пользователя ${username}? Это действие нельзя отменить.`)) {
        const result = authService.deleteUser(username);
        if (result.success && result.users) {
            setUsers(result.users);
        } else {
            alert('Не удалось удалить пользователя.');
        }
    }
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserUpdateFromFavorites = (updatedUser: User) => {
    setUsers(prevUsers => prevUsers.map(u => u.username === updatedUser.username ? updatedUser : u));
    setViewingUser(updatedUser);
  };

  if (viewingUser) {
    return (
      <div className="min-h-screen bg-brand-primary text-brand-text-primary p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <AdminUserFavoritesView
            user={viewingUser}
            onBack={() => setViewingUser(null)}
            onFavoriteRemoved={handleUserUpdateFromFavorites}
          />
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-brand-primary text-brand-text-primary p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Личный кабинет</h1>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => window.location.hash = ''} 
                className="flex items-center gap-2 text-sm bg-brand-accent/80 hover:bg-brand-accent text-brand-primary font-semibold py-2 px-3 rounded-md transition-colors"
                title="Перейти к инструментам генерации"
            >
               <GoToAppIcon />
               <span>К генерации</span>
            </button>
            <button onClick={onLogout} className="flex items-center gap-2 text-sm bg-brand-secondary hover:bg-slate-600 text-brand-text-secondary font-semibold py-2 px-3 rounded-md transition-colors">
               <LogoutIcon />
               <span>Выйти</span>
            </button>
          </div>
        </header>
        
        <div className="mb-6 border-b border-brand-secondary">
            <nav className="flex space-x-4">
                <button onClick={() => setActiveTab('promos')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'promos' ? 'border-b-2 border-brand-accent text-brand-accent' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}>Промокоды</button>
                <button onClick={() => setActiveTab('users')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'users' ? 'border-b-2 border-brand-accent text-brand-accent' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}>Пользователи</button>
                <button onClick={() => setActiveTab('favorites')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'favorites' ? 'border-b-2 border-brand-accent text-brand-accent' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}>Избранное</button>
            </nav>
        </div>

        {activeTab === 'promos' && (
            <>
                <section className="bg-brand-secondary/50 p-6 rounded-lg mb-8">
                    <h2 className="text-xl font-semibold mb-4">Создать новый промокод</h2>
                    <form onSubmit={handleCreateCode} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                         <div className="md:col-span-2">
                            <label htmlFor="promo-credits" className="block text-sm font-medium text-brand-text-secondary mb-1">Количество кредитов</label>
                            <input id="promo-credits" type="number" min="1" value={promoCredits} onChange={e => setPromoCredits(Number(e.target.value))} required className="w-full px-3 py-2 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"/>
                        </div>
                        <button type="submit" className="w-full py-2 font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400 transition-colors h-10">Создать</button>
                    </form>
                </section>
                <section>
                    <h2 className="text-xl font-semibold mb-4">Существующие промокоды</h2>
                    <div className="bg-brand-secondary/50 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-brand-secondary">
                                    <tr>
                                        <th className="p-3">Активирован кем</th>
                                        <th className="p-3">Промокод</th>
                                        <th className="p-3">Кредиты</th>
                                        <th className="p-3">Использовано раз</th>
                                        <th className="p-3 text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promoCodes.length > 0 ? promoCodes.map(pc => (
                                        <tr key={pc.code} className="border-b border-brand-primary/50 last:border-b-0">
                                            <td className="p-3 text-xs">{pc.usedBy?.length > 0 ? pc.usedBy.join(', ') : 'Неактивирован'}</td>
                                            <td className="p-3 font-mono">
                                                <div className="flex items-center gap-2">
                                                    <span>{pc.code}</span>
                                                    <button onClick={() => copyToClipboard(pc.code, 'code')} className="text-brand-text-secondary hover:text-brand-accent" title="Копировать">
                                                        {copiedCode === pc.code ? '✓' : <CopyIcon />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-3">{pc.totalCredits}</td>
                                            <td className="p-3">{pc.usedBy?.length || 0}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleDeletePromo(pc.code)} className="text-brand-text-secondary hover:text-red-500" title="Удалить"><DeleteIcon /></button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="text-center p-6 text-brand-text-secondary">Промокоды еще не созданы.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </>
        )}

        {activeTab === 'users' && (
             <>
                <section className="bg-brand-secondary/50 p-6 rounded-lg mb-8">
                    <h2 className="text-xl font-semibold mb-4">Создать нового пользователя</h2>
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label htmlFor="user-name" className="block text-sm font-medium text-brand-text-secondary mb-1">Логин</label>
                            <input id="user-name" type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required className="w-full px-3 py-2 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"/>
                        </div>
                        <button type="submit" className="w-full py-2 font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400 transition-colors h-10">Создать</button>
                    </form>
                    {lastCreatedUser && (
                        <div className="mt-4 p-3 bg-green-900/50 border border-green-700 rounded-md text-sm">
                            <p>Пользователь <span className="font-bold">{lastCreatedUser.user.username}</span> создан.</p>
                            <div className="flex items-center gap-2">
                                <span>Пароль:</span>
                                <span className="font-mono bg-brand-primary px-2 py-1 rounded">{lastCreatedUser.password}</span>
                                <button onClick={() => copyToClipboard(lastCreatedUser.password, 'password')} className="text-brand-text-secondary hover:text-brand-accent" title="Копировать пароль"><CopyIcon /></button>
                            </div>
                        </div>
                    )}
                </section>
                <section>
                    <h2 className="text-xl font-semibold mb-4">Зарегистрированные пользователи</h2>
                    <div className="bg-brand-secondary/50 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                                <thead className="bg-brand-secondary">
                                    <tr>
                                        <th className="p-3">Логин</th>
                                        <th className="p-3">Пароль</th>
                                        <th className="p-3">Кредиты</th>
                                        <th className="p-3 text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map(user => (
                                        <tr key={user.username} className="border-b border-brand-primary/50 last:border-b-0">
                                            <td className="p-3">
                                                <button onClick={() => setViewingUser(user)} className="text-brand-accent hover:underline">
                                                    {user.username}
                                                </button>
                                            </td>
                                            <td className="p-3 font-mono">{user.password}</td>
                                            <td className="p-3">{user.credits}</td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end items-center gap-4">
                                                    <button onClick={() => handleEditUserClick(user)} className="text-brand-text-secondary hover:text-brand-accent" title="Редактировать"><EditIcon /></button>
                                                    <button onClick={() => handleDeleteUser(user.username)} className="text-brand-text-secondary hover:text-red-500" title="Удалить"><DeleteIcon /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="text-center p-6 text-brand-text-secondary">Пользователи еще не созданы.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </>
        )}
        
        {activeTab === 'favorites' && (
            <div className="max-w-7xl mx-auto -p-4 md:-p-8">
                <FavoritesPage onNavigateBack={null} />
            </div>
        )}

      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-brand-secondary p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Редактировать: {editingUser.username}</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="edit-username" className="block text-sm font-medium text-brand-text-secondary mb-1">Логин</label>
                        <input id="edit-username" name="username" type="text" value={editFormData.username} onChange={handleEditFormChange} className="w-full px-3 py-2 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"/>
                    </div>
                    <div>
                        <label htmlFor="edit-password" className="block text-sm font-medium text-brand-text-secondary mb-1">Пароль</label>
                        <input id="edit-password" name="password" type="text" value={editFormData.password} onChange={handleEditFormChange} className="w-full px-3 py-2 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"/>
                    </div>
                    <div>
                        <label htmlFor="edit-credits" className="block text-sm font-medium text-brand-text-secondary mb-1">Кредиты</label>
                        <input id="edit-credits" name="credits" type="number" value={editFormData.credits} onChange={handleEditFormChange} className="w-full px-3 py-2 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"/>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setEditingUser(null)} className="py-2 px-4 font-bold text-brand-text-primary bg-slate-600 hover:bg-slate-500 rounded-lg">Отмена</button>
                    <button onClick={handleEditUserSave} className="py-2 px-4 font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400">Сохранить</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};