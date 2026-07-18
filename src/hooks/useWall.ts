import { useState, useEffect } from 'react';
import { wallService } from '../services/wallService';
import type { WallPost, WallAttachment } from '../types/wall';
import { useChatContext } from '../context/ChatContext';

export function useWall() {
    const [posts, setPosts] = useState<WallPost[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useChatContext();

    useEffect(() => {
        setLoading(true);
        const unsubscribe = wallService.listenToWallPosts((fetchedPosts) => {
            const sorted = [...fetchedPosts].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setPosts(sorted);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const createPost = async (content: string, files?: File[]) => {
        if (!currentUser) return;
        let attachments: WallAttachment[] = [];
        if (files && files.length > 0) {
            attachments = await Promise.all(
                files.map(file => wallService.uploadWallAttachment(file))
            );
        }
        await wallService.createWallPost(currentUser.id, content, attachments);
    };

    const toggleLike = async (postId: string, isCurrentlyLiked: boolean) => {
        if (!currentUser) return;
        await wallService.toggleLikePost(postId, currentUser.id, isCurrentlyLiked);
    };

    const toggleDislike = async (postId: string, isCurrentlyDisliked: boolean) => {
        if (!currentUser) return;
        await wallService.toggleDislikePost(postId, currentUser.id, isCurrentlyDisliked);
    };

    const deletePost = async (postId: string) => {
        if (!currentUser) return;
        await wallService.deleteWallPost(postId);
    };

    const addComment = async (postId: string, content: string) => {
        if (!currentUser) return;
        await wallService.addComment(postId, currentUser.id, content);
    };

    const reactToComment = async (postId: string, commentId: string, type: 'like' | 'dislike') => {
        if (!currentUser) return;
        await wallService.toggleCommentReaction(postId, commentId, currentUser.id, type);
    };

    return {
        posts,
        loading,
        createPost,
        toggleLike,
        toggleDislike,
        deletePost,
        addComment,
        reactToComment,
        currentUser
    };
}
