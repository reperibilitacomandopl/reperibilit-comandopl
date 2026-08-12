import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { analizzaRichiesta } from "@/lib/ordinanza-ai"

// POST /api/admin/ordinanze/[id]/analizza
// Esegue analisi AI sulla richiesta e salva i risultati

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
    })

    if (!request) {
      return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 })
    }

    if (!request.testoRichiesta || request.testoRichiesta.trim().length < 10) {
      return NextResponse.json(
        { error: "Testo richiesta troppo breve per l'analisi" },
        { status: 400 }
      )
    }

    // Aggiorna stato → ANALISI
    await prisma.ordinanzaRequest.update({
      where: { id },
      data: { stato: "ANALISI" },
    })

    // Chiama LLM
    const risultato = await analizzaRichiesta(request.testoRichiesta)

    // Aggiorna con i risultati dell'analisi
    const updated = await prisma.ordinanzaRequest.update({
      where: { id },
      data: {
        stato: "BOZZA",
        analisiAi: risultato as unknown as Record<string, unknown>,
        verifiche: risultato.verifiche as unknown as Record<string, unknown>[],
        // aggiorna anche i campi estratti
        richiedente: risultato.analisi.richiedente ?? request.richiedente,
        via: risultato.analisi.via ?? request.via,
        civico: risultato.analisi.civico ?? request.civico,
        dataInizio: risultato.analisi.dataInizio
          ? new Date(risultato.analisi.dataInizio)
          : request.dataInizio,
        dataFine: risultato.analisi.dataFine
          ? new Date(risultato.analisi.dataFine)
          : request.dataFine,
        oraDalle: risultato.analisi.oraDalle ?? request.oraDalle,
        oraAlle: risultato.analisi.oraAlle ?? request.oraAlle,
        motivazione: risultato.analisi.motivazione ?? request.motivazione,
        tipoOrdinanza: risultato.analisi.tipoOrdinanza ?? request.tipoOrdinanza,
      },
    })

    return NextResponse.json({ request: updated, analisi: risultato })
  } catch (error) {
    console.error("[ORDINANZA_ANALIZZA]", error)

    // ripristina stato NUOVA in caso di errore
    await prisma.ordinanzaRequest
      .update({ where: { id }, data: { stato: "NUOVA" } })
      .catch(() => {})

    const msg =
      error instanceof Error ? error.message : "Errore sconosciuto"
    return NextResponse.json({ error: `Errore analisi AI: ${msg}` }, { status: 500 })
  }
}
