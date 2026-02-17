
import { Mic, Video, Zap, Activity, Hash, HelpCircle, Smile, User } from 'lucide-react';

export interface ForumTopic {
    name: string;
    icon: any;
    description: string;
}

export interface ForumSection {
    title: string;
    topics: ForumTopic[];
}

export const FORUM_SECTIONS: ForumSection[] = [
    {
        title: 'Speaking Scenarios',
        topics: [
            { name: 'Presentation', icon: Video, description: 'Slides, delivery, and stage presence.' },
            { name: 'Interview', icon: Mic, description: 'Job interviews, behavioral questions, and answers.' },
            { name: 'Confidence', icon: Zap, description: 'Overcoming anxiety and building self-assurance.' }
        ]
    },
    {
        title: 'Voice & Speech',
        topics: [
            { name: 'Pronunciation', icon: Activity, description: 'Clarity, accent reduction, and articulation.' },
            { name: 'Pause Control', icon: Hash, description: 'Mastering silence and pacing for impact.' }
        ]
    },
    {
        title: 'Non-Verbal Communication',
        topics: [
            { name: 'Facial Expression', icon: Smile, description: 'Eye contact, smiling, and micro-expressions.' },
            { name: 'Posture', icon: User, description: 'Stance, gestures, and body language.' }
        ]
    },
    {
        title: 'Community',
        topics: [
            { name: 'Beginner Help', icon: HelpCircle, description: 'Start here! Introductions and basic questions.' }
        ]
    }
];

// Helper to get flat list if needed
export const FORUM_TOPICS_FLAT = FORUM_SECTIONS.flatMap(section => section.topics);

// Helper for Creating Post Modal (Group -> List of strings)
export const FORUM_categoryGroups = FORUM_SECTIONS.reduce((acc, section) => {
    acc[section.title] = section.topics.map(t => t.name);
    return acc;
}, {} as Record<string, string[]>);
