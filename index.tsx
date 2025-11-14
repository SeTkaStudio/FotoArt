import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MenuPage } from './components/MenuPage';
import { PhotoGenerationPage } from './components/PhotoGenerationPage';
import { FaceSelectionPage } from './components/FaceSelectionPage';
import { UserLoginPage } from './components/UserLoginPage';
import { LoginPage } from './components/LoginPage';
import { AdminPage } from './components/AdminPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CreditsDisplay } from './components/CreditsDisplay';
import { ProfilePage } from './components/ProfilePage';
import { FavoritesPage } from './components/FavoritesPage';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const AppRouter: React.FC = () => {
    const { isAuthenticated, logout } = useAuth();
    const [page, setPage] = useState('menu');

    useEffect(() => {
        if (!isAuthenticated) {
            setPage('menu');
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <UserLoginPage />;
    }
    
    const navigateTo = (targetPage: string) => setPage(targetPage);
    
    const navigateToMenu = () => setPage('menu');
    const navigateToAdapter = () => navigateTo('adapter');
    const navigateToGeneration = () => navigateTo('generation');
    const navigateToFaceSelection = () => navigateTo('faceSelection');
    const navigateToProfile = () => navigateTo('profile');
    const navigateToFavorites = () => navigateTo('favorites');

    const handleLogout = () => {
        logout();
        setPage('menu');
    };

    let currentPage;
    switch (page) {
        case 'menu':
            currentPage = <MenuPage onNavigateToAdapter={navigateToAdapter} onNavigateHome={navigateToMenu} onNavigateToGeneration={navigateToGeneration} onNavigateToFaceSelection={navigateToFaceSelection} />;
            break;
        case 'adapter':
            currentPage = <App onNavigateHome={navigateToMenu} />;
            break;
        case 'generation':
            currentPage = <PhotoGenerationPage onNavigateBack={navigateToMenu} />;
            break;
        case 'faceSelection':
            currentPage = <FaceSelectionPage onNavigateBack={navigateToMenu} />;
            break;
        case 'profile':
            currentPage = <ProfilePage onNavigateBack={navigateToMenu} />;
            break;
        case 'favorites':
            currentPage = <FavoritesPage onNavigateBack={navigateToMenu} />;
            break;
        default:
            currentPage = <MenuPage onNavigateToAdapter={navigateToAdapter} onNavigateHome={navigateToMenu} onNavigateToGeneration={navigateToGeneration} onNavigateToFaceSelection={navigateToFaceSelection} />;
    }

    return (
        <>
            <CreditsDisplay onLogout={handleLogout} onProfileClick={navigateToProfile} onFavoritesClick={navigateToFavorites} />
            {currentPage}
        </>
    );
};


const Main: React.FC = () => {
  type View = 'app' | 'login' | 'admin';
  const [view, setView] = useState<View>('app');

  useEffect(() => {
    const determineView = () => {
      if (window.location.hash === '#admin') {
        // Проверяем, есть ли в sessionStorage флаг админа
        if (sessionStorage.getItem('isAdminAuthenticated')) {
            setView('admin');
        } else {
            setView('login');
        }
      } else {
        setView('app');
      }
    };

    determineView();
    window.addEventListener('hashchange', determineView);
    return () => window.removeEventListener('hashchange', determineView);
  }, []);
  
  const handleLoginSuccess = () => {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      setView('admin');
  };
  
  const handleAdminLogout = () => {
      sessionStorage.removeItem('isAdminAuthenticated');
      window.location.hash = '';
      setView('app');
  };
  
  switch (view) {
    case 'login':
      return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    case 'admin':
      return <AdminPage onLogout={handleAdminLogout} />;
    case 'app':
    default:
      return <AppRouter />;
  }
};


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
        <Main />
    </AuthProvider>
  </React.StrictMode>
);