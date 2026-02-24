import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type NotificationType = 'like' | 'comment' | 'reply' | 'follow' | 'system';

export interface SendNotificationParams {
    recipientId: string;
    type: NotificationType;
    message: string;
    link?: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
}

export const sendNotification = async ({
    recipientId,
    type,
    message,
    link,
    senderId,
    senderName,
    senderAvatar
}: SendNotificationParams) => {
    try {
        // Don't generate notification if user is notifying themselves
        if (senderId && recipientId === senderId) return;

        await addDoc(collection(db, "users", recipientId, "notifications"), {
            type,
            message,
            link,
            read: false,
            createdAt: serverTimestamp(),
            sender: {
                id: senderId || null,
                name: senderName || "Anonymous",
                avatar: senderAvatar || null
            }
        });
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};
