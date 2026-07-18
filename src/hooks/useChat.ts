import { useState, useEffect, useMemo } from 'react';
import { chatService } from '../services/chatService';
import type { Conversation, Message, ChatAttachment } from '../types/chat';
import type { User } from '../types/user';

export function useChat(currentUser: User) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [filterByTrialId, setFilterByTrialId] = useState<string | null>(null);
    const [filterByTaskId, setFilterByTaskId] = useState<string | null>(null);
    const [filterByInventoryId, setFilterByInventoryId] = useState<string | null>(null);
    const [filterByFinanceId, setFilterByFinanceId] = useState<string | null>(null);

    // Load conversations
    useEffect(() => {
        setLoadingConversations(true);
        const unsubscribe = chatService.listenToConversations(currentUser.id, (loadedConversations) => {
            setConversations(loadedConversations);
            setLoadingConversations(false);

            // Si hay una conversación activa pero ya no está en la lista (raro), limpiarla
            // Opcional: auto-seleccionar la primera si es null
        });

        return () => unsubscribe();
    }, [currentUser.id]);

    // Load messages when active conversation changes
    useEffect(() => {
        if (!activeConversationId) {
            setMessages([]);
            return;
        }

        const unsubscribe = chatService.listenToMessages(activeConversationId, (loadedMessages) => {
            setMessages(loadedMessages);

            // Mark as read when we get new messages while looking at them
            if (isChatOpen) {
                chatService.markAsRead(activeConversationId, currentUser.id);
            }
        });

        return () => unsubscribe();
    }, [activeConversationId, currentUser.id, isChatOpen]);

    // Filtered conversations based on context
    const filteredConversations = useMemo(() => {
        if (!filterByTrialId && !filterByTaskId && !filterByInventoryId && !filterByFinanceId) {
            return conversations;
        }

        return conversations.filter(c => {
            if (filterByTrialId && c.linkedTrialId === filterByTrialId) return true;
            if (filterByTaskId && c.linkedTaskId === filterByTaskId) return true;
            if (filterByInventoryId && c.linkedInventoryId === filterByInventoryId) return true;
            if (filterByFinanceId && c.linkedFinanceId === filterByFinanceId) return true;
            return false;
        });
    }, [conversations, filterByTrialId, filterByTaskId, filterByInventoryId, filterByFinanceId]);

    // Calcular el total de mensajes no leídos global
    const totalUnreadCount = useMemo(() => {
        return conversations.reduce((total, conv) => {
            const count = conv.unreadCount?.[currentUser.id] || 0;
            return total + count;
        }, 0);
    }, [conversations, currentUser.id]);

    // Acciones principales
    const toggleChat = () => setIsChatOpen(prev => !prev);
    const openChat = () => setIsChatOpen(true);
    const closeChat = () => setIsChatOpen(false);

    const selectConversation = (id: string | null) => {
        setActiveConversationId(id);
        if (id) {
            chatService.markAsRead(id, currentUser.id);
        }
    };

    const sendMessage = async (text: string, attachments?: ChatAttachment[]) => {
        if (!activeConversationId) return;
        await chatService.sendMessage(activeConversationId, currentUser.id, text, attachments);
    };

    const updateConversation = async (updates: Partial<Conversation>) => {
        if (!activeConversationId) return;
        await chatService.updateConversation(activeConversationId, updates);
    };

    return {
        currentUser,
        conversations: filteredConversations,
        allConversations: conversations,
        activeConversationId,
        activeConversation: conversations.find(c => c.id === activeConversationId),
        messages,
        isChatOpen,
        totalUnreadCount,
        loadingConversations,
        filterByTrialId,
        filterByTaskId,
        filterByInventoryId,
        filterByFinanceId,
        setFilterByTrialId,
        setFilterByTaskId,
        setFilterByInventoryId,
        setFilterByFinanceId,
        toggleChat,
        openChat,
        closeChat,
        selectConversation,
        sendMessage,
        updateConversation
    };
}
