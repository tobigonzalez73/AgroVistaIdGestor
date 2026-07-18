import { useState, useRef, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, MoreVertical, Image as ImageIcon, FileText, Check, X, Shield, BellOff, Info, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface ChatWindowProps {
    onBack: () => void;
}

export default function ChatWindow({ onBack }: ChatWindowProps) {
    const navigate = useNavigate();
    const { activeConversation, messages, currentUser, sendMessage, updateConversation } = useChatContext();
    const [newMessage, setNewMessage] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);

    // Scroll al final cuando hay nuevos mensajes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Cerrar menú de opciones al clickear afuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!activeConversation) return null;

    let displayName = activeConversation.name || 'Chat';
    if (activeConversation.type === 'direct') {
        const otherUser = activeConversation.participants?.find(p => p.id !== currentUser.id);
        displayName = otherUser?.name || 'Usuario';
    }

    const handleSaveName = async () => {
        if (!tempName.trim()) {
            setIsEditingName(false);
            return;
        }
        try {
            await updateConversation({ name: tempName });
            setIsEditingName(false);
        } catch (error) {
            console.error("Error updating name:", error);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await sendMessage(newMessage);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    const handleFileAttach = () => {
        // En una implementación real, esto abriría un diálogo para subir archivos
        // y luego llamaria a chatService.uploadAttachment
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Simulamos el inicio de subida
            alert(`Simulando subida de: ${file.name}`);
            // TODO: implementar chatService.uploadAttachment
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
            {/* Header del chat */}
            <div className="flex items-center justify-between px-3 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        {isEditingName && activeConversation.type === 'group' ? (
                            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                <input
                                    autoFocus
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveName();
                                        if (e.key === 'Escape') setIsEditingName(false);
                                    }}
                                    className="text-base font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-green-500 w-full"
                                />
                                <button onClick={handleSaveName} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsEditingName(false)} className="p-1 text-slate-400 hover:bg-slate-50 rounded">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <h2
                                onClick={() => {
                                    if (activeConversation.type === 'group') {
                                        setTempName(displayName);
                                        setIsEditingName(true);
                                    }
                                }}
                                className={`text-base font-bold text-slate-800 dark:text-slate-100 truncate ${activeConversation.type === 'group' ? 'cursor-edit hover:text-green-600 transition-colors' : ''}`}
                                title={activeConversation.type === 'group' ? "Click para cambiar nombre" : ""}
                            >
                                {displayName}
                            </h2>
                        )}
                        {(activeConversation.linkedTrialId || activeConversation.linkedTaskId || activeConversation.linkedInventoryId || activeConversation.linkedFinanceId) && (
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-green-600 dark:text-green-500 font-bold uppercase tracking-wider">
                                    {activeConversation.linkedTaskId ? 'Labor vinculada' :
                                        activeConversation.linkedTrialId ? 'Ensayo vinculado' :
                                            activeConversation.linkedInventoryId ? 'Stock vinculado' : 'Registro vinculado'}
                                </p>
                                <button
                                    onClick={() => {
                                        if (activeConversation.linkedTaskId) {
                                            navigate(`/tareas?id=${activeConversation.linkedTaskId}`);
                                        } else if (activeConversation.linkedTrialId) {
                                            navigate(`/ensayos?id=${activeConversation.linkedTrialId}`);
                                        } else if (activeConversation.linkedInventoryId) {
                                            navigate(`/catalogos/productos?id=${activeConversation.linkedInventoryId}`);
                                        } else if (activeConversation.linkedFinanceId) {
                                            navigate(`/finanzas?id=${activeConversation.linkedFinanceId}`);
                                        }
                                    }}
                                    className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="Ver en el Sistema"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative" ref={optionsRef}>
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        className={`p-2 rounded-full transition-all ${showOptions ? 'bg-slate-100 text-slate-800 dark:bg-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {showOptions && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[60] animate-in fade-in zoom-in duration-150 origin-top-right">
                            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opciones de chat</p>
                            </div>

                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <Info className="w-4 h-4" />
                                <span>Info del {activeConversation.type === 'group' ? 'grupo' : 'contacto'}</span>
                            </button>

                            {activeConversation.type === 'group' && (
                                <button
                                    onClick={() => {
                                        setTempName(displayName);
                                        setIsEditingName(true);
                                        setShowOptions(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <Shield className="w-4 h-4" />
                                    <span>Cambiar nombre</span>
                                </button>
                            )}

                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <BellOff className="w-4 h-4" />
                                <span>Silenciar notificaciones</span>
                            </button>

                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium">
                                <Trash2 className="w-4 h-4" />
                                <span>{activeConversation.type === 'group' ? 'Salir del grupo' : 'Vaciar chat'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <p className="text-sm">No hay mensajes aún.</p>
                        <p className="text-xs mt-1">Escribe el primer mensaje abajo.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMine = msg.senderId === currentUser.id;
                        const showAvatar = !isMine && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                        const sender = activeConversation.participants?.find(p => p.id === msg.senderId);

                        return (
                            <div key={msg.id} className={`flex max-w-[85%] ${isMine ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}>
                                {!isMine && (
                                    <div className="w-8 shrink-0 mr-2 flex items-end">
                                        {showAvatar ? (
                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                {sender?.name?.charAt(0) || 'U'}
                                            </div>
                                        ) : <div className="w-6 h-6" />}
                                    </div>
                                )}

                                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                    {showAvatar && !isMine && (
                                        <span className="text-xs text-slate-500 ml-1 mb-1">{sender?.name}</span>
                                    )}
                                    <div
                                        className={`px-4 py-2 rounded-2xl text-sm ${isMine
                                            ? 'bg-green-600 text-white rounded-br-none'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                                        {/* Renderizado de adjuntos (Mock) */}
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="mt-2 space-y-2">
                                                {msg.attachments.map((att, i) => (
                                                    <div key={i} className={`p-2 rounded-lg flex items-center gap-2 ${isMine ? 'bg-green-700/50' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                        {att.type === 'image' ? <ImageIcon className="w-4 h-4 shrink-0" /> : <FileText className="w-4 h-4 shrink-0" />}
                                                        <span className="text-xs truncate max-w-[150px]">{att.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] text-slate-400 mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                                        {formatDistanceToNow(msg.createdAt)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleFileAttach}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />

                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className={`p-2 rounded-full flex items-center justify-center shrink-0 transition-colors ${newMessage.trim()
                            ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
