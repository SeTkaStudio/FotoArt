import React, { useCallback, useEffect } from 'react';
import { ImageFile, ResolutionOption } from '../types';

interface FileUploadProps {
  id: string;
  onFileSelect: (file: ImageFile | null) => void;
  selectedFile: ImageFile | null;
  label: string;
  description: string;
  targetResolution: ResolutionOption;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const getAspectRatio = (resolution: ResolutionOption): number => {
    switch (resolution) {
        case ResolutionOption.Landscape: return 16 / 9;
        case ResolutionOption.Portrait: return 9 / 16;
        case ResolutionOption.Square:
        default: return 1;
    }
}

const processImage = (file: File, targetResolution: ResolutionOption): Promise<ImageFile> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const targetAspectRatio = getAspectRatio(targetResolution);
                const CANVAS_WIDTH = 1024; // Base width for consistency
                const CANVAS_HEIGHT = CANVAS_WIDTH / targetAspectRatio;

                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;

                const imgAspectRatio = img.width / img.height;

                let drawWidth = canvas.width;
                let drawHeight = canvas.height;
                let x = 0;
                let y = 0;

                // If image is wider than target aspect ratio
                if (imgAspectRatio > targetAspectRatio) {
                    drawHeight = canvas.width / imgAspectRatio;
                    y = (canvas.height - drawHeight) / 2;
                } else { // If image is taller or same aspect ratio
                    drawWidth = canvas.height * imgAspectRatio;
                    x = (canvas.width - drawWidth) / 2;
                }

                // Fill background
                ctx.fillStyle = '#1e293b'; // bg-brand-primary from tailwind config
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw the image centered
                ctx.drawImage(img, x, y, drawWidth, drawHeight);

                const dataUrl = canvas.toDataURL(file.type, 0.9);
                const base64String = dataUrl.split(',')[1];
                
                resolve({
                    preview: dataUrl,
                    base64: base64String,
                    mimeType: file.type,
                    originalFile: file,
                });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}


export const FileUpload: React.FC<FileUploadProps> = ({ id, onFileSelect, selectedFile, label, description, targetResolution }) => {
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const processedFile = await processImage(file, targetResolution);
      onFileSelect(processedFile);
    }
    event.target.value = '';
  };
  
  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onFileSelect(null);
  }
  
  const reprocessImage = useCallback(async () => {
      if (selectedFile?.originalFile) {
          const processedFile = await processImage(selectedFile.originalFile, targetResolution);
          onFileSelect(processedFile);
      }
  }, [selectedFile, targetResolution, onFileSelect]);

  useEffect(() => {
      reprocessImage();
  }, [targetResolution]);


  return (
    <div>
      <label className="block text-sm font-medium text-brand-text-secondary mb-1">{label}</label>
      <div className="mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-brand-secondary border-dashed rounded-md h-48 relative overflow-hidden group">
        {selectedFile ? (
          <>
            <img src={selectedFile.preview} alt="Preview" className="object-contain h-full w-full" />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm">Нажмите, чтобы изменить</p>
            </div>
            <button 
                onClick={handleDelete}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors z-10"
                aria-label="Удалить изображение"
                title="Удалить"
            >
                <CloseIcon />
            </button>
          </>
        ) : (
          <div className="space-y-1 text-center">
            <UploadIcon />
            <div className="flex text-sm text-brand-text-secondary">
              <span className="relative cursor-pointer bg-brand-primary rounded-md font-medium text-brand-accent hover:text-amber-400 focus-within:outline-none">
                <span>Загрузите файл</span>
              </span>
              <p className="pl-1">или перетащите</p>
            </div>
            <p className="text-xs text-brand-text-secondary">PNG, JPG</p>
          </div>
        )}
        <input id={id} name={id} type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg" />
         <label htmlFor={id} className="absolute inset-0 cursor-pointer"></label>
      </div>
      <p className="mt-2 text-xs text-brand-text-secondary">{description}</p>
    </div>
  );
};