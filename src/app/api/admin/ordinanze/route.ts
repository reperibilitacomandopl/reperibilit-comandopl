import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET  /api/admin/ordinanze        — lista pratiche
// POST /api/admin/ordinanze        — crea nuova richiesta

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get("stato")
  const tipo = searchParams.get("tipo")
  const anno = searchParams.get("anno")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = 20

  try {
    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
    }
    if (stato) where.stato = stato
    if (tipo) where.tipoOrdinanza = tipo
    if (anno) {
      const y = parseInt(anno)
      where.createdAt = {
        gte: new Date(`${y}-01-01`),
        lt: new Date(`${y + 1}-01-01`),
      }
    }

    const [requests, total] = await Promise.all([
      prisma.ordinanzaRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { name: true, matricola: true } },
          bozze: {
            select: {
              id: true,
              stato: true,
              numeroProtocollo: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.ordinanzaRequest.count({ where }),
    ])

    // stats per tab contatori
    const stats = await prisma.ordinanzaRequest.groupBy({
      by: ["stato"],
      where: { tenantId: session.user.tenantId },
      _count: { stato: true },
    })

    return NextResponse.json({ requests, total, page, limit, stats })
  } catch (error) {
    console.error("[ORDINANZE_GET]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { tipoOrdinanza, testoRichiesta, fileUrl } = body

    if (!testoRichiesta || testoRichiesta.trim().length < 10) {
      return NextResponse.json(
        { error: "Il testo della richiesta è troppo breve" },
        { status: 400 }
      )
    }

    if (!tipoOrdinanza) {
      return NextResponse.json(
        { error: "Tipo ordinanza obbligatorio" },
        { status: 400 }
      )
    }

    const request = await prisma.ordinanzaRequest.create({
      data: {
        tenantId: session.user.tenantId,
        createdById: session.user.id,
        tipoOrdinanza,
        testoRichiesta: testoRichiesta.trim(),
        fileUrl: fileUrl ?? null,
        stato: "NUOVA",
      },
    })

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    console.error("[ORDINANZE_POST]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}
