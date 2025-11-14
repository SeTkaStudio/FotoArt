import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import type { User } from '../services/authService';

const ACTIVE_USER_KEY = 'setka_active_user';
const ADMIN_SESSION_KEY = 'isAdminAuthenticated';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  decrementCredits: (amount: number) => Promise<boolean>;
  redeemPromoCode: (promoCode: string) => Promise<{ success: boolean; message: string }>;
  updateUserApiKey: (apiKey: string) => Promise<boolean>;
  updatePaymentMethod: (method: 'credits' | 'apiKey') => Promise<boolean>;
  addFavorite: (imageUrl: string, category: 'photos' | 'avatars', folderId: string | 'root') => Promise<void>;
  removeFavorite: (imageUrl: string) => Promise<void>;
  isFavorite: (imageUrl: string) => boolean;
  createFolder: (category: 'photos' | 'avatars', folderName: string) => Promise<{ success: boolean, newFolderId?: string }>;
  renameFolder: (category: 'photos' | 'avatars', folderId: string, newName: string) => Promise<boolean>;
  deleteFolder: (category: 'photos' | 'avatars', folderId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = () => {
        const savedUsername = sessionStorage.getItem(ACTIVE_USER_KEY);
        const isAdminSessionActive = !!sessionStorage.getItem(ADMIN_SESSION_KEY);
        const isAppView = window.location.hash !== '#admin';

        if (isAdminSessionActive && isAppView) {
            const adminUser: User = {
                username: 'Admin',
                password: '',
                credits: 99999,
                paymentMethod: 'credits',
                favorites: {
                    photos: { root: [], folders: [] },
                    avatars: { root: [], folders: [] },
                },
            };
            setCurrentUser(adminUser);
        } else if (savedUsername) {
            const user = authService.findUser(savedUsername);
            if (user) {
                setCurrentUser(user);
            } else {
                sessionStorage.removeItem(ACTIVE_USER_KEY);
                setCurrentUser(null);
            }
        } else {
            setCurrentUser(null);
        }
    };

    checkAuth();
    window.addEventListener('hashchange', checkAuth);
    return () => window.removeEventListener('hashchange', checkAuth);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const user = authService.userLogin(username, password);
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem(ACTIVE_USER_KEY, user.username);
      return true;
    }
    return false;
  };

  const logout = () => {
    if (currentUser && currentUser.username === 'Admin') {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
    setCurrentUser(null);
    sessionStorage.removeItem(ACTIVE_USER_KEY);
  };

  const decrementCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (!currentUser || currentUser.username === 'Admin' || currentUser.credits < amount) {
      if (currentUser?.username === 'Admin') return true;
      return false;
    }
    const { success, updatedUser } = authService.useUserCredits(currentUser.username, amount);
    if (success && updatedUser) {
      setCurrentUser(updatedUser);
      return true;
    }
    return false;
  }, [currentUser]);

  const redeemPromoCode = useCallback(async (promoCode: string): Promise<{ success: boolean, message: string }> => {
    if (!currentUser) {
        return { success: false, message: 'Пользователь не авторизован.' };
    }
    const result = authService.redeemPromoCodeForUser(currentUser.username, promoCode);
    if (result.success && result.updatedUser) {
        setCurrentUser(result.updatedUser);
    }
    return { success: result.success, message: result.message };
  }, [currentUser]);

  const updateUserApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    if (!currentUser || currentUser.username === 'Admin') return false;
    const updatedUser = { ...currentUser, apiKey: apiKey };
    const success = authService.updateUser(updatedUser);
    if (success) {
      setCurrentUser(updatedUser);
    }
    return success;
  }, [currentUser]);

  const updatePaymentMethod = useCallback(async (method: 'credits' | 'apiKey'): Promise<boolean> => {
    if (!currentUser || currentUser.username === 'Admin') return false;
    const updatedUser = { ...currentUser, paymentMethod: method };
    const success = authService.updateUser(updatedUser);
    if (success) {
      setCurrentUser(updatedUser);
    }
    return success;
  }, [currentUser]);

  const addFavorite = useCallback(async (imageUrl: string, category: 'photos' | 'avatars', folderId: string | 'root'): Promise<void> => {
    if (!currentUser || currentUser.username === 'Admin') return;
    const { success, updatedUser } = authService.addImageToFavorites(currentUser.username, imageUrl, category, folderId);
    if (success && updatedUser) {
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  const removeFavorite = useCallback(async (imageUrl: string): Promise<void> => {
    if (!currentUser || currentUser.username === 'Admin') return;
    const { success, updatedUser } = authService.removeImageFromFavorites(currentUser.username, imageUrl);
    if (success && updatedUser) {
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  const isFavorite = useCallback((imageUrl: string): boolean => {
    if (!currentUser?.favorites) return false;
    const { photos, avatars } = currentUser.favorites;
    const allImages = [
      ...photos.root,
      ...photos.folders.flatMap(f => f.images),
      ...avatars.root,
      ...avatars.folders.flatMap(f => f.images),
    ];
    return allImages.includes(imageUrl);
  }, [currentUser]);

  const createFolder = useCallback(async (category: 'photos' | 'avatars', folderName: string): Promise<{ success: boolean, newFolderId?: string }> => {
    if (!currentUser || currentUser.username === 'Admin') return { success: false };
    const { success, updatedUser, newFolder } = authService.createFolder(currentUser.username, category, folderName);
    if (success && updatedUser && newFolder) {
        setCurrentUser(updatedUser);
        return { success: true, newFolderId: newFolder.id };
    }
    return { success: false };
  }, [currentUser]);

  const renameFolder = useCallback(async (category: 'photos' | 'avatars', folderId: string, newName: string): Promise<boolean> => {
    if (!currentUser || currentUser.username === 'Admin') return false;
    const { success, updatedUser } = authService.renameFolder(currentUser.username, category, folderId, newName);
    if (success && updatedUser) {
        setCurrentUser(updatedUser);
    }
    return success;
  }, [currentUser]);

  const deleteFolder = useCallback(async (category: 'photos' | 'avatars', folderId: string): Promise<boolean> => {
    if (!currentUser || currentUser.username === 'Admin') return false;
    const { success, updatedUser } = authService.deleteFolder(currentUser.username, category, folderId);
    if (success && updatedUser) {
        setCurrentUser(updatedUser);
    }
    return success;
  }, [currentUser]);

  const value = {
    isAuthenticated: !!currentUser,
    currentUser,
    login,
    logout,
    decrementCredits,
    redeemPromoCode,
    updateUserApiKey,
    updatePaymentMethod,
    addFavorite,
    removeFavorite,
    isFavorite,
    createFolder,
    renameFolder,
    deleteFolder,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};