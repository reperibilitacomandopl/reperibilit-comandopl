import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shiftIds, status = true } = body as { shiftIds: string[], status?: boolean };

    if (!Array.isArray(shiftIds) || shiftIds.length === 0) {
      return NextResponse.json({ error: 'shiftIds array is required' }, { status: 400 });
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
      adminId: session.user.id || '',
      action: 'SYNC_VERBATEL',
      details: `${status ? 'Marcati' : 'Smarcati'} come sincronizzati ${updated.count} turni di reperibilità.`
    });

    return NextResponse.json({ success: true, count: updated.count });

  } catch (error) {
    console.error('Error syncing verbatel data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
