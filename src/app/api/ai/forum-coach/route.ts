import { vertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
    try {
        const { postId, postTitle, postContent } = await req.json();

        if (!postId) {
            return Response.json({ error: 'Post ID is required' }, { status: 400 });
        }

        const { text } = await generateText({
            model: vertex('gemini-2.5-flash'),
            system: "You are the VoxLab AI Coach, an expert in public speaking, communication, and body language. Provide helpful, encouraging, and actionable advice to the user's forum post. Keep it concise (under 150 words), friendly, and professional. Structure your response with a brief observation followed by 2-3 specific tips.",
            prompt: `Title: ${postTitle}\n\nContent: ${postContent}`,
        });

        // Write to Firestore
        await addDoc(collection(db, "posts", postId, "comments"), {
            content: text,
            authorId: 'ai-coach',
            authorName: 'VoxLab AI Coach',
            authorAvatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=VoxLabCoach',
            createdAt: serverTimestamp(),
            likes: 0,
            likedBy: [],
            replies: [],
            isBestAnswer: false,
            isAiGenerated: true
        });

        return Response.json({ success: true });
    } catch (error: any) {
        console.error('AI Coach Error:', error);
        return Response.json({
            error: 'Failed to generate reply',
            details: error.message
        }, { status: 500 });
    }
}
