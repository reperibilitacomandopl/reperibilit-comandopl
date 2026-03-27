import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providedKey = request.headers.get('x-api-key') || searchParams.get('apiKey');
    
    // Auth check: either valid NextAuth session or valid API key
    let isAdmin = false;
    let adminId = 'API_KEY_USER';
    
    if (providedKey === process.env.AUTH_SECRET) {
      isAdmin = true;
    } else {
      const session = await auth();
      if (session?.user?.role === 'ADMIN') {
        isAdmin = true;
        adminId = session.user.id || 'ADMIN';
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { shiftIds, status = true } = body as { shiftIds: string[], status?: boolean };

    if (!Array.isArray(shiftIds) || shiftIds.length === 0) {
      return NextResponse.json({ error: 'shiftIds array is required' }, { status: 400, headers: corsHeaders });
    }

    // Aggiorna lo stato di sincronizzazione dei turni
    const updated = await prisma.shift.updateMany({
      where: {
        id: { in: shiftIds }
      },
      data: {
        isSyncedToVerbatel: status
      }
    });

    await logAudit({
      adminId: adminId,
      action: 'SYNC_VERBATEL',
      details: `${status ? 'Marcati' : 'Smarcati'} come sincronizzati ${updated.count} turni di reperibilità.`
    });

    return NextResponse.json({ success: true, count: updated.count }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error syncing verbatel data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
