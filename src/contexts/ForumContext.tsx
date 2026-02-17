"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    increment,
    where,
    getDoc,
    arrayUnion,
    arrayRemove,
    Timestamp,
    deleteDoc,
    setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post, Comment, Reply } from "@/types/forum";
import { useAuth } from "./AuthContext";

interface ForumContextType {
    posts: Post[];
    stats: { postsToday: number; activeMembers: number; onlineUsers: number };
    loading: boolean;
    createPost: (title: string, content: string, tags: string[]) => Promise<void>;
    likePost: (postId: string) => Promise<void>;
    addComment: (postId: string, content: string) => Promise<void>;
    addReply: (postId: string, commentId: string, content: string) => Promise<void>;
    likeComment: (postId: string, commentId: string) => Promise<void>;
    likeReply: (postId: string, commentId: string, replyId: string) => Promise<void>;
    toggleBestAnswer: (postId: string, commentId: string) => Promise<void>;
    getPost: (postId: string) => Promise<Post | null>;
    incrementView: (postId: string) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    editPost: (postId: string, title: string, content: string, tags: string[]) => Promise<void>;
}

const ForumContext = createContext<ForumContextType | undefined>(undefined);

export const ForumProvider = ({ children }: { children: React.ReactNode }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [stats, setStats] = useState({ postsToday: 0, activeMembers: 0, onlineUsers: 0 });
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];

            // Calculate Stats
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const postsToday = postsData.filter(p => {
                const createdAt = p.createdAt?.toDate();
                return createdAt && createdAt > oneDayAgo;
            }).length;

            const uniqueAuthors = new Set(postsData.map(p => p.authorId));

            setStats(prev => ({
                ...prev,
                postsToday,
                activeMembers: uniqueAuthors.size
            }));

            setPosts(postsData);
            setLoading(false);
        });

        // Online Users Listener (Active in last 15 mins)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const onlineQuery = query(collection(db, "users"), where("lastActiveAt", ">", fifteenMinutesAgo));

        const unsubscribeOnline = onSnapshot(onlineQuery, (snap) => {
            setStats(prev => ({ ...prev, onlineUsers: snap.size }));
        }, (err) => {
            console.log("Online query error (requires index?):", err);
        });

        return () => {
            unsubscribe();
            unsubscribeOnline();
        };
    }, []);

    const createPost = async (title: string, content: string, tags: string[]) => {
        if (!user) throw new Error("Must be logged in to post");

        await addDoc(collection(db, "posts"), {
            title,
            content,
            tags,
            authorId: user.uid,
            authorName: user.displayName || "Anonymous",
            authorAvatar: user.photoURL,
            createdAt: serverTimestamp(),
            likes: 0,
            likedBy: [],
            viewCount: 0,
            commentCount: 0
        });

        // Increment User Post Count
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            stats: { postsCount: increment(1) }
        }, { merge: true }).catch(err => console.error("Error updating user stats", err));
    };

    const likePost = async (postId: string) => {
        if (!user) throw new Error("Must be logged in to like");

        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
            const postData = postSnap.data();
            const likedBy = postData.likedBy || [];

            if (likedBy.includes(user.uid)) {
                // Unlike
                await updateDoc(postRef, {
                    likes: increment(-1),
                    likedBy: arrayRemove(user.uid)
                });
            } else {
                // Like
                await updateDoc(postRef, {
                    likes: increment(1),
                    likedBy: arrayUnion(user.uid)
                });
                // Increment Author's Likes Received
                if (postData.authorId) {
                    const authorRef = doc(db, 'users', postData.authorId);
                    await setDoc(authorRef, {
                        stats: { likesReceived: increment(1) }
                    }, { merge: true }).catch(err => console.error("Error updating author stats", err));
                }
            }
        }
    };

    const incrementView = async (postId: string) => {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, {
            viewCount: increment(1)
        });
    };

    const addComment = async (postId: string, content: string) => {
        if (!user) throw new Error("Must be logged in to comment");

        // Add to subcollection
        await addDoc(collection(db, "posts", postId, "comments"), {
            content,
            authorId: user.uid,
            authorName: user.displayName || "Anonymous",
            authorAvatar: user.photoURL,
            createdAt: serverTimestamp(),
            likes: 0,
            likedBy: [],
            replies: [],
            isBestAnswer: false,
            isAiGenerated: false
        });

        // Increment User Comment Count
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            stats: { commentsCount: increment(1) }
        }, { merge: true }).catch(err => console.error("Error updating user stats", err));

        // Update comment count
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, {
            commentCount: increment(1)
        });
    };

    const likeComment = async (postId: string, commentId: string) => {
        if (!user) throw new Error("Must be logged in to like");

        const commentRef = doc(db, "posts", postId, "comments", commentId);
        const commentSnap = await getDoc(commentRef);

        if (commentSnap.exists()) {
            const data = commentSnap.data();
            const likedBy = data.likedBy || [];

            if (likedBy.includes(user.uid)) {
                await updateDoc(commentRef, {
                    likes: increment(-1),
                    likedBy: arrayRemove(user.uid)
                });
            } else {
                await updateDoc(commentRef, {
                    likes: increment(1),
                    likedBy: arrayUnion(user.uid)
                });

                // Increment Comment Author's Likes Received
                if (data.authorId) {
                    const authorRef = doc(db, 'users', data.authorId);
                    await updateDoc(authorRef, {
                        'stats.likesReceived': increment(1)
                    }).catch(err => console.error("Error updating author stats", err));
                }
            }
        }
    };

    const toggleBestAnswer = async (postId: string, commentId: string) => {
        // Logic to set isBestAnswer = true for this comment and false for others if needed
        // For now, toggle specific comment
        const commentRef = doc(db, "posts", postId, "comments", commentId);
        const commentSnap = await getDoc(commentRef);
        if (commentSnap.exists()) {
            await updateDoc(commentRef, {
                isBestAnswer: !commentSnap.data().isBestAnswer
            });
        }
    };

    const addReply = async (postId: string, commentId: string, content: string) => {
        if (!user) throw new Error("Must be logged in to reply");

        const reply: Reply = {
            id: doc(collection(db, "posts")).id, // Generate a valid Firestore ID
            content,
            authorId: user.uid,
            authorName: user.displayName || "Anonymous",
            authorAvatar: user.photoURL || null, // Firestore requires null, not undefined
            createdAt: Timestamp.now(),
            likes: 0,
            likedBy: []
        };

        const commentRef = doc(db, "posts", postId, "comments", commentId);
        await updateDoc(commentRef, {
            replies: arrayUnion(reply)
        });

        // Increment User Comment/Reply Count
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            stats: { commentsCount: increment(1) }
        }, { merge: true }).catch(console.error);
    };

    const likeReply = async (postId: string, commentId: string, replyId: string) => {
        if (!user) throw new Error("Must be logged in to like");

        const commentRef = doc(db, "posts", postId, "comments", commentId);
        const commentSnap = await getDoc(commentRef);

        if (commentSnap.exists()) {
            const data = commentSnap.data() as Comment;
            const replies = data.replies || [];
            const replyIndex = replies.findIndex(r => r.id === replyId);

            if (replyIndex !== -1) {
                const reply = replies[replyIndex];
                const likedBy = reply.likedBy || [];

                if (likedBy.includes(user.uid)) {
                    // Unlike
                    reply.likes = Math.max(0, reply.likes - 1);
                    reply.likedBy = likedBy.filter(id => id !== user.uid);
                } else {
                    reply.likes = (reply.likes || 0) + 1;
                    reply.likedBy = [...likedBy, user.uid];

                    // Increment Author's Likes Received
                    if (reply.authorId) {
                        const authorRef = doc(db, 'users', reply.authorId);
                        await setDoc(authorRef, {
                            stats: { likesReceived: increment(1) }
                        }, { merge: true }).catch(console.error);
                    }
                }

                // Update the entire replies array
                replies[replyIndex] = reply;
                await updateDoc(commentRef, { replies });
            }
        }
    };

    const getPost = async (postId: string) => {
        const docRef = doc(db, "posts", postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Post;
        }
        return null;
    };

    const deletePost = async (postId: string) => {
        if (!user) throw new Error("Must be logged in to delete");
        const postRef = doc(db, "posts", postId);

        // Optimistic update: Remove from local state immediately
        setPosts(prev => prev.filter(p => p.id !== postId));

        await deleteDoc(postRef);
    };

    const editPost = async (postId: string, title: string, content: string, tags: string[]) => {
        if (!user) throw new Error("Must be logged in to edit");
        const postRef = doc(db, "posts", postId);

        await updateDoc(postRef, {
            title,
            content,
            tags,
            updatedAt: serverTimestamp()
        });
    };

    return (
        <ForumContext.Provider value={{
            posts,
            stats,
            loading,
            createPost,
            likePost,
            addComment,
            addReply,
            likeComment,
            likeReply,
            toggleBestAnswer,
            getPost,
            incrementView,
            deletePost,
            editPost
        }}>
            {children}
        </ForumContext.Provider>
    );
};

export const useForum = () => {
    const context = useContext(ForumContext);
    if (context === undefined) {
        throw new Error("useForum must be used within a ForumProvider");
    }
    return context;
};
