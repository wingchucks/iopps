import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PAYMENT_SETTINGS } from "@/lib/platformSettings";

export async function GET() {
    try {
        if (!db) {
            return NextResponse.json({ paymentRequired: DEFAULT_PAYMENT_SETTINGS });
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
            });
        }

        return NextResponse.json({ paymentRequired: DEFAULT_PAYMENT_SETTINGS });
    } catch (error) {
        console.error("Error fetching platform settings:", error);
        return NextResponse.json({ paymentRequired: DEFAULT_PAYMENT_SETTINGS });
    }
}
