export type ConversationType = 'direct' | 'group';

export interface ChatUser {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
}

export type AttachmentType = 'image' | 'video' | 'document' | 'other';

export interface ChatAttachment {
    url: string;
    type: AttachmentType;
    name: string;
    size?: number; // In bytes
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    attachments?: ChatAttachment[];
    createdAt: number; // Use timestamp (ms) for easier sorting and DB storage
    readBy: string[]; // List of user IDs who have read this message
}

export interface Conversation {
    id: string;
    type: ConversationType;
    participantIds: string[]; // Array of User IDs
    participants?: ChatUser[]; // Useful for UI showing names/avatars
    name?: string; // Required for group chats, optional for direct
    createdAt: number;
    updatedAt: number;
    lastMessage?: Message;
    unreadCount?: Record<string, number>; // key: userId, value: number of unread messages
    linkedTrialId?: string; // Optional: ID del ensayo asociado
    linkedTaskId?: string; // Optional: ID de la tarea/labor asociada
    linkedInventoryId?: string; // Optional: ID del producto/lote asociado
    linkedFinanceId?: string; // Optional: ID de la transacción/entidad financiera asociada
}
