export interface WallPost {
    id: string;
    authorId: string;
    content: string;
    attachments?: WallAttachment[];
    createdAt: string | Date;
    likes: string[]; // List of user IDs who liked it
    dislikes: string[]; // List of user IDs who disliked it
    commentsCount: number;
    comments?: WallComment[];
}

export interface WallComment {
    id: string;
    authorId: string;
    content: string;
    createdAt: string;
    likes?: string[]; // List of user IDs 
    dislikes?: string[]; // List of user IDs
}

export interface WallAttachment {
    url: string;
    type: 'image' | 'video' | 'document';
    name?: string;
}
