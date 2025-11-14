import React, { useState, useMemo, useEffect } from 'react';
import * as authService from '../services/authService';
import { ImageGallery } from './ImageGallery';
import { ImageModal } from './ImageModal';
import { GeneratedImage, ResolutionOption, UserFavorites, FavoritesCategory } from '../types';
import type { User } from '../services/authService';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;


const getImageResolutionOption = async (src: string): Promise<ResolutionOption> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.width / img.height;
            if (ratio > 1.2) resolve(ResolutionOption.Landscape);
            if (ratio < 0.8) resolve(ResolutionOption.Portrait);
            resolve(ResolutionOption.Square);
        };
        img.onerror = () => resolve(ResolutionOption.Square);
        img.src = src;
    });
};

interface AdminUserFavoritesViewProps {
  user: User;
  onBack: () => void;
  onFavoriteRemoved: (updatedUser: User) => void;
}

export const AdminUserFavoritesView: React.FC<AdminUserFavoritesViewProps> = ({ user, onBack, onFavoriteRemoved }) => {
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [activeTab, setActiveTab] = useState<'photos' | 'avatars'>('photos');
    const [activeFolderId, setActiveFolderId] = useState<string | 'root'>('root');
    const [imageObjects, setImageObjects] = useState<GeneratedImage[]>([]);

    const favorites = useMemo(() => user.favorites, [user.favorites]);
    const currentCategory = useMemo(() => favorites[activeTab] || { root: [], folders: [] }, [favorites, activeTab]);

    const imagesToShow = useMemo(() => {
        const sourceList = activeFolderId === 'root'
            ? currentCategory.root
            : currentCategory.folders.find(f => f.id === activeFolderId)?.images || [];
        
        return Promise.all(
            sourceList.map(async (src, index) => ({
                id: `fav_${user.username}_${activeTab}_${activeFolderId}_${index}`,
                src,
                prompt: 'Избранное изображение',
                status: 'success' as const,
                resolution: await getImageResolutionOption(src),
                backgroundPrompt: '',
            }))
        );
    }, [currentCategory, activeFolderId, activeTab, user.username]);

    useEffect(() => {
        imagesToShow.then(setImageObjects);
    }, [imagesToShow]);

    const handleTabChange = (tab: 'photos' | 'avatars') => {
        setActiveTab(tab);
        setActiveFolderId('root');
    };
    
    const handleRemoveFavorite = async (imageSrc: string) => {
        if (window.confirm('Вы уверены, что хотите удалить это изображение из избранного пользователя?')) {
            const { success, updatedUser } = authService.removeImageFromFavorites(user.username, imageSrc);
            if (success && updatedUser) {
                onFavoriteRemoved(updatedUser);
            }
            if (selectedImage?.src === imageSrc) {
                setSelectedImage(null);
            }
        }
    };
    
    const handleDownload = (src: string) => {
      const link = document.createElement('a');
      link.href = src;
      link.download = `favorite_${user.username}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        imageObjects.forEach((image, index) => {
            if (image.src) {
                setTimeout(() => handleDownload(image.src!), index * 300);
            }
        });
    };
    
    const folderName = activeFolderId === 'root' ? 'Корневая папка' : currentCategory.folders.find(f => f.id === activeFolderId)?.name;
    const totalImages = (favorites.photos?.root.length || 0) + (favorites.photos?.folders.reduce((sum, f) => sum + f.images.length, 0) || 0) + (favorites.avatars?.root.length || 0) + (favorites.avatars?.folders.reduce((sum, f) => sum + f.images.length, 0) || 0);

    return (
        <div>
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onBack} title="Назад к списку пользователей" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
                    <BackIcon />
                </button>
                <div>
                    <h1 className="text-3xl font-bold">Избранное пользователя</h1>
                    <p className="text-brand-text-secondary">Пользователь: <span className="font-semibold text-brand-accent">{user.username}</span> | Всего изображений: {totalImages}</p>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-64 flex-shrink-0">
                    <div className="mb-6 border-b border-brand-secondary">
                        <nav className="flex space-x-2">
                            <button onClick={() => handleTabChange('photos')} className={`flex-1 text-center py-2 px-4 text-sm font-medium ${activeTab === 'photos' ? 'border-b-2 border-brand-accent text-brand-accent' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}>Фото</button>
                            <button onClick={() => handleTabChange('avatars')} className={`flex-1 text-center py-2 px-4 text-sm font-medium ${activeTab === 'avatars' ? 'border-b-2 border-brand-accent text-brand-accent' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}>Аватары</button>
                        </nav>
                    </div>
                    <div className="space-y-2">
                        <button onClick={() => setActiveFolderId('root')} className={`w-full flex items-center p-2 rounded-md text-left ${activeFolderId === 'root' ? 'bg-brand-accent/20 text-brand-accent' : 'hover:bg-brand-secondary/50'}`}>
                            <FolderIcon />
                            <span>Корневая папка ({currentCategory.root.length})</span>
                        </button>
                        {currentCategory.folders.map(folder => (
                            <button key={folder.id} onClick={() => setActiveFolderId(folder.id)} className={`w-full flex items-center p-2 rounded-md text-left ${activeFolderId === folder.id ? 'bg-brand-accent/20 text-brand-accent' : 'hover:bg-brand-secondary/50'}`}>
                                <FolderIcon />
                                <span className="truncate">{folder.name} ({folder.images.length})</span>
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="flex-1">
                    {imageObjects.length > 0 ? (
                         <ImageGallery
                            images={imageObjects}
                            title={`${folderName} (${imageObjects.length})`}
                            isFavorite={() => true}
                            onAddToFavorites={() => {}}
                            onImageClick={setSelectedImage}
                            onDownload={handleDownload}
                            onDownloadAll={handleDownloadAll}
                            onDelete={(id) => {
                                const image = imageObjects.find(img => img.id === id);
                                if (image?.src) handleRemoveFavorite(image.src);
                            }}
                            onRegenerate={() => {}}
                        />
                    ) : (
                         <div className="text-center py-16 border-2 border-dashed border-brand-secondary rounded-lg">
                            <h2 className="text-xl font-semibold">Папка пуста</h2>
                            <p className="mt-2 text-brand-text-secondary">У пользователя нет изображений в этой папке.</p>
                        </div>
                    )}
                </main>
            </div>
            
            {selectedImage && (
                <ImageModal
                    image={selectedImage}
                    onClose={() => setSelectedImage(null)}
                    onDownload={handleDownload}
                    onRegenerate={() => {}}
                    onDelete={() => { if (selectedImage.src) handleRemoveFavorite(selectedImage.src); }}
                    isFavorite={true}
                    onAddToFavorites={() => {}}
                    onRemoveFromFavorites={(src) => handleRemoveFavorite(src)}
                    showRegenerate={false}
                />
            )}
        </div>
    );
};