
import React, { useState, useCallback } from 'react';
import { generateImagesFromPrompt } from './services/geminiService';
import { SelectInput } from './components/SelectInput';
import { Spinner } from './components/Spinner';
import { MODELS, ASPECT_RATIOS, IMAGE_COUNTS } from './constants';
import type { AspectRatio } from './types';

const App: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('A majestic lion wearing a crown, cinematic lighting, hyper-detailed photo.');
    const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0].id);
    const [selectedImageCount, setSelectedImageCount] = useState<number>(IMAGE_COUNTS[0].id);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateClick = useCallback(async () => {
        if (!prompt.trim()) {
            setError("Please enter a prompt to generate images.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const images = await generateImagesFromPrompt({
                prompt,
                model: selectedModel,
                aspectRatio: selectedAspectRatio,
                numberOfImages: selectedImageCount,
            });
            setGeneratedImages(images);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, selectedModel, selectedAspectRatio, selectedImageCount]);

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-6xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        AI Image Generator
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">
                        Craft stunning visuals from your words. Powered by Google Gemini.
                    </p>
                </header>

                <main>
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700">
                        <div className="flex flex-col gap-6">
                            <div>
                                <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-400 mb-2">
                                    Your Prompt
                                </label>
                                <textarea
                                    id="prompt-input"
                                    rows={3}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., A futuristic city skyline at sunset, with flying cars..."
                                    className="w-full p-3 text-base text-white bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out resize-none"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                                <SelectInput
                                    label="Model"
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    options={MODELS}
                                    disabled={isLoading}
                                    icon={<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>}
                                />
                                <SelectInput
                                    label="Aspect Ratio"
                                    value={selectedAspectRatio}
                                    onChange={(e) => setSelectedAspectRatio(e.target.value as AspectRatio)}
                                    options={ASPECT_RATIOS}
                                    disabled={isLoading}
                                    icon={<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v4m0 0h-4m4 0l-5-5"></path></svg>}
                                />
                                <SelectInput
                                    label="Number of Images"
                                    value={selectedImageCount}
                                    onChange={(e) => setSelectedImageCount(Number(e.target.value))}
                                    options={IMAGE_COUNTS}
                                    disabled={isLoading}
                                    icon={<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>}
                                />
                            </div>
                            <button
                                onClick={handleGenerateClick}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                        Generate Images
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="mt-8">
                        {isLoading && <Spinner message="Conjuring pixels from the digital ether..."/>}
                        {error && (
                            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                                <strong className="font-bold">Oh no! </strong>
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}
                        {generatedImages.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {generatedImages.map((src, index) => (
                                    <div key={index} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                                        <img
                                            src={src}
                                            alt={`Generated image ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                         {!isLoading && !error && generatedImages.length === 0 && (
                            <div className="text-center py-16 px-6 bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <h3 className="mt-2 text-xl font-medium text-gray-300">Your creations will appear here</h3>
                                <p className="mt-1 text-sm text-gray-500">Enter a prompt and click "Generate" to start.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
