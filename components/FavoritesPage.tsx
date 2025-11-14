import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ImageGallery } from './ImageGallery';
import { ImageModal } from './ImageModal';
import { GeneratedImage, ResolutionOption, FavoritesCategory } from '../types';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

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

interface FavoritesPageProps {
  onNavigateBack: (() => void) | null;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onNavigateBack }) => {
    const { currentUser, removeFavorite, isFavorite, createFolder, renameFolder, deleteFolder } = useAuth();
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [activeTab, setActiveTab] = useState<'photos' | 'avatars'>('photos');
    const [activeFolderId, setActiveFolderId] = useState<string | 'root'>('root');
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolder, setEditingFolder] = useState<{ id: string, name: string } | null>(null);

    const favorites = useMemo(() => currentUser?.favorites || { photos: { root: [], folders: [] }, avatars: { root: [], folders: [] } }, [currentUser]);
    const currentCategory = useMemo(() => favorites[activeTab], [favorites, activeTab]);

    const imagesToShow = useMemo(() => {
        const sourceList = activeFolderId === 'root'
            ? currentCategory.root
            : currentCategory.folders.find(f => f.id === activeFolderId)?.images || [];
        
        return Promise.all(
            sourceList.map(async (src, index) => ({
                id: `fav_${activeTab}_${activeFolderId}_${index}`,
                src,
                prompt: 'Избранное изображение',
                status: 'success' as const,
                resolution: await getImageResolutionOption(src),
                backgroundPrompt: '',
            }))
        );
    }, [currentCategory, activeFolderId, activeTab]);

    const [imageObjects, setImageObjects] = useState<GeneratedImage[]>([]);

    React.useEffect(() => {
        imagesToShow.then(setImageObjects);
    }, [imagesToShow]);

    const handleTabChange = (tab: 'photos' | 'avatars') => {
        setActiveTab(tab);
        setActiveFolderId('root');
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        await createFolder(activeTab, newFolderName.trim());
        setNewFolderName('');
    };

    const handleRenameFolder = async () => {
        if (!editingFolder || !editingFolder.name.trim()) return;
        await renameFolder(activeTab, editingFolder.id, editingFolder.name.trim());
        setEditingFolder(null);
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (window.confirm('Вы уверены, что хотите удалить эту папку? Все изображения в ней будут удалены из избранного.')) {
            const folder = currentCategory.folders.find(f => f.id === folderId);
            if (folder) {
                // We need to remove all images inside the folder first
                for (const imageSrc of folder.images) {
                    await removeFavorite(imageSrc);
                }
                await deleteFolder(activeTab, folderId);
                if (activeFolderId === folderId) {
                    setActiveFolderId('root');
                }
            }
        }
    };

    const handleRemoveFavorite = (imageSrc: string) => {
        removeFavorite(imageSrc);
        if (selectedImage?.src === imageSrc) {
            setSelectedImage(null);
        }
    };
    
    const handleDownload = (src: string) => {
      const link = document.createElement('a');
      link.href = src;
      link.download = `favorite_${Date.now()}.png`;
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
    const totalImages = favorites.photos.root.length + favorites.photos.folders.reduce((sum, f) => sum + f.images.length, 0) + favorites.avatars.root.length + favorites.avatars.folders.reduce((sum, f) => sum + f.images.length, 0);

    return (
        <div className="min-h-screen bg-brand-primary text-brand-text-primary">
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <header className="flex items-center gap-4 mb-8">
                    {onNavigateBack && <button onClick={onNavigateBack} title="Назад в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors"><BackIcon /></button>}
                    <div>
                        <h1 className="text-3xl font-bold">Избранное</h1>
                        <p className="text-brand-text-secondary">Всего изображений: {totalImages}</p>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-8">
                    <aside className="w-full md:w-64 flex-shrink-0">
                        <div className="mb-6 border-b border-brand-secondary">
                            <nav className="flex space-x-2">
                                <button onClick={() => handleTabChange('photos')} className={`flex-1 text-center py-2 px-4 text-sm font-medium ${activeTab === 'photos' ? 'border-b-2 border-brand-accent text-brand-accent' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}>Мои Фото</button>
                                <button onClick={() => handleTabChange('avatars')} className={`flex-1 text-center py-2 px-4 text-sm font-medium ${activeTab === 'avatars' ? 'border-b-2 border-brand-accent text-brand-accent' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}>Мои Аватары</button>
                            </nav>
                        </div>
                        <div className="space-y-2">
                            <button onClick={() => setActiveFolderId('root')} className={`w-full flex items-center p-2 rounded-md text-left ${activeFolderId === 'root' ? 'bg-brand-accent/20 text-brand-accent' : 'hover:bg-brand-secondary/50'}`}>
                                <FolderIcon />
                                <span>Корневая папка ({currentCategory.root.length})</span>
                            </button>
                            {currentCategory.folders.map(folder => (
                                <div key={folder.id} className={`w-full flex items-center p-2 rounded-md group ${activeFolderId === folder.id ? 'bg-brand-accent/20 text-brand-accent' : 'hover:bg-brand-secondary/50'}`}>
                                    <button onClick={() => setActiveFolderId(folder.id)} className="flex-grow flex items-center text-left">
                                        <FolderIcon />
                                        <span className="truncate">{folder.name} ({folder.images.length})</span>
                                    </button>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button onClick={() => setEditingFolder({ id: folder.id, name: folder.name })} className="text-brand-text-secondary hover:text-white"><EditIcon /></button>
                                        <button onClick={() => handleDeleteFolder(folder.id)} className="text-brand-text-secondary hover:text-red-500"><DeleteIcon /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleCreateFolder} className="mt-4 pt-4 border-t border-brand-secondary">
                            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Новая папка..." className="w-full px-3 py-2 text-sm text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-brand-accent"/>
                            <button type="submit" disabled={!newFolderName.trim()} className="w-full mt-2 py-2 text-sm font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400 disabled:bg-gray-600">Создать</button>
                        </form>
                    </aside>

                    <main className="flex-1">
                        {imageObjects.length > 0 ? (
                             <ImageGallery
                                images={imageObjects}
                                title={`${folderName} (${imageObjects.length})`}
                                isFavorite={() => true}
                                onAddToFavorites={() => {}} // Should not be possible from here
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
                                <p className="mt-2 text-brand-text-secondary">Добавьте сюда изображения со страниц генерации.</p>
                            </div>
                        )}
                    </main>
                </div>
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
                    onRemoveFromFavorites={() => { if (selectedImage.src) handleRemoveFavorite(selectedImage.src); }}
                    showRegenerate={false}
                />
            )}
             {editingFolder && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={() => setEditingFolder(null)}>
                    <div className="bg-brand-secondary p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">Переименовать папку</h3>
                        <input type="text" value={editingFolder.name} onChange={e => setEditingFolder({ ...editingFolder, name: e.target.value })} className="w-full px-3 py-2 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        <div className="flex justify-end gap-4 mt-4">
                            <button onClick={() => setEditingFolder(null)} className="py-2 px-4 text-sm font-bold bg-slate-600 hover:bg-slate-500 rounded-lg">Отмена</button>
                            <button onClick={handleRenameFolder} className="py-2 px-4 text-sm font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400">Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};