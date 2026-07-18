import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Paperclip, X, FlaskConical, Sprout, Box } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { useAuth } from '../../context/UserContext';
import { chatService } from '../../services/chatService';
import type { Message } from '../../types/chat';

interface SidebarChatProps {
    linkedTrialId?: string;
    linkedTaskId?: string;
    linkedInventoryId?: string;
    linkedFinanceId?: string;
    title: string;
    subtitle?: string;
    onClose?: () => void;
}

export default function SidebarChat({ linkedTrialId, linkedTaskId, linkedInventoryId, linkedFinanceId, title, subtitle, onClose }: SidebarChatProps) {
    const { conversations, selectConversation, activeConversationId, messages, sendMessage, setFilterByTrialId, setFilterByTaskId, setFilterByInventoryId, setFilterByFinanceId } = useChatContext();
    const { users, currentUser } = useAuth();
    const [inputText, setInputText] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Filtered by context
    useEffect(() => {
        if (linkedTrialId) setFilterByTrialId(linkedTrialId);
        if (linkedTaskId) setFilterByTaskId(linkedTaskId);
        if (linkedInventoryId) setFilterByInventoryId(linkedInventoryId);
        if (linkedFinanceId) setFilterByFinanceId(linkedFinanceId);

        return () => {
            setFilterByTrialId(null);
            setFilterByTaskId(null);
            setFilterByInventoryId(null);
            setFilterByFinanceId(null);
        };
    }, [linkedTrialId, linkedTaskId, linkedInventoryId, linkedFinanceId, setFilterByTrialId, setFilterByTaskId, setFilterByInventoryId, setFilterByFinanceId]);

    // Find or create conversation for this entity
    useEffect(() => {
        const findOrCreateConversation = async () => {
            if (!linkedTrialId && !linkedTaskId && !linkedInventoryId && !linkedFinanceId) return;

            const existing = conversations.find(c =>
                (linkedTrialId && c.linkedTrialId === linkedTrialId) ||
                (linkedTaskId && c.linkedTaskId === linkedTaskId) ||
                (linkedInventoryId && c.linkedInventoryId === linkedInventoryId) ||
                (linkedFinanceId && c.linkedFinanceId === linkedFinanceId)
            );

            if (existing) {
                if (activeConversationId !== existing.id) {
                    selectConversation(existing.id);
                }
            } else if (!isCreating) {
                setIsCreating(true);
                try {
                    const participantIds = users.map(u => u.id);
                    const newId = await chatService.createConversation(
                        'group',
                        participantIds,
                        users,
                        title,
                        linkedTrialId,
                        linkedTaskId,
                        linkedInventoryId,
                        linkedFinanceId
                    );
                    selectConversation(newId);
                } catch (error) {
                    console.error("Error creating sidebar chat:", error);
                } finally {
                    setIsCreating(false);
                }
            }
        };

        findOrCreateConversation();
    }, [linkedTrialId, linkedTaskId, linkedInventoryId, linkedFinanceId, conversations.length, activeConversationId, selectConversation, title, users, isCreating]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        await sendMessage(inputText);
        setInputText('');
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    const getSenderName = (senderId: string) => {
        return users.find(u => u.id === senderId)?.name || 'Usuario';
    };

    const isMe = (senderId: string) => senderId === currentUser.id;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md border-l border-slate-200 dark:border-slate-700 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${linkedTrialId ? 'bg-green-100 text-green-600' :
                            linkedTaskId ? 'bg-blue-100 text-blue-600' :
                                linkedInventoryId ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'} dark:bg-slate-700`}>
                            {linkedTrialId ? <FlaskConical className="w-4 h-4" /> :
                                linkedTaskId ? <Sprout className="w-4 h-4" /> :
                                    linkedInventoryId ? <Box className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[180px]">{title}</h3>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                {subtitle && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider pl-10">{subtitle}</p>}
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white/30 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">No hay mensajes todavía. Sé el primero en escribir sobre esta labor.</p>
                    </div>
                ) : (
                    messages.map((msg: Message, idx) => (
                        <div key={msg.id || idx} className={`flex flex-col ${isMe(msg.senderId) ? 'items-end' : 'items-start'}`}>
                            {!isMe(msg.senderId) && (
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 ml-2">
                                    {getSenderName(msg.senderId)}
                                </span>
                            )}
                            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${isMe(msg.senderId)
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                                }`}>
                                {msg.text}
                            </div>
                            <span className={`text-[9px] text-slate-400 mt-1 ${isMe(msg.senderId) ? 'mr-1' : 'ml-1'}`}>
                                {formatTime(msg.createdAt)}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
                <div className="relative flex items-end gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder="Escribe un mensaje..."
                            className="w-full pl-4 pr-10 py-3 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none min-h-[44px] max-h-32 text-slate-900 dark:text-slate-100"
                            rows={1}
                        />
                        <button
                            type="button"
                            className="absolute right-3 bottom-3 text-slate-400 hover:text-indigo-500 transition-colors"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl transition-all shadow-md active:scale-95 flex-shrink-0"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
                    Las conversaciones quedan guardadas vinculadas a este registro.
                </p>
            </form>
        </div>
    );
}
