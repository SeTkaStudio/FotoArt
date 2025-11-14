import React from 'react';

interface MenuPageProps {
  onNavigateToAdapter: () => void;
  onNavigateHome: () => void;
  onNavigateToGeneration: () => void;
  onNavigateToFaceSelection: () => void;
}

const ToolIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-accent mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.424V8.576a2 2 0 00-1.106-1.789l-6-3.464a2 2 0 00-1.788 0l-6 3.464A2 2 0 003 8.576v6.848a2 2 0 001.106 1.789l6 3.464a2 2 0 001.788 0l6-3.464A2 2 0 0021 15.424z"></path>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.5 12.5l2 2 5-5"></path>
    </svg>
);


export const MenuPage: React.FC<MenuPageProps> = ({ onNavigateToAdapter, onNavigateHome, onNavigateToGeneration, onNavigateToFaceSelection }) => {
  const tools = [
    { name: 'Генерация фото', enabled: true, action: onNavigateToGeneration },
    { name: 'Портретный адаптер', enabled: true, action: onNavigateToAdapter },
    { name: 'Создание аватара', enabled: true, action: onNavigateToFaceSelection },
    { name: 'Фотосессия', enabled: false, action: () => {} },
    { name: 'Редактирование', enabled: false, action: () => {} },
    { name: 'Улучшение фото', enabled: false, action: () => {} },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-brand-primary text-brand-text-primary">
        <div className="text-center max-w-5xl w-full">
            <h1 className="text-4xl md:text-6xl font-bold mb-2 text-brand-accent">Инструменты SeTka Project</h1>
            <p className="text-md md:text-lg text-brand-text-secondary mb-12">Выберите один из доступных инструментов для начала работы.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => (
                    <button
                        key={tool.name}
                        onClick={tool.action}
                        disabled={!tool.enabled}
                        className={`group relative p-8 bg-brand-secondary/40 rounded-lg border border-brand-secondary hover:border-brand-accent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-brand-secondary flex flex-col items-center justify-center text-center`}
                    >
                       <ToolIcon />
                       <span className="text-lg font-semibold text-brand-text-primary">{tool.name}</span>
                       {!tool.enabled && <span className="absolute top-3 right-3 text-xs bg-amber-500/20 text-amber-400 font-semibold px-2 py-1 rounded-full">Скоро</span>}
                       {tool.enabled && <span className="absolute inset-0 bg-brand-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></span>}
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};
