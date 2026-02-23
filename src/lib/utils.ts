import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatForumDate(timestamp: number | string | Date | { toMillis?: () => number, seconds?: number, nanoseconds?: number }): string {
  if (!timestamp) return 'Just now';

  let date: Date;

  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'object') {
    // Handle Firestore Timestamp
    if (typeof timestamp.toMillis === 'function') {
      date = new Date(timestamp.toMillis());
    } else if ('seconds' in timestamp && 'nanoseconds' in timestamp) {
      date = new Date(timestamp.seconds! * 1000 + timestamp.nanoseconds! / 1000000);
    } else {
      return 'Just now'; // Fallback
    }
  } else {
    return 'Just now';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  // Over a week, show short date e.g. "Oct 12"
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
