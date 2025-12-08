import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PillarPaymentSettings {
    jobs: boolean;
    conferences: boolean;
    scholarships: boolean;
    shop: boolean;
    powwows: boolean;
}

export interface PlatformSettings {
    paymentRequired: PillarPaymentSettings;
    updatedAt?: Date;
    updatedBy?: string;
}

const SETTINGS_DOC = "settings/platform";

// Default settings - Jobs paid, everything else free
export const DEFAULT_PAYMENT_SETTINGS: PillarPaymentSettings = {
    jobs: true,
    conferences: false,
    scholarships: false,
    shop: false,
    powwows: false,
};

/**
 * Get platform settings from Firestore
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
    try {
        if (!db) {
            return { paymentRequired: DEFAULT_PAYMENT_SETTINGS };
        }

        const docRef = doc(db, SETTINGS_DOC);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                paymentRequired: {
                    ...DEFAULT_PAYMENT_SETTINGS,
                    ...data.paymentRequired,
                },
                updatedAt: data.updatedAt?.toDate(),
                updatedBy: data.updatedBy,
            };
        }

        // If no settings exist, create default settings
        await setDoc(docRef, {
            paymentRequired: DEFAULT_PAYMENT_SETTINGS,
            updatedAt: new Date(),
        });

        return { paymentRequired: DEFAULT_PAYMENT_SETTINGS };
    } catch (error) {
        console.error("Error fetching platform settings:", error);
        return { paymentRequired: DEFAULT_PAYMENT_SETTINGS };
    }
}

/**
 * Update platform settings
 */
export async function updatePlatformSettings(
    settings: Partial<PillarPaymentSettings>,
    updatedBy?: string
): Promise<boolean> {
    try {
        if (!db) {
            console.error("Firebase not initialized");
            return false;
        }

        const docRef = doc(db, SETTINGS_DOC);
        const currentSettings = await getPlatformSettings();

        await setDoc(docRef, {
            paymentRequired: {
                ...currentSettings.paymentRequired,
                ...settings,
            },
            updatedAt: new Date(),
            updatedBy: updatedBy || null,
        });

        return true;
    } catch (error) {
        console.error("Error updating platform settings:", error);
        return false;
    }
}

/**
 * Check if a specific pillar requires payment
 */
export async function isPillarPaymentRequired(
    pillar: keyof PillarPaymentSettings
): Promise<boolean> {
    const settings = await getPlatformSettings();
    return settings.paymentRequired[pillar] ?? DEFAULT_PAYMENT_SETTINGS[pillar];
}
