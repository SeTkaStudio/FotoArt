import type { UserFavorites, FavoritesFolder } from '../types';

export interface PromoCode {
  name: string;
  code: string;
  totalCredits: number;
  usedBy: string[]; // Track which users have used this code
}

export interface User {
    username: string;
    password: string;
    credits: number;
    apiKey?: string;
    paymentMethod: 'credits' | 'apiKey';
    favorites: UserFavorites;
}

const PROMO_CODES_KEY = 'setka_promo_codes';
const USERS_KEY = 'setka_users';
const ADMIN_USERNAME = 'SeTkaProject';

// --- User Management ---

const migrateUser = (user: any): User => {
    // Check for old favorites structure (string array) or missing favorites property
    if (!user.favorites || Array.isArray(user.favorites)) {
        const oldFavorites = Array.isArray(user.favorites) ? user.favorites : [];
        user.favorites = {
            photos: { root: oldFavorites, folders: [] },
            avatars: { root: [], folders: [] },
        };
    }

    // Ensure full structure exists to prevent runtime errors
    if (!user.favorites.photos) user.favorites.photos = { root: [], folders: [] };
    if (!user.favorites.avatars) user.favorites.avatars = { root: [], folders: [] };
    if (!user.favorites.photos.root) user.favorites.photos.root = [];
    if (!user.favorites.photos.folders) user.favorites.photos.folders = [];
    if (!user.favorites.avatars.root) user.favorites.avatars.root = [];
    if (!user.favorites.avatars.folders) user.favorites.avatars.folders = [];

    // Ensure favorites is not an array (for very old data structures)
    if (!user.favorites) {
        user.favorites = {
            photos: { root: [], folders: [] },
            avatars: { root: [], folders: [] },
        };
    }

    return user as User;
};


const getUsers = (): User[] => {
  try {
    const usersJson = localStorage.getItem(USERS_KEY);
    const users = usersJson ? JSON.parse(usersJson) : [];
    return users.map(migrateUser);
  } catch (error) {
    console.error("Error parsing users from localStorage", error);
    return [];
  }
};

const saveUsers = (users: User[]): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const findUser = (username: string): User | undefined => {
    return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
};

const ensureAdminUserExists = (): void => {
    const users = getUsers();
    const adminUser = users.find(u => u.username === ADMIN_USERNAME);
    if (!adminUser) {
        users.push(migrateUser({
            username: ADMIN_USERNAME,
            password: 'fghrty123QWE*',
            credits: 999999,
            paymentMethod: 'credits',
            favorites: { photos: { root: [], folders: [] }, avatars: { root: [], folders: [] } }
        }));
        saveUsers(users);
    }
};

// Ensure admin exists on service load
ensureAdminUserExists();

export const adminCreateUser = (username: string): { user: User; password: string } | null => {
    if (!username || findUser(username)) {
        return null;
    }
    const users = getUsers();
    const password = generateRandomCode(12);
    const newUser: User = migrateUser({
        username,
        password,
        credits: 0,
        paymentMethod: 'credits',
        favorites: { photos: { root: [], folders: [] }, avatars: { root: [], folders: [] } },
    });
    users.push(newUser);
    saveUsers(users);
    return { user: newUser, password };
};

export const adminUpdateUser = (originalUsername: string, updates: Partial<User>): { success: boolean; message: string; users?: User[] } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === originalUsername.toLowerCase());

    if (userIndex === -1) {
        return { success: false, message: 'Пользователь не найден.' };
    }

    if (updates.username && updates.username.toLowerCase() !== originalUsername.toLowerCase()) {
        if (findUser(updates.username)) {
            return { success: false, message: 'Пользователь с таким логином уже существует.' };
        }
    }
    
    const newCredits = parseInt(String(updates.credits), 10);

    const updatedUser = { 
        ...users[userIndex], 
        ...updates,
        credits: isNaN(newCredits) ? users[userIndex].credits : newCredits,
    };
    users[userIndex] = updatedUser;

    saveUsers(users);
    return { success: true, message: 'Пользователь обновлен.', users: users };
};

export const deleteUser = (username: string): { success: boolean; users?: User[] } => {
    if (username === ADMIN_USERNAME) return { success: false }; // Prevent admin deletion
    let users = getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());

    if (users.length < initialLength) {
        saveUsers(users);
        return { success: true, users: users };
    }
    return { success: false };
};


export const userLogin = (username: string, password: string): User | null => {
    const user = findUser(username);
    if (user && user.password === password) {
        return user;
    }
    return null;
};

export const fetchUsers = (): User[] => {
    return getUsers().filter(u => u.username !== ADMIN_USERNAME);
};

export const updateUser = (updatedUser: User): boolean => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === updatedUser.username);
    if (userIndex === -1) return false;
    users[userIndex] = updatedUser;
    saveUsers(users);
    return true;
};

export const useUserCredits = (username: string, amount: number): { success: boolean; updatedUser: User | null } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return { success: false, updatedUser: null };
    
    if (users[userIndex].credits < amount) {
        return { success: false, updatedUser: users[userIndex] };
    }
    
    users[userIndex].credits -= amount;
    saveUsers(users);
    return { success: true, updatedUser: users[userIndex] };
};

// --- Favorites Management ---
export const addImageToFavorites = (username: string, imageUrl: string, category: 'photos' | 'avatars', folderId: string | 'root'): { success: boolean; updatedUser: User | null } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return { success: false, updatedUser: null };

    const user = users[userIndex];
    const favCategory = user.favorites[category];

    // Prevent duplicates across the entire favorites
    const allImages = new Set([
      ...user.favorites.photos.root,
      ...user.favorites.photos.folders.flatMap(f => f.images),
      ...user.favorites.avatars.root,
      ...user.favorites.avatars.folders.flatMap(f => f.images)
    ]);
    if (allImages.has(imageUrl)) {
        // Already a favorite, do nothing
        return { success: true, updatedUser: user };
    }

    if (folderId === 'root') {
        favCategory.root.push(imageUrl);
    } else {
        const folder = favCategory.folders.find(f => f.id === folderId);
        if (folder) {
            folder.images.push(imageUrl);
        } else {
            return { success: false, updatedUser: null }; // Folder not found
        }
    }

    saveUsers(users);
    return { success: true, updatedUser: user };
};

export const removeImageFromFavorites = (username: string, imageUrl: string): { success: boolean; updatedUser: User | null } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return { success: false, updatedUser: null };

    const user = users[userIndex];
    let removed = false;

    (['photos', 'avatars'] as const).forEach(category => {
        const favCategory = user.favorites[category];
        // Check root
        const rootIndex = favCategory.root.indexOf(imageUrl);
        if (rootIndex > -1) {
            favCategory.root.splice(rootIndex, 1);
            removed = true;
        }
        // Check folders
        favCategory.folders.forEach(folder => {
            const imageIndex = folder.images.indexOf(imageUrl);
            if (imageIndex > -1) {
                folder.images.splice(imageIndex, 1);
                removed = true;
            }
        });
    });

    if (removed) {
        saveUsers(users);
    }
    return { success: true, updatedUser: user };
};

export const createFolder = (username: string, category: 'photos' | 'avatars', folderName: string): { success: boolean; updatedUser: User | null; newFolder?: FavoritesFolder } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return { success: false, updatedUser: null };
    
    const user = users[userIndex];
    const newFolder: FavoritesFolder = {
        id: `folder_${Date.now()}`,
        name: folderName,
        images: []
    };
    user.favorites[category].folders.push(newFolder);
    saveUsers(users);
    return { success: true, updatedUser: user, newFolder };
};

export const renameFolder = (username: string, category: 'photos' | 'avatars', folderId: string, newName: string): { success: boolean; updatedUser: User | null } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return { success: false, updatedUser: null };

    const user = users[userIndex];
    const folder = user.favorites[category].folders.find(f => f.id === folderId);
    if (folder) {
        folder.name = newName;
        saveUsers(users);
        return { success: true, updatedUser: user };
    }
    return { success: false, updatedUser: null };
};

export const deleteFolder = (username: string, category: 'photos' | 'avatars', folderId: string): { success: boolean; updatedUser: User | null } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return { success: false, updatedUser: null };

    const user = users[userIndex];
    user.favorites[category].folders = user.favorites[category].folders.filter(f => f.id !== folderId);
    saveUsers(users);
    return { success: true, updatedUser: user };
};

// --- Promo Code Management ---

const getPromoCodes = (): PromoCode[] => {
  try {
    const codes = localStorage.getItem(PROMO_CODES_KEY);
    return codes ? JSON.parse(codes) : [];
  } catch (error) {
    console.error("Error parsing promo codes from localStorage", error);
    return [];
  }
};

const savePromoCodes = (codes: PromoCode[]): void => {
  localStorage.setItem(PROMO_CODES_KEY, JSON.stringify(codes));
};

export const adminLogin = (username?: string, password?: string): boolean => {
  return username === ADMIN_USERNAME && password === 'fghrty123QWE*';
};

const generateRandomCode = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createPromoCode = (credits: number): PromoCode | null => {
  if (credits <= 0) {
    return null;
  }
  const codes = getPromoCodes();
  let newCode: string;
  do {
    newCode = generateRandomCode(16);
  } while (codes.some(c => c.code === newCode));

  const promo: PromoCode = {
    name: '',
    code: newCode,
    totalCredits: credits,
    usedBy: [],
  };
  codes.push(promo);
  savePromoCodes(codes);
  return promo;
};

export const fetchPromoCodes = (): PromoCode[] => {
  return getPromoCodes().map(pc => ({
    ...pc,
    usedCredits: pc.usedBy?.length ?? 0,
    totalCredits: pc.totalCredits
  }));
};


export const deletePromoCode = (code: string): boolean => {
    let codes = getPromoCodes();
    const initialLength = codes.length;
    codes = codes.filter(c => c.code !== code);
    if (codes.length < initialLength) {
        savePromoCodes(codes);
        return true;
    }
    return false;
};

export const redeemPromoCodeForUser = (username: string, promoCode: string): { success: boolean; message: string; updatedUser?: User } => {
    const codes = getPromoCodes();
    const users = getUsers();

    const promoIndex = codes.findIndex(c => c.code.toUpperCase() === promoCode.toUpperCase());
    const userIndex = users.findIndex(u => u.username === username);

    if (promoIndex === -1) {
        return { success: false, message: "Промокод не найден." };
    }
    if (userIndex === -1) {
        return { success: false, message: "Пользователь не найден." };
    }

    const promo = codes[promoIndex];
    if (promo.usedBy && promo.usedBy.includes(username)) {
        return { success: false, message: "Вы уже использовали этот промокод." };
    }

    if (!promo.usedBy) {
      promo.usedBy = [];
    }

    promo.usedBy.push(username);
    users[userIndex].credits += promo.totalCredits;
    
    codes[promoIndex] = promo;

    savePromoCodes(codes);
    saveUsers(users);

    return { success: true, message: `Кредиты успешно зачислены: ${promo.totalCredits}`, updatedUser: users[userIndex] };
};