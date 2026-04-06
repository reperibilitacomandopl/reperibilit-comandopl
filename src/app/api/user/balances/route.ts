import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    
    // Get year from query params or current year
    const url = new URL(req.url)
    const yearStr = url.searchParams.get("year")
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear()

    let balance = await prisma.agentBalance.findUnique({
      where: {
        userId_year: {
          userId: session.user.id,
          year: year
        }
      }
    })

    let ferieTotali = 28;
    let festivitaTotali = 4;
    let permessi104Totali = 36;

    if (balance) {
      ferieTotali = balance.ferieTotali;
      festivitaTotali = balance.festivitaTotali;
      permessi104Totali = balance.permessi104Totali;
    }

    // Now calculate how many they have USED based on accepted/pending agent requests OR absences.
    // For simplicity, we can fetch all absences of that year.
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    const absences = await prisma.absence.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startOfYear, lte: endOfYear }
      }
    })

    // Codes that map to Ferie/104/Festivita
    let usedFerie = 0;
    let used104 = 0;
    let usedFestivita = 0;

    absences.forEach(ab => {
      const c = ab.code.toUpperCase()
      if (c === "F" || c === "FERIE" || c === "0015" || c === "0016") usedFerie++;
      else if (c === "104" || c === "0031" || c === "0038") used104++;
      else if (c === "FEST_SOP" || c === "0010") usedFestivita++;
    })

    return NextResponse.json({ 
       year,
       balance: {
         ferieTotali: ferieTotali,
         ferieUsate: usedFerie,
         ferieResidue: ferieTotali - usedFerie,
         festivitaTotali: festivitaTotali,
         festivitaUsate: usedFestivita,
         festivitaResidue: festivitaTotali - usedFestivita,
         permessi104Totali: permessi104Totali,
         permessi104Usati: used104,
         permessi104Residui: permessi104Totali - used104
       }
    })

  } catch (err) {
    console.error("Error fetching balance:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
