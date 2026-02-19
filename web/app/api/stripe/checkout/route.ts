import { NextRequest, NextResponse } from "next/server";
import { stripe, JOB_POSTING_PRODUCTS, JobPostingProductType } from "@/lib/stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        // Check if Firebase Admin is initialized
        if (!adminAuth || !adminDb) {
            console.error("Firebase Admin not initialized - check environment variables");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 503 }
            );
        }

        // Verify authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { productType, jobId, returnUrl, creditPurchase } = body as {
            productType: JobPostingProductType;
            jobId?: string;
            returnUrl?: string;
            creditPurchase?: boolean;
        };

        // Validate product type
        if (!productType || !(productType in JOB_POSTING_PRODUCTS)) {
            return NextResponse.json(
                { error: "Invalid product type" },
                { status: 400 }
            );
        }

        const product = JOB_POSTING_PRODUCTS[productType];

        // Credit purchase mode: buy a job credit without creating a job first
        // Used by pending employers who must pay before they can post
        if (creditPurchase) {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: [
                    {
                        price_data: {
                            currency: "cad",
                            product_data: {
                                name: product.name,
                                description: product.description,
                            },
                            unit_amount: product.price,
                        },
                        quantity: 1,
                    },
                ],
                mode: "payment",
                success_url: returnUrl || `${request.nextUrl.origin}/organization/jobs/new?credited=true`,
                cancel_url: `${request.nextUrl.origin}/organization/subscribe?canceled=true`,
                metadata: {
                    type: "job_credit",
                    productType,
                    userId,
                    duration: product.duration.toString(),
                    featured: product.featured.toString(),
                    talentPoolAccessDays: product.talentPoolAccessDays.toString(),
                },
            });

            return NextResponse.json({ sessionId: session.id, url: session.url });
        }

        // Normal mode: requires a jobId
        if (!jobId) {
            return NextResponse.json(
                { error: "Missing jobId" },
                { status: 400 }
            );
        }

        // Verify the user owns this job
        const jobDoc = await adminDb.collection("jobs").doc(jobId).get();
        if (!jobDoc.exists) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        const jobData = jobDoc.data();
        if (jobData?.employerId !== userId) {
            return NextResponse.json(
                { error: "Forbidden: You do not own this job" },
                { status: 403 }
            );
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "cad",
                        product_data: {
                            name: product.name,
                            description: product.description,
                        },
                        unit_amount: product.price,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: returnUrl || `${request.nextUrl.origin}/organization/jobs/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.nextUrl.origin}/organization/jobs/new?canceled=true`,
            metadata: {
                type: "job",
                productType,
                userId,
                jobId,
                duration: product.duration.toString(),
                featured: product.featured.toString(),
                talentPoolAccessDays: product.talentPoolAccessDays.toString(),
            },
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create checkout session";
        console.error("Stripe checkout error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
