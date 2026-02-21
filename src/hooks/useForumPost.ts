import { useState, useEffect } from "react";
import { doc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post, Comment } from "@/types/forum";

export function useForumPost(postId: string) {
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!postId) return;

        // Listener for Post
        const postRef = doc(db, "posts", postId);
        const unsubPost = onSnapshot(postRef, (doc) => {
            if (doc.exists()) {
                setPost({ id: doc.id, ...doc.data() } as Post);
            } else {
                setPost(null);
            }
        });

        // Listener for Comments
        const commentsRef = collection(db, "posts", postId, "comments");
        const q = query(commentsRef, orderBy("createdAt", "asc"));
        const unsubComments = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Comment[];
            setComments(commentsData);
            setLoading(false);
        });

        return () => {
            unsubPost();
            unsubComments();
        };
    }, [postId]);

    return { post, comments, loading };
}
