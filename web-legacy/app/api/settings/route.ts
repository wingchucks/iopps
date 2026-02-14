import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PAYMENT_SETTINGS } from "@/lib/platformSettings";

export const revalidate = 600; // Revalidate every 10 minutes

export async function GET() {
    const cacheHeaders = {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
    };

    try {
        if (!db) {
            return NextResponse.json({ paymentRequired: DEFAULT_PAYMENT_SETTINGS }, { headers: cacheHeaders });
        }

        const docRef = doc(db, "settings/platform");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return NextResponse.json({
                paymentRequired: {
                    ...DEFAULT_PAYMENT_SETTINGS,
                    ...data.paymentRequired,
                },
            }, { headers: cacheHeaders });
        }

        return NextResponse.json({ paymentRequired: DEFAULT_PAYMENT_SETTINGS }, { headers: cacheHeaders });
    } catch (error) {
        console.error("Error fetching platform settings:", error);
        return NextResponse.json({ paymentRequired: DEFAULT_PAYMENT_SETTINGS });
    }
}
