
import { Timestamp } from 'firebase/firestore';

export interface Reply {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string | null;
    createdAt: Timestamp;
    likes: number;
    likedBy: string[];
}

export interface Comment {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: Timestamp;
    likes: number;
    likedBy: string[];
    replies: Reply[];
    isBestAnswer?: boolean;
    isAiGenerated?: boolean;
}

export interface Post {
    id: string;
    title: string;
    content: string;
    tags: string[];
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: Timestamp;
    likes: number;
    viewCount: number;
    commentCount: number;
    likedBy: string[]; // User IDs who liked the post
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
}

export interface UserProfile {
    uid: string;
    displayName: string;
    photoURL: string;
    role: 'user' | 'admin' | 'moderator';
    bio?: string;
    username?: string; // short lowercase handle e.g. "tayxinying"
    stats: {
        postsCount: number;
        commentsCount: number;
        likesReceived: number;
        bestAnswersCount: number;
    };
    followersCount: number;
    followingCount: number;
    lastActiveAt: Timestamp;
    isOnline?: boolean;
}
