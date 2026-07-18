import {
    collection,
    doc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { Conversation, Message, ChatAttachment, ChatUser, AttachmentType } from '../types/chat';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

// Note: Set to false to enable real Firebase Firestore persistence
const isMock = false;

const STORAGE_KEY = 'agrotrials_chat_data';

const getLocalData = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { conversations: [], messages: {} };
};

const saveLocalData = (data: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Trigger storage event for cross-tab or same-tab listeners
    window.dispatchEvent(new Event('storage'));
};
// ------------------------------------------------------------------

// Mock current user for testing purposes until real Auth is integrated
export const MOCK_CURRENT_USER: ChatUser = {
    id: 'user123',
    name: 'Administrador',
    email: 'admin@agrotrials.com'
};

export const MOCK_USERS: ChatUser[] = [
    MOCK_CURRENT_USER,
    { id: 'user456', name: 'Juan Perez', email: 'juan@agrotrials.com' },
    { id: 'user789', name: 'Maria Gomez', email: 'maria@agrotrials.com' }
];

export const chatService = {
    /**
     * Subscribe to user's conversations
     */
    listenToConversations: (userId: string, callback: (conversations: Conversation[]) => void) => {
        if (isMock) {
            const handler = () => {
                const data = getLocalData();
                const userConvs = data.conversations.filter((c: any) => c.participantIds.includes(userId));
                callback(userConvs.sort((a: any, b: any) => b.updatedAt - a.updatedAt));
            };
            handler();
            window.addEventListener('storage', handler);
            return () => window.removeEventListener('storage', handler);
        }

        const q = query(
            collection(db, CONVERSATIONS_COLLECTION),
            where('participantIds', 'array-contains', userId),
            orderBy('updatedAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Conversation[];
            callback(conversations);
        }, (error) => {
            console.error("Error listening to conversations:", error);
            if (error.code === 'failed-precondition') {
                console.warn("Firestore index might be missing for conversations query.");
            }
            callback([]);
        });
    },

    /**
     * Subscribe to messages in a specific conversation
     */
    listenToMessages: (conversationId: string, callback: (messages: Message[]) => void) => {
        if (isMock) {
            const handler = () => {
                const data = getLocalData();
                const msgs = data.messages[conversationId] || [];
                callback(msgs.sort((a: any, b: any) => a.createdAt - b.createdAt));
            };
            handler();
            window.addEventListener('storage', handler);
            return () => window.removeEventListener('storage', handler);
        }

        const q = query(
            collection(db, `${CONVERSATIONS_COLLECTION}/${conversationId}/${MESSAGES_COLLECTION}`),
            orderBy('createdAt', 'asc')
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            callback(messages);
        }, (error) => {
            console.error("Error listening to messages:", error);
            callback([]);
        });
    },

    /**
     * Send a new message
     */
    sendMessage: async (
        conversationId: string,
        senderId: string,
        text: string,
        attachments?: ChatAttachment[]
    ) => {
        const messageData = {
            id: doc(collection(db, MESSAGES_COLLECTION)).id,
            conversationId,
            senderId,
            text,
            attachments: attachments || [],
            createdAt: Date.now(),
            readBy: [senderId]
        };

        if (isMock) {
            const data = getLocalData();
            if (!data.messages[conversationId]) data.messages[conversationId] = [];
            data.messages[conversationId].push(messageData);

            // Update conv last message
            const convIdx = data.conversations.findIndex((c: any) => c.id === conversationId);
            if (convIdx !== -1) {
                data.conversations[convIdx].lastMessage = messageData;
                data.conversations[convIdx].updatedAt = Date.now();
                // Increment unread for others
                const conv = data.conversations[convIdx];
                if (!conv.unreadCount) conv.unreadCount = {};
                conv.participantIds.forEach((pid: string) => {
                    if (pid !== senderId) {
                        conv.unreadCount[pid] = (conv.unreadCount[pid] || 0) + 1;
                    }
                });
            }
            saveLocalData(data);
            return messageData.id;
        }

        try {
            const docRef = await addDoc(
                collection(db, `${CONVERSATIONS_COLLECTION}/${conversationId}/${MESSAGES_COLLECTION}`),
                messageData
            );
            const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
            await updateDoc(convRef, {
                lastMessage: { ...messageData, id: docRef.id },
                updatedAt: Date.now()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },

    /**
     * Create a new conversation
     */
    createConversation: async (
        type: 'direct' | 'group',
        participantIds: string[],
        participants: ChatUser[],
        name?: string,
        linkedTrialId?: string,
        linkedTaskId?: string,
        linkedInventoryId?: string,
        linkedFinanceId?: string
    ) => {
        const id = doc(collection(db, CONVERSATIONS_COLLECTION)).id;
        const conversationData: any = {
            id,
            type,
            participantIds,
            participants,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            unreadCount: participantIds.reduce((acc, pid) => ({ ...acc, [pid]: 0 }), {})
        };

        if (name) conversationData.name = name;
        if (linkedTrialId) conversationData.linkedTrialId = linkedTrialId;
        if (linkedTaskId) conversationData.linkedTaskId = linkedTaskId;
        if (linkedInventoryId) conversationData.linkedInventoryId = linkedInventoryId;
        if (linkedFinanceId) conversationData.linkedFinanceId = linkedFinanceId;

        if (isMock) {
            const data = getLocalData();
            // Check for existing direct chat
            if (type === 'direct') {
                const existing = data.conversations.find((c: any) =>
                    c.type === 'direct' &&
                    c.participantIds.length === 2 &&
                    participantIds.every((pid: string) => c.participantIds.includes(pid))
                );
                if (existing) return existing.id;
            }

            data.conversations.push(conversationData);
            saveLocalData(data);
            return id;
        }

        try {
            const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), conversationData);
            return docRef.id;
        } catch (error) {
            console.error("Error creating conversation:", error);
            throw error;
        }
    },

    /**
     * Mark conversation messages as read
     */
    markAsRead: async (conversationId: string, userId: string) => {
        if (isMock) {
            const data = getLocalData();
            const convIdx = data.conversations.findIndex((c: any) => c.id === conversationId);
            if (convIdx !== -1) {
                if (!data.conversations[convIdx].unreadCount) data.conversations[convIdx].unreadCount = {};
                data.conversations[convIdx].unreadCount[userId] = 0;
                saveLocalData(data);
            }
            return;
        }

        const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
        try {
            await updateDoc(convRef, {
                [`unreadCount.${userId}`]: 0
            });
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    },

    /**
     * Update conversation details (like name)
     */
    updateConversation: async (conversationId: string, updates: Partial<Conversation>) => {
        if (isMock) {
            const data = getLocalData();
            const idx = data.conversations.findIndex((c: any) => c.id === conversationId);
            if (idx !== -1) {
                data.conversations[idx] = { ...data.conversations[idx], ...updates, updatedAt: Date.now() };
                saveLocalData(data);
            }
            return;
        }

        const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
        try {
            await updateDoc(convRef, {
                ...updates,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error("Error updating conversation:", error);
        }
    },

    /**
     * Upload an attachment to Firebase Storage
     */
    uploadAttachment: (
        file: File,
        conversationId: string,
        onProgress: (progress: number) => void
    ): Promise<ChatAttachment> => {
        if (isMock) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    onProgress(100);
                    resolve({
                        url: URL.createObjectURL(file),
                        type: file.type.startsWith('image/') ? 'image' : 'other',
                        name: file.name,
                        size: file.size
                    });
                }, 1000);
            });
        }

        return new Promise((resolve, reject) => {
            const uniqueFilename = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `chat_attachments/${conversationId}/${uniqueFilename}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(progress);
                },
                (error) => {
                    console.error("Error uploading file:", error);
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    let type: AttachmentType = 'other';
                    if (file.type.startsWith('image/')) type = 'image';
                    else if (file.type.startsWith('video/')) type = 'video';
                    else if (file.type.includes('pdf') || file.type.includes('document')) type = 'document';

                    resolve({
                        url: downloadURL,
                        type,
                        name: file.name,
                        size: file.size
                    });
                }
            );
        });
    }
};
