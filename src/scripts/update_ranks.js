const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

const rankMap = [
  { rank: "DIRIGENTE GENERALE", level: 1 },
  { rank: "DIRIGENTE SUPERIORE", level: 2 },
  { rank: "DIRIGENTE", level: 3 },
  { rank: "COMANDANTE", level: 3 },
  { rank: "COMMISSARIO SUPERIORE", level: 4 },
  { rank: "COMMISSARIO CAPO", level: 5 },
  { rank: "COMMISSARIO", level: 6 },
  { rank: "VICE COMMISSARIO", level: 7 },
  { rank: "ISPETTORE SUPERIORE", level: 8 },
  { rank: "ISPETTORE CAPO", level: 9 },
  { rank: "ISPETTORE", level: 10 },
  { rank: "VICE ISPETTORE", level: 11 },
  { rank: "SOVRINTENDENTE CAPO", level: 12 },
  { rank: "SOVRINTENDENTE", level: 13 },
  { rank: "VICE SOVRINTENDENTE", level: 14 },
  { rank: "ASSISTENTE", level: 15 },
  { rank: "AGENTE SCELTO", level: 16 },
  { rank: "AGENTE DI P.L.", level: 17 },
  { rank: "AGENTE", level: 17 } // default lowest
];

function getGradoLivello(qualifica) {
  if (!qualifica) return 99;
  const qStr = qualifica.toUpperCase().trim();
  
  // Trova il primo match
  for (const r of rankMap) {
    if (qStr === r.rank || qStr.includes(r.rank)) {
       // Assicura l'esatto match per evitare sovrapposizioni, es "Vice Commissario" vs "Commissario"
       // ma poichè r.rank sono ordinati e if lo controlla in ordine:
       // "VICE COMMISSARIO" viene beccato se qStr è "VICE COMMISSARIO"
       // "COMMISSARIO SUPERIORE" viene beccato prima di "COMMISSARIO" ecc.
       // E' importante l'ordine nel rankMap o un exact match
    }
  }

  // Meglio fare un match più preciso, vediamo:
  for(const r of rankMap) {
    if (qStr === r.rank) return r.level;
  }
  
  // Fallback se ci sono differenze minime
  for(const r of rankMap) {
    if (qStr.includes(r.rank)) return r.level;
  }

  return 99; // Se non trovato
}

async function main() {
  console.log("INIZIO RICALCOLO GRADI...");
  const users = await prisma.user.findMany({
     select: { id: true, name: true, qualifica: true, gradoLivello: true }
  });

  let updatedCount = 0;
  for (const u of users) {
     const newLevel = getGradoLivello(u.qualifica);
     if (newLevel !== 99 && u.gradoLivello !== newLevel) {
        console.log(`Aggiornamento: ${u.name} | ${u.qualifica} -> ${newLevel}`);
        await prisma.user.update({
           where: { id: u.id },
           data: { gradoLivello: newLevel }
        });
        updatedCount++;
     }
  }

  console.log(`Ricalcolo completato. ${updatedCount} agenti aggiornati.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
