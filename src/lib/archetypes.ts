import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface SessionMetrics {
    vocalScore: number;
    postureScore: number;
    facialScore: number;
    contentScore: number;
}

export interface ArchetypeInsight {
    archetypeId: string;
    archetypeName: string;
    description: string;
    traits: string[];
    calculatedAt: string;
}

/**
 * Calculates a unique speaker personality archetype based on aggregated
 * GCS timeline metrics. Stores the result in the `analyticsInsight` field 
 * safely isolated from other database dependencies (like Badges or Profiles).
 */
export async function calculateArchetype(userId: string, monthlySessions: SessionMetrics[]): Promise<ArchetypeInsight | null> {
    if (!userId || !monthlySessions || monthlySessions.length === 0) return null;

    // Calculate moving averages
    let avgVocal = 0;
    let avgPosture = 0;
    let avgFacial = 0;
    let avgContent = 0;

    monthlySessions.forEach(s => {
        avgVocal += s.vocalScore;
        avgPosture += s.postureScore;
        avgFacial += s.facialScore;
        avgContent += s.contentScore;
    });

    const count = monthlySessions.length;
    avgVocal /= count;
    avgPosture /= count;
    avgFacial /= count;
    avgContent /= count;

    let archetype: ArchetypeInsight;

    // Classification Algorithm
    if (avgPosture > 80 && avgFacial < 60) {
        archetype = {
            archetypeId: "the_stoic",
            archetypeName: "The Stoic",
            description: "You have incredibly stable posture and physical grounding, but your facial energy remains reserved.",
            traits: ["Grounded", "Serious", "Unshakeable"],
            calculatedAt: new Date().toISOString()
        };
    } else if (avgVocal > 80 && avgFacial > 80) {
        archetype = {
            archetypeId: "the_dynamic",
            archetypeName: "The Dynamic",
            description: "High energy across the board! You use both your voice and your face to powerfully captivate the audience.",
            traits: ["Energetic", "Expressive", "Captivating"],
            calculatedAt: new Date().toISOString()
        };
    } else if (avgContent > 80 && avgVocal < 60) {
        archetype = {
            archetypeId: "the_scholar",
            archetypeName: "The Scholar",
            description: "Your content is masterful and extremely clear, though your vocal delivery could use more varied inflection.",
            traits: ["Analytical", "Clear", "Thoughtful"],
            calculatedAt: new Date().toISOString()
        };
    } else if (avgPosture < 60 && avgFacial > 80) {
        archetype = {
            archetypeId: "the_empath",
            archetypeName: "The Empath",
            description: "Your facial expressions are wonderfully relatable and warm, but watch out for slouching or closed body language.",
            traits: ["Warm", "Relatable", "Expressive"],
            calculatedAt: new Date().toISOString()
        };
    } else {
        archetype = {
            archetypeId: "the_balanced_communicator",
            archetypeName: "The Balanced Communicator",
            description: "You maintain a solid, well-rounded approach to all aspects of your presentation delivery.",
            traits: ["Consistent", "Measured", "Reliable"],
            calculatedAt: new Date().toISOString()
        };
    }

    try {
        const userRef = doc(db, "users", userId);
        // Using { merge: true } strictly isolates this write path!
        await setDoc(userRef, { analyticsInsight: archetype }, { merge: true });
    } catch (error) {
        console.error("Error saving archetype insight to Firestore:", error);
    }

    return archetype;
}
