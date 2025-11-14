import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

interface ProfilePageProps {
  onNavigateBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateBack }) => {
  const { currentUser, redeemPromoCode, updateUserApiKey, updatePaymentMethod } = useAuth();
  
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState({ text: '', isError: false });
  
  const [apiKey, setApiKey] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'apiKey'>('credits');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (currentUser) {
      setApiKey(currentUser.apiKey || '');
      setPaymentMethod(currentUser.paymentMethod);
    }
  }, [currentUser]);
  
  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode) return;
    const result = await redeemPromoCode(promoCode.trim().toUpperCase());
    setPromoMessage({ text: result.message, isError: !result.success });
    if (result.success) {
      setPromoCode('');
    }
  };

  const handleProfileSave = async () => {
    setSaveStatus('Сохранение...');
    const keySuccess = await updateUserApiKey(apiKey);
    const methodSuccess = await updatePaymentMethod(paymentMethod);
    if (keySuccess && methodSuccess) {
      setSaveStatus('Сохранено успешно!');
    } else {
      setSaveStatus('Ошибка сохранения.');
    }
    setTimeout(() => setSaveStatus(''), 3000);
  };

  if (!currentUser) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Загрузка данных пользователя...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-primary text-brand-text-primary p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
            <button onClick={onNavigateBack} title="Назад в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
                <BackIcon />
            </button>
            <div>
                <h1 className="text-3xl font-bold">Профиль пользователя</h1>
                <p className="text-brand-text-secondary">Пользователь: <span className="font-semibold text-brand-accent">{currentUser.username}</span></p>
            </div>
        </header>

        <div className="space-y-8">
            {/* Promo Code Section */}
            <section className="bg-brand-secondary/50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Пополнить кредиты</h2>
                <p className="text-sm text-brand-text-secondary mb-4">
                    Введите промокод, чтобы добавить кредиты на ваш баланс. Текущий баланс: <span className="font-bold text-brand-accent">{currentUser.credits}</span>
                </p>
                <form onSubmit={handleRedeemPromo} className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-full">
                        <input 
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="Ваш промокод"
                            className="w-full px-3 py-2 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent uppercase"
                        />
                         {promoMessage.text && (
                            <p className={`mt-2 text-xs ${promoMessage.isError ? 'text-red-400' : 'text-green-400'}`}>
                                {promoMessage.text}
                            </p>
                         )}
                    </div>
                    <button type="submit" disabled={!promoCode} className="w-full sm:w-auto py-2 px-6 font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                        Применить
                    </button>
                </form>
            </section>
            
            {/* API Key and Payment Method Section */}
            <section className="bg-brand-secondary/50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Настройки генерации</h2>
                
                <div className="space-y-4 mb-6">
                    <label htmlFor="api-key-input" className="block text-sm font-medium text-brand-text-secondary">Ваш Google Gemini API ключ (опционально)</label>
                    <input
                        id="api-key-input"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Введите ваш API ключ"
                        className="w-full px-3 py-2 text-brand-text-primary bg-brand-primary border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent font-mono"
                    />
                     <p className="text-xs text-brand-text-secondary">
                        Ваш ключ хранится только в вашем браузере и используется для генераций, если выбран соответствующий способ оплаты.
                    </p>
                </div>

                <div className="space-y-2 mb-6">
                    <h3 className="text-sm font-medium text-brand-text-secondary">Способ оплаты генераций</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                       <label className={`flex-1 p-4 rounded-md border-2 cursor-pointer ${paymentMethod === 'credits' ? 'border-brand-accent bg-brand-accent/10' : 'border-brand-primary hover:border-slate-600'}`}>
                           <input type="radio" name="paymentMethod" value="credits" checked={paymentMethod === 'credits'} onChange={() => setPaymentMethod('credits')} className="sr-only"/>
                           <span className="font-semibold">Использовать кредиты</span>
                           <p className="text-xs text-brand-text-secondary mt-1">Генерации будут оплачиваться с вашего внутреннего баланса кредитов.</p>
                       </label>
                        <label className={`flex-1 p-4 rounded-md border-2 cursor-pointer ${paymentMethod === 'apiKey' ? 'border-brand-accent bg-brand-accent/10' : 'border-brand-primary hover:border-slate-600'}`}>
                           <input type="radio" name="paymentMethod" value="apiKey" checked={paymentMethod === 'apiKey'} onChange={() => setPaymentMethod('apiKey')} className="sr-only"/>
                           <span className="font-semibold">Использовать свой API ключ</span>
                           <p className="text-xs text-brand-text-secondary mt-1">Генерации будут использовать ваш личный API ключ. Кредиты не списываются.</p>
                       </label>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={handleProfileSave} className="py-2 px-6 font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400 transition-colors">
                        Сохранить
                    </button>
                    {saveStatus && <p className="text-sm text-green-400">{saveStatus}</p>}
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};
