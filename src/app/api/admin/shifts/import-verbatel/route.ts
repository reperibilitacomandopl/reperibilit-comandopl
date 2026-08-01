import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.VERBATEL_IMPORT_SECRET;
    
    // Check next-auth session
    const session = await auth();
    const isNextAuthAdmin = session?.user && (session.user.role === 'ADMIN' || session.user.isSuperAdmin);

    // Auth check: either secret or admin session
    if (!isNextAuthAdmin && (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized. Check VERBATEL_IMPORT_SECRET or login as admin.' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    let { tenantId, tenantSlug, turni } = body;
    
    // If we only got tenantId, but it looks like a slug (e.g. 'altamura'), try to find the tenant
    let actualTenantId = tenantId;
    
    if (tenantId && !tenantId.includes('-')) {
       const tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
       if (tenant) {
         actualTenantId = tenant.id;
       }
    } else if (tenantSlug) {
       const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
       if (tenant) {
         actualTenantId = tenant.id;
       }
    }

    if (!actualTenantId && session?.user?.tenantId) {
       actualTenantId = session.user.tenantId;
    }

    if (!actualTenantId || !turni || !Array.isArray(turni)) {
      return NextResponse.json({ error: 'Invalid payload. Required: tenantId or tenantSlug, and turni array' }, { status: 400, headers: corsHeaders });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const turnoRow of turni) {
      if (!turnoRow.Matricola) continue;

      // Find user by matricola
      const user = await prisma.user.findFirst({
        where: { tenantId: actualTenantId, matricola: turnoRow.Matricola.toString(), deletedAt: null }
      });

      if (!user) {
        notFoundCount++;
        continue;
      }

      // Find all keys that match DD-MM-YY (e.g. "01-09-26")
      const dateKeys = Object.keys(turnoRow).filter(k => k.match(/^\d{2}-\d{2}-\d{2}$/));

      for (const dateKey of dateKeys) {
        const turnoObj = turnoRow[dateKey];
        if (!turnoObj || !turnoObj.turnoEffettivo) continue;

        const shiftType = turnoObj.turnoEffettivo;

        // Parse date DD-MM-YY to Date object
        const parts = dateKey.split('-');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = 2000 + parseInt(parts[2], 10); // Assume 2000+
        const startOfDay = new Date(Date.UTC(year, month, day));

        // Upsert shift
        const existingShift = await prisma.shift.findFirst({
          where: { tenantId: actualTenantId, userId: user.id, date: startOfDay, deletedAt: null }
        });

        if (existingShift) {
          await prisma.shift.update({
            where: { id: existingShift.id },
            data: { type: shiftType, isSyncedToVerbatel: true }
          });
          updatedCount++;
        } else {
          await prisma.shift.create({
            data: {
              tenantId: actualTenantId,
              userId: user.id,
              date: startOfDay,
              type: shiftType,
              isSyncedToVerbatel: true
            }
          });
          createdCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completato: ${createdCount} creati, ${updatedCount} aggiornati. ${notFoundCount} agenti non trovati.`,
      stats: { createdCount, updatedCount, notFoundCount }
    }, { headers: corsHeaders });
    
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
