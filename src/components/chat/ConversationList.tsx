import { useChatContext } from '../../context/ChatContext';
import { formatDistanceToNow } from '../../utils/dateUtils'; // We'll create a simple date util
import { Users, FlaskConical } from 'lucide-react';

export default function ConversationList() {
    const { conversations, selectConversation, currentUser, loadingConversations } = useChatContext();

    if (loadingConversations) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No tienes mensajes</h3>
                <p className="text-sm">Inicia una nueva conversación con tu equipo o crea un chat para un ensayo específico.</p>
            </div>
        );
    }

    return (
        <div className="overflow-y-auto h-full px-2 py-2 cursor-pointer">
            {conversations.map(conv => {
                const unread = conv.unreadCount?.[currentUser.id] || 0;

                // Determinar el nombre a mostrar (Nombre del grupo, o el nombre del otro participante)
                let displayName = conv.name || 'Chat';
                let initial = 'C';

                if (conv.type === 'direct') {
                    const otherUser = conv.participants?.find(p => p.id !== currentUser.id);
                    displayName = otherUser?.name || 'Usuario B';
                    initial = displayName.charAt(0).toUpperCase();
                } else {
                    initial = conv.name ? conv.name.charAt(0).toUpperCase() : 'G';
                }

                const lastMessageText = conv.lastMessage?.text || (conv.lastMessage?.attachments?.length ? '📎 Archivo adjunto' : 'Sin mensajes');

                return (
                    <div
                        key={conv.id}
                        onClick={() => selectConversation(conv.id)}
                        className="flex items-center p-3 mb-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            {conv.type === 'group' ? (
                                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border-2 border-white dark:border-slate-900">
                                    <Users className="w-6 h-6" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold border-2 border-white dark:border-slate-900">
                                    {initial}
                                </div>
                            )}
                            {unread > 0 && (
                                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                            )}
                        </div>

                        {/* Contenido */}
                        <div className="ml-3 flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className={`text-sm truncate pr-2 ${unread > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                                    {displayName}
                                </h3>
                                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                    {conv.lastMessage ? formatDistanceToNow(conv.updatedAt) : ''}
                                </span>
                            </div>

                            <div className="flex items-center">
                                {conv.linkedTrialId && (
                                    <FlaskConical className="w-3.5 h-3.5 text-amber-500 mr-1 shrink-0" />
                                )}
                                <p className={`text-sm truncate ${unread > 0 ? 'font-semibold text-slate-800 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {lastMessageText}
                                </p>
                            </div>
                        </div>

                        {/* Badge no leídos */}
                        {unread > 0 && (
                            <div className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                {unread}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
