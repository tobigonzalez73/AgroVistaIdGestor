import { X, Search, Plus, ArrowLeft } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { MOCK_USERS, chatService } from '../../services/chatService';
import { useState } from 'react';
import { useAuth } from '../../context/UserContext';

import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';

export default function ChatPanel() {
    const { isChatOpen, closeChat, activeConversationId, selectConversation, currentUser } = useChatContext();
    const { users: allRealUsers } = useAuth();
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const toggleUser = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleCreateChat = async () => {
        if (selectedUserIds.length === 0) return;
        setIsCreating(true);
        try {
            const type = selectedUserIds.length > 1 ? 'group' : 'direct';
            const participantIds = [currentUser.id, ...selectedUserIds];
            const participants = (allRealUsers.length > 0 ? allRealUsers : MOCK_USERS).filter(u => participantIds.includes(u.id));


            const newChatId = await chatService.createConversation(
                type,
                participantIds,
                participants,
                type === 'group' ? (groupName || 'Nuevo Grupo') : undefined
            );

            setIsCreatingNew(false);
            setSelectedUserIds([]);
            setGroupName('');
            selectConversation(newChatId);
        } catch (error) {
            console.error("Error creating chat:", error);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isChatOpen) return null;

    return (
        <>
            {/* Backdrop para móvil */}
            <div
                className="fixed inset-0 bg-slate-900/50 z-40 sm:hidden transition-opacity"
                onClick={closeChat}
                aria-hidden="true"
            />

            {/* Panel lateral */}
            <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header del ChatPanel (Lista de conversaciones) */}
                {!activeConversationId && !isCreatingNew && (
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex-1">Mensajes</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsCreatingNew(true)}
                                className="p-2 text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-full transition-all"
                                title="Nuevo mensaje interno"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            <button
                                onClick={closeChat}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Search Bar (Solo visible en lista de conversaciones) */}
                {!activeConversationId && !isCreatingNew && (
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar chats..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Contenido Principal */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {activeConversationId ? (
                        <ChatWindow onBack={() => { selectConversation(null); setIsCreatingNew(false); }} />
                    ) : isCreatingNew ? (
                        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
                            {/* New Chat Header */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <button
                                    onClick={() => { setIsCreatingNew(false); setSelectedUserIds([]); }}
                                    className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex-1">Nuevo mensaje interno</h3>
                                <button
                                    onClick={handleCreateChat}
                                    disabled={selectedUserIds.length === 0 || isCreating}
                                    className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-all hover:bg-green-700 active:scale-95"
                                >
                                    {isCreating ? 'Creando...' : 'Iniciar'}
                                </button>
                            </div>

                            {/* Participant Selection */}
                            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                                {selectedUserIds.length > 1 && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del grupo (con copia)</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Equipo Técnico, Labores Lote 4..."
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seleccionar participantes</label>
                                    <div className="space-y-2">
                                        {/* Use allRealUsers if available, fallback to MOCK_USERS if empty during sync */}
                                        {(allRealUsers.length > 0 ? allRealUsers : MOCK_USERS).filter(u => u.id !== currentUser.id).map(user => (

                                            <div
                                                key={user.id}
                                                onClick={() => toggleUser(user.id)}
                                                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border-2 ${selectedUserIds.includes(user.id)
                                                    ? 'bg-green-50 border-green-500 dark:bg-green-900/20'
                                                    : 'bg-white border-transparent hover:bg-slate-100 dark:bg-slate-800'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${selectedUserIds.includes(user.id)
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-slate-200 text-slate-500'
                                                    }`}>
                                                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-bold ${selectedUserIds.includes(user.id) ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {user.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">{user.email}</p>
                                                </div>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedUserIds.includes(user.id)
                                                    ? 'bg-green-500 border-green-500 text-white'
                                                    : 'border-slate-300'
                                                    }`}>
                                                    {selectedUserIds.includes(user.id) && <Plus className="w-3 h-3 rotate-45" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ConversationList />
                    )}
                </div>
            </div>
        </>
    );
}
