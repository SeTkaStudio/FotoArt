import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { UserFavorites } from '../types';

interface AddToFavoritesModalProps {
  imageSrc: string;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const AddToFavoritesModal: React.FC<AddToFavoritesModalProps> = ({ imageSrc, onClose }) => {
  const { currentUser, addFavorite, createFolder } = useAuth();
  const [step, setStep] = useState<'category' | 'folder'>('category');
  const [selectedCategory, setSelectedCategory] = useState<'photos' | 'avatars' | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCategorySelect = (category: 'photos' | 'avatars') => {
    setSelectedCategory(category);
    setStep('folder');
  };

  const handleSave = async (folderId: string | 'root') => {
    if (!selectedCategory) return;
    setIsLoading(true);
    await addFavorite(imageSrc, selectedCategory, folderId);
    setIsLoading(false);
    onClose();
  };

  const handleCreateFolderAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !newFolderName.trim()) return;
    setIsLoading(true);
    const result = await createFolder(selectedCategory, newFolderName.trim());
    if (result.success && result.newFolderId) {
      await addFavorite(imageSrc, selectedCategory, result.newFolderId);
      onClose();
    } else {
      console.error("Failed to create folder");
      setIsLoading(false);
    }
  };


  const favorites: UserFavorites = currentUser?.favorites || {
    photos: { root: [], folders: [] },
    avatars: { root: [], folders: [] },
  };
  
  const currentFolders = selectedCategory ? favorites[selectedCategory].folders : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-brand-secondary p-6 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Добавить в избранное</h3>
          <button onClick={onClose} className="text-brand-text-secondary hover:text-white">
            <CloseIcon />
          </button>
        </div>

        {isLoading && <div className="flex justify-center items-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div></div>}

        {!isLoading && step === 'category' && (
          <div className="space-y-4">
            <p className="text-brand-text-secondary">Куда вы хотите сохранить это изображение?</p>
            <button onClick={() => handleCategorySelect('photos')} className="w-full text-left p-4 bg-brand-primary hover:bg-slate-700 rounded-lg transition-colors">
              <h4 className="font-semibold">Мои Фото</h4>
              <p className="text-xs text-brand-text-secondary">Для обычных сгенерированных изображений.</p>
            </button>
            <button onClick={() => handleCategorySelect('avatars')} className="w-full text-left p-4 bg-brand-primary hover:bg-slate-700 rounded-lg transition-colors">
              <h4 className="font-semibold">Мои Аватары</h4>
              <p className="text-xs text-brand-text-secondary">Для аватаров и персонажей, созданных в конструкторе.</p>
            </button>
          </div>
        )}
        
        {!isLoading && step === 'folder' && selectedCategory && (
            <div>
                 <button onClick={() => setStep('category')} className="text-sm text-brand-accent mb-4">&larr; Назад к выбору категории</button>
                 <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    <button onClick={() => handleSave('root')} className="w-full text-left p-3 bg-brand-primary hover:bg-slate-700 rounded-lg transition-colors">
                        <span className="font-semibold">Положить (в корневую папку)</span>
                    </button>
                    {currentFolders.map(folder => (
                        <button key={folder.id} onClick={() => handleSave(folder.id)} className="w-full text-left p-3 bg-brand-primary hover:bg-slate-700 rounded-lg transition-colors">
                            <span>{folder.name}</span>
                        </button>
                    ))}
                 </div>
                 <form onSubmit={handleCreateFolderAndSave} className="mt-4 pt-4 border-t border-brand-primary">
                     <label htmlFor="new-folder" className="text-sm font-medium text-brand-text-secondary">Или создать новую папку:</label>
                     <div className="flex gap-2 mt-1">
                         <input 
                            id="new-folder"
                            type="text"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            placeholder="Название папки"
                            className="flex-grow px-3 py-2 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
                         />
                         <button type="submit" disabled={!newFolderName.trim()} className="py-2 px-4 font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400 disabled:bg-gray-500">
                             Создать и добавить
                         </button>
                     </div>
                 </form>
            </div>
        )}

      </div>
    </div>
  );
};