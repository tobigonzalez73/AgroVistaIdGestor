import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    updateDoc,
    doc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type { WallPost, WallAttachment } from '../types/wall';

const WALL_COLLECTION = 'wall_posts';

export const wallService = {
    listenToWallPosts(callback: (posts: WallPost[]) => void) {
        const q = query(
            collection(db, WALL_COLLECTION),
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const posts: WallPost[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                posts.push({
                    id: docSnap.id,
                    authorId: data.authorId,
                    content: data.content,
                    attachments: data.attachments || [],
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    likes: data.likes || [],
                    dislikes: data.dislikes || [],
                    commentsCount: data.commentsCount || 0,
                    comments: data.comments || []
                });
            });
            callback(posts);
        });
    },

    async createWallPost(authorId: string, content: string, attachments?: WallAttachment[]) {
        try {
            const docRef = await addDoc(collection(db, WALL_COLLECTION), {
                authorId,
                content,
                attachments: attachments || [],
                createdAt: serverTimestamp(),
                likes: [],
                dislikes: [],
                commentsCount: 0,
                comments: []
            });

            const mentionRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
            const matches = [...content.matchAll(mentionRegex)];
            const uniqueEmails = Array.from(new Set(matches.map(m => m[1])));

            if (uniqueEmails.length > 0) {
                await Promise.all(
                    uniqueEmails.map(email => addDoc(collection(db, 'mail'), {
                        to: email,
                        message: {
                            subject: `¡Has sido mencionado en un ensayo de Monkey Trials!`,
                            html: `<p>Has sido mencionado en el Muro: "${content}"</p>`
                        }
                    }))
                );
            }

            return docRef.id;
        } catch (error) {
            console.error("Error creating post:", error);
            throw error;
        }
    },

    async uploadWallAttachment(file: File): Promise<WallAttachment> {
        await new Promise(resolve => setTimeout(resolve, 800));
        const downloadUrl = URL.createObjectURL(file);
        const type: WallAttachment['type'] = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
        return { url: downloadUrl, type, name: file.name };
    },

    async toggleLikePost(postId: string, userId: string, isLiked: boolean) {
        const postRef = doc(db, WALL_COLLECTION, postId);
        await updateDoc(postRef, {
            likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
            dislikes: arrayRemove(userId)
        });
    },

    async toggleDislikePost(postId: string, userId: string, isDisliked: boolean) {
        const postRef = doc(db, WALL_COLLECTION, postId);
        await updateDoc(postRef, {
            dislikes: isDisliked ? arrayRemove(userId) : arrayUnion(userId),
            likes: arrayRemove(userId)
        });
    },

    async deleteWallPost(postId: string) {
        await deleteDoc(doc(db, WALL_COLLECTION, postId));
    },

    async addComment(postId: string, authorId: string, content: string) {
        const postRef = doc(db, WALL_COLLECTION, postId);
        const newComment = {
            id: Date.now().toString(),
            authorId,
            content,
            createdAt: new Date().toISOString(),
            likes: [],
            dislikes: []
        };
        await updateDoc(postRef, {
            comments: arrayUnion(newComment)
        });
    },

    async toggleCommentReaction(postId: string, commentId: string, userId: string, type: 'like' | 'dislike') {
        const postRef = doc(db, WALL_COLLECTION, postId);
        const docSnap = await getDoc(postRef);
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        const comments = [...(data.comments || [])];
        const idx = comments.findIndex(c => c.id === commentId);

        if (idx !== -1) {
            const comment = { ...comments[idx] };
            if (!comment.likes) comment.likes = [];
            if (!comment.dislikes) comment.dislikes = [];

            if (type === 'like') {
                if (comment.likes.includes(userId)) {
                    comment.likes = comment.likes.filter((id: string) => id !== userId);
                } else {
                    comment.likes.push(userId);
                    comment.dislikes = comment.dislikes.filter((id: string) => id !== userId);
                }
            } else {
                if (comment.dislikes.includes(userId)) {
                    comment.dislikes = comment.dislikes.filter((id: string) => id !== userId);
                } else {
                    comment.dislikes.push(userId);
                    comment.likes = comment.likes.filter((id: string) => id !== userId);
                }
            }
            comments[idx] = comment;
            await updateDoc(postRef, { comments });
        }
    }
};
