// @ts-nocheck
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RisorseTabs from "@/components/RisorseTabs"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

export default async function RisorsePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug: urlSlug } = await params
  const session = await auth()

  if (!session?.user) redirect("/login")
  
  // Verifica coerenza Slug
  if (urlSlug !== session.user.tenantSlug && !session.user.isSuperAdmin) {
    redirect(`/${session.user.tenantSlug}/admin/risorse`)
  }

  const tenantId = session.user.tenantId || "N0T-EX1ST1NG"

  const [users, rotationGroups, categories] = await Promise.all([
    prisma.user.findMany({
      where: { 
        tenantId: tenantId
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        matricola: true,
        role: true,
        isUfficiale: true,
        isSuperAdmin: true,
        isActive: true,
        canManageShifts: true,
        canManageUsers: true,
        canVerifyClockIns: true,
        canConfigureSystem: true,
        email: true,
        phone: true,
        qualifica: true,
        gradoLivello: true,
        squadra: true,
        servizio: true,
        massimale: true,
        dataDiNascita: true,
        tipoContratto: true,
        dataAssunzione: true,
        scadenzaPatente: true,
        scadenzaPortoArmi: true,
        noteInterne: true,
        defaultPartnerIds: true,
        fixedServiceDays: true,
        defaultServiceCategoryId: true,
        defaultServiceTypeId: true,
        fallbackServiceCategoryId: true,
        rotationGroupId: true,
        rotationGroup: { select: { id: true, name: true } },
        twoFactorEnabled: true,
        hasL104: true,
        l104Assistiti: true,
        hasStudyLeave: true,
        hasParentalLeave: true,
        hasChildSicknessLeave: true,
        failedLoginAttempts: true,
        lockoutUntil: true,
        lockoutReason: true,
        unlockedBy: true
      },
    }).catch(() => []),
    prisma.rotationGroup.findMany({ 
      where: { tenantId: tenantId },
      orderBy: { name: "asc" } 
    }).catch(() => []),
    prisma.serviceCategory.findMany({ 
      where: { tenantId: tenantId },
      include: { types: true }, 
      orderBy: { orderIndex: "asc" } 
    }).catch(() => []),
  ])

  return (
    <div className="p-6 lg:p-8 relative z-10 h-full">
      <Suspense fallback={<div className="p-10 text-center font-bold text-slate-400">Inizializzazione Pannello...</div>}>
        <RisorseTabs
          agents={(users || []) as any}
          rotationGroups={(rotationGroups || [])}
          categories={(categories || [])}
        />
      </Suspense>
    </div>
  )
}
