import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  generaBozzaOrdinanza,
  type AnalisiRichiesta,
  type TemplateRiferimento,
} from "@/lib/ordinanza-ai"

// POST /api/admin/ordinanze/[id]/bozza
// Genera una bozza di ordinanza con l'AI (RAG leggero dai template del Comando)

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { id } = await params

  try {
    const request = await prisma.ordinanzaRequest.findUnique({
      where: { id, tenantId: session.user.tenantId },
      include: {
        tenant: { select: { name: true } },
      },
    })

    if (!request) {
      return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 })
    }

    if (!request.analisiAi) {
      return NextResponse.json(
        { error: "Esegui prima l'analisi AI della richiesta" },
        { status: 400 }
      )
    }

    // Recupera template pertinenti per RAG
    const templates = await prisma.ordinanzaTemplate.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
        OR: [
          { tipo: request.tipoOrdinanza },
          { tipo: "GENERICO" },
        ],
      },
      orderBy: [
        { tipo: "asc" },  // tipo specifico prima di GENERICO
        { createdAt: "desc" },
      ],
      take: 3,  // max 3 template in context per non eccedere token
    })

    const templateRif: TemplateRiferimento[] = templates.map((t: { nome: string; tipo: string; contenuto: string }) => ({
      nome: t.nome,
      tipo: t.tipo,
      contenuto: t.contenuto,
    }))

    // Usa i dati estratti dall'analisi
    const analisi = (request.analisiAi as Record<string, unknown>).analisi as AnalisiRichiesta ?? {
      tipoOrdinanza: request.tipoOrdinanza,
      richiedente: request.richiedente,
      via: request.via,
      civico: request.civico,
      comune: null,
      dataInizio: request.dataInizio?.toISOString().split("T")[0] ?? null,
      dataFine: request.dataFine?.toISOString().split("T")[0] ?? null,
      oraDalle: request.oraDalle,
      oraAlle: request.oraAlle,
      motivazione: request.motivazione,
      misureRichieste: [],
      segnaletica: null,
      deviazioneNecessaria: false,
      note: null,
      confidenza: 50,
    } as AnalisiRichiesta

    const nomeComune = request.tenant?.name ?? "Polizia Locale"

    // Genera bozza con LLM
    const testoBozza = await generaBozzaOrdinanza(analisi, nomeComune, templateRif)

    // Calcola prossimo numero progressivo per l'anno
    const anno = new Date().getFullYear()
    const lastBozza = await prisma.ordinanzaBozza.findFirst({
      where: { tenantId: session.user.tenantId, anno },
      orderBy: { progressivo: "desc" },
    })
    const progressivo = (lastBozza?.progressivo ?? 0) + 1
    const numeroProtocollo = `ORD-${anno}/${String(progressivo).padStart(4, "0")}`

    // Salva bozza
    const bozza = await prisma.ordinanzaBozza.create({
      data: {
        requestId: id,
        tenantId: session.user.tenantId,
        anno,
        progressivo,
        numeroProtocollo,
        testo: testoBozza,
        stato: "BOZZA",
        documentiUsati: templateRif.map((t) => ({
          nome: t.nome,
          tipo: t.tipo,
        })) as unknown as Record<string, unknown>[],
      },
    })

    // Aggiorna stato pratica → REVISIONE
    await prisma.ordinanzaRequest.update({
      where: { id },
      data: { stato: "REVISIONE" },
    })

    return NextResponse.json({ bozza, templatesUsati: templateRif.length }, { status: 201 })
  } catch (error) {
    console.error("[ORDINANZA_BOZZA]", error)
    const msg = error instanceof Error ? error.message : "Errore sconosciuto"
    return NextResponse.json({ error: `Errore generazione bozza: ${msg}` }, { status: 500 })
  }
}

// GET — recupera l'ultima bozza per questa pratica
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { id } = await params

  try {
    const bozze = await prisma.ordinanzaBozza.findMany({
      where: { requestId: id, tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        approvataDa: { select: { name: true, matricola: true } },
      },
    })

    return NextResponse.json(bozze)
  } catch (error) {
    console.error("[ORDINANZA_BOZZA_GET]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}
