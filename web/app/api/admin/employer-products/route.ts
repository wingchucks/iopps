import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";
import { PRODUCT_CATALOG, calculateExpirationDate } from "@/lib/products";
import { ProductType, PaymentMethod, ProductStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Verify admin access
async function verifyAdmin(req: NextRequest): Promise<{
  success: boolean;
  error?: string;
  status?: number;
  adminId?: string;
  adminEmail?: string;
}> {
  if (!auth || !db) {
    return { success: false, error: "Server configuration error", status: 503 };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    const adminDoc = await db.collection("users").doc(decodedToken.uid).get();
    const adminData = adminDoc.data();

    if (!adminData || (adminData.role !== "admin" && adminData.role !== "moderator")) {
      return { success: false, error: "Forbidden: Admin access required", status: 403 };
    }

    return {
      success: true,
      adminId: decodedToken.uid,
      adminEmail: decodedToken.email || undefined,
    };
  } catch (error) {
    return { success: false, error: "Invalid token", status: 401 };
  }
}

// GET - List products for an employer
export async function GET(req: NextRequest) {
  const rateLimitResult = rateLimiters.api(req);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  const authResult = await verifyAdmin(req);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const employerId = searchParams.get("employerId");

  if (!employerId) {
    return NextResponse.json({ error: "Missing employerId" }, { status: 400 });
  }

  try {
    const productsRef = db!.collection("employers").doc(employerId).collection("products");
    const snapshot = await productsRef.orderBy("createdAt", "desc").get();

    const products = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        activatedAt: data.activatedAt?.toDate?.()?.toISOString() || null,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST - Add a product to an employer
export async function POST(req: NextRequest) {
  const rateLimitResult = rateLimiters.api(req);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  const authResult = await verifyAdmin(req);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const {
      employerId,
      productType,
      paymentMethod,
      paidAmount,
      durationDays,
      quantity = 1,
      grantReason,
      notes,
      activatedAt,
      stripePaymentId,
      invoiceNumber,
    } = body as {
      employerId: string;
      productType: ProductType;
      paymentMethod: PaymentMethod;
      paidAmount?: number;
      durationDays?: number;
      quantity?: number;
      grantReason?: string;
      notes?: string;
      activatedAt?: string;
      stripePaymentId?: string;
      invoiceNumber?: string;
    };

    // Validate required fields
    if (!employerId || !productType || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: employerId, productType, paymentMethod" },
        { status: 400 }
      );
    }

    // Validate product type
    const config = PRODUCT_CATALOG[productType];
    if (!config) {
      return NextResponse.json({ error: `Invalid product type: ${productType}` }, { status: 400 });
    }

    // Verify employer exists
    const employerDoc = await db!.collection("employers").doc(employerId).get();
    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    const employerData = employerDoc.data();

    // Calculate dates
    const activatedDate = activatedAt ? new Date(activatedAt) : new Date();
    const duration = durationDays || config.duration;
    const expiresDate = calculateExpirationDate(activatedDate, duration);

    // Calculate stats based on product type and quantity
    const stats = { ...config.defaultStats };

    // Apply quantity multiplier for job products
    if (config.category === "job" && quantity > 1) {
      if (typeof stats.jobsRemaining === "number") {
        stats.jobsRemaining = stats.jobsRemaining * quantity;
      }
      if (typeof stats.featuredJobsRemaining === "number") {
        stats.featuredJobsRemaining = stats.featuredJobsRemaining * quantity;
      }
    }

    // Create product document
    const productData = {
      employerId,
      category: config.category,
      productType,
      productName: quantity > 1 ? `${config.name} (x${quantity})` : config.name,
      price: config.price * quantity,
      paidAmount: paidAmount ?? (paymentMethod === "free_grant" ? 0 : config.price * quantity),
      paymentMethod,
      stripePaymentId: stripePaymentId || null,
      invoiceNumber: invoiceNumber || null,
      activatedAt: Timestamp.fromDate(activatedDate),
      expiresAt: Timestamp.fromDate(expiresDate),
      status: "active" as ProductStatus,
      grantedBy: authResult.adminId,
      grantedByEmail: authResult.adminEmail,
      grantReason: grantReason || null,
      notes: notes || null,
      stats,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const productsRef = db!.collection("employers").doc(employerId).collection("products");
    const docRef = await productsRef.add(productData);

    // Update employer's freePostingEnabled for backward compatibility
    if (
      paymentMethod === "free_grant" &&
      (config.category === "job" || config.category === "subscription")
    ) {
      await db!.collection("employers").doc(employerId).update({
        freePostingEnabled: true,
        freePostingReason: grantReason || "Admin granted product",
        freePostingGrantedAt: FieldValue.serverTimestamp(),
        freePostingGrantedBy: authResult.adminId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Create audit log
    try {
      await db!.collection("audit_logs").add({
        action: "add_employer_product",
        adminId: authResult.adminId,
        adminEmail: authResult.adminEmail,
        employerId,
        employerName: employerData?.organizationName,
        productId: docRef.id,
        productType,
        productName: config.name,
        paymentMethod,
        paidAmount: productData.paidAmount,
        grantReason,
        timestamp: FieldValue.serverTimestamp(),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    console.log(
      `[AUDIT] Admin ${authResult.adminEmail} added ${config.name} to employer ${employerId} (${employerData?.organizationName})`
    );

    return NextResponse.json({
      success: true,
      productId: docRef.id,
      message: `${config.name} added successfully`,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    return NextResponse.json({ error: "Failed to add product" }, { status: 500 });
  }
}

// PUT - Update a product (extend, update status, etc.)
export async function PUT(req: NextRequest) {
  const rateLimitResult = rateLimiters.api(req);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  const authResult = await verifyAdmin(req);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const {
      employerId,
      productId,
      action,
      additionalDays,
      status,
      notes,
    } = body as {
      employerId: string;
      productId: string;
      action: "extend" | "update_status" | "update_notes";
      additionalDays?: number;
      status?: ProductStatus;
      notes?: string;
    };

    if (!employerId || !productId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: employerId, productId, action" },
        { status: 400 }
      );
    }

    const productRef = db!.collection("employers").doc(employerId).collection("products").doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const productData = productDoc.data();
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (action === "extend" && additionalDays) {
      const currentExpiry = productData?.expiresAt?.toDate() || new Date();
      const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry;
      const newExpiry = new Date(baseDate);
      newExpiry.setDate(newExpiry.getDate() + additionalDays);

      updateData.expiresAt = Timestamp.fromDate(newExpiry);
      updateData.status = "active";
    }

    if (action === "update_status" && status) {
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    await productRef.update(updateData);

    // Create audit log
    try {
      await db!.collection("audit_logs").add({
        action: `update_employer_product_${action}`,
        adminId: authResult.adminId,
        adminEmail: authResult.adminEmail,
        employerId,
        productId,
        updateData,
        timestamp: FieldValue.serverTimestamp(),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE - Cancel a product
export async function DELETE(req: NextRequest) {
  const rateLimitResult = rateLimiters.api(req);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  const authResult = await verifyAdmin(req);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const employerId = searchParams.get("employerId");
  const productId = searchParams.get("productId");

  if (!employerId || !productId) {
    return NextResponse.json({ error: "Missing employerId or productId" }, { status: 400 });
  }

  try {
    const productRef = db!.collection("employers").doc(employerId).collection("products").doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await productRef.update({
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy: authResult.adminId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create audit log
    try {
      await db!.collection("audit_logs").add({
        action: "cancel_employer_product",
        adminId: authResult.adminId,
        adminEmail: authResult.adminEmail,
        employerId,
        productId,
        timestamp: FieldValue.serverTimestamp(),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Product cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling product:", error);
    return NextResponse.json({ error: "Failed to cancel product" }, { status: 500 });
  }
}
