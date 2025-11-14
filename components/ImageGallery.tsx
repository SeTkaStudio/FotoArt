import React from 'react';
import { GeneratedImage, ResolutionOption } from '../types';

interface ImageGalleryProps {
  images: GeneratedImage[];
  title: string;
  onDownload: (src: string) => void;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
  onDownloadAll: () => void;
  onImageClick: (image: GeneratedImage) => void;
  isFavorite: (imageSrc: string) => boolean;
  onAddToFavorites: (imageSrc: string) => void;
}

const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>
);

const ErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PlaceholderCard = () => (
    <div className="aspect-video bg-brand-secondary rounded-lg flex items-center justify-center">
        <svg className="w-10 h-10 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"></path>
        </svg>
    </div>
);

const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const RegenerateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l16 16" transform="rotate(90 12 12)"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const StarIcon = ({ isFavorite }: { isFavorite: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isFavorite ? 'text-yellow-400' : 'text-white'}`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const getAspectRatioClass = (resolution: ResolutionOption | undefined): string => {
    if (!resolution) return 'aspect-square';
    switch (resolution) {
        case ResolutionOption.Square: return 'aspect-square';
        case ResolutionOption.Landscape: return 'aspect-video';
        case ResolutionOption.Portrait: return 'aspect-[9/16]';
        default: return 'aspect-square';
    }
};

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title, onDownload, onRegenerate, onDelete, onDownloadAll, onImageClick, isFavorite, onAddToFavorites }) => {
  if (images.length === 0) {
    return (
        <div className="p-4 md:p-8">
            <h2 className="text-xl font-bold mb-4 text-brand-text-primary">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, index) => <PlaceholderCard key={index} />)}
            </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-4 border-b border-brand-secondary pb-4">
        <h2 className="text-xl font-bold text-brand-text-primary">{title}</h2>
        {images.some(img => img.status === 'success' && img.src) && (
            <button 
                onClick={onDownloadAll}
                className="flex items-center gap-2 text-sm bg-brand-secondary hover:bg-slate-600 text-brand-text-secondary font-semibold py-2 px-3 rounded-md transition-colors"
                title="Скачать все сгенерированные изображения"
            >
                <DownloadIcon />
                <span>Скачать все</span>
            </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4">
        {images.map((image) => {
          const isFav = image.src ? isFavorite(image.src) : false;
          return (
            <div 
              key={image.id} 
              className={`${getAspectRatioClass(image.resolution)} bg-brand-secondary rounded-lg overflow-hidden flex items-center justify-center group relative ${image.status === 'success' ? 'cursor-pointer' : ''}`}
              onClick={() => image.status === 'success' && onImageClick(image)}
            >
              {image.status === 'pending' && <LoadingSpinner />}
              {image.status === 'error' && <ErrorIcon />}
              {image.status === 'success' && image.src && (
                  <>
                      <img src={image.src} alt="Generated portrait" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <button
                          onClick={(e) => { e.stopPropagation(); isFav ? onDelete(image.id) : onAddToFavorites(image.src!); }}
                          title={isFav ? "Убрать из избранного" : "Добавить в избранное"}
                          className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
                      >
                          <StarIcon isFavorite={isFav} />
                      </button>
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-white text-xs truncate mb-2">{image.prompt}</p>
                          <div className="flex justify-around items-center">
                             <button onClick={(e) => { e.stopPropagation(); onDownload(image.src!); }} title="Скачать" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"><DownloadIcon /></button>
                             <button 
                                  onClick={(e) => { e.stopPropagation(); onRegenerate(image.id); }} 
                                  title="Перегенерировать"
                                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                             >
                                  <RegenerateIcon />
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); onDelete(image.id); }} title="Удалить" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"><DeleteIcon /></button>
                          </div>
                      </div>
                  </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};