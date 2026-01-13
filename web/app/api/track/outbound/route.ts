import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { OutboundLinkType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, vendorId, linkType, targetUrl } = body;

    // Validate required fields
    if (!organizationId || !linkType || !targetUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, linkType, targetUrl' },
        { status: 400 }
      );
    }

    // Validate linkType
    const validLinkTypes: OutboundLinkType[] = [
      'website', 'instagram', 'facebook', 'tiktok', 'linkedin',
      'booking', 'phone', 'email', 'other'
    ];
    if (!validLinkTypes.includes(linkType)) {
      return NextResponse.json(
        { error: 'Invalid linkType' },
        { status: 400 }
      );
    }

    // Get visitor ID from cookie or generate one
    const visitorId = request.cookies.get('visitor_id')?.value || null;

    // Store the click event
    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }
    const clickRef = db.collection('outbound_clicks').doc();
    await clickRef.set({
      id: clickRef.id,
      organizationId,
      vendorId: vendorId || null,
      linkType,
      targetUrl,
      visitorId,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, id: clickRef.id });
  } catch (error) {
    console.error('Error tracking outbound click:', error);
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
  }
}
