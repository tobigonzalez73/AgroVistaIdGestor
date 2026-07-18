import { useState, useRef } from 'react';
import { Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { useWall } from '../../hooks/useWall';

export default function PostCreator() {
    const { createPost, currentUser } = useWall();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${e.target.scrollHeight}px`;
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if ((!content.trim() && selectedFiles.length === 0) || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const contentToSubmit = content.trim();
            const filesToSubmit = [...selectedFiles];

            // Reset state IMMEDIATELY for snappy feel
            setContent('');
            setSelectedFiles([]);
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }

            await createPost(contentToSubmit, filesToSubmit);
        } catch (error) {
            console.error("Error al publicar:", error);
            alert("Hubo un problema al publicar.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!currentUser) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 mb-8">
            <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-400 to-green-600 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg shadow-green-200 dark:shadow-none">
                    {(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleInput}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="¿Qué novedades hay en el campo hoy?"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 resize-none overflow-hidden min-h-[60px] text-base transition-all"
                        rows={1}
                    />

                    {selectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 px-2">
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="relative bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl px-3 py-2 flex items-center text-xs font-bold text-emerald-700 dark:text-emerald-400 max-w-[200px]">
                                    <span className="truncate">{file.name}</span>
                                    <button onClick={() => removeFile(idx)} className="ml-2 p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                        <div className="flex gap-1">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,video/*,.pdf,.doc,.docx" />
                            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Fotos o Cámara">
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Archivos">
                                <Paperclip className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={(!content.trim() && selectedFiles.length === 0) || isSubmitting}
                            className={`flex items-center px-6 py-2.5 rounded-full font-black text-sm transition-all shadow-md active:scale-95 ${(content.trim() || selectedFiles.length > 0) && !isSubmitting
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                                }`}
                        >
                            {isSubmitting ? 'Publicando...' : 'Publicar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
