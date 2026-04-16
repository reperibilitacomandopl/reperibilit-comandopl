
import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const filePath = "Programmazione POLIZIA LOCALE ALTAMURA dal 01_05_2026 al 01_06_2026.xlsx";
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // 1. Carica Categorie esistenti
  const categories = await prisma.serviceCategory.findMany();
  const catMap: Record<string, string> = {};
  categories.forEach(c => {
    catMap[c.name.toUpperCase()] = c.id;
  });

  // Helper per mappare Squadra Excel -> Categoria Portale
  const getCatId = (squadra: string) => {
    const s = squadra.toUpperCase();
    if (s.includes("PRONTO INTERVENTO") || s.includes("VIABILITA")) return catMap["VIABILITA'"];
    if (s.includes("EDILIZIA")) return catMap["EDILIZIA"];
    if (s.includes("GIUDIZIARIA")) return catMap["POLIZIA GIUDIZIARIA"];
    if (s.includes("UFFICIALI") || s.includes("COMANDO") || s.includes("CENTRALE OPERATIVA") || s.includes("CED")) return catMap["COMANDO"];
    if (s.includes("COMMERCIALE")) return catMap["COMMERCIO"];
    if (s.includes("AMBIENT")) return catMap["AMBIENTE"];
    return null;
  };

  const users = await prisma.user.findMany({ select: { id: true, name: true } });

  console.log(`--- Inizio Sincronizzazione per ${data.length} righe ---`);

  let updatedCount = 0;
  let notFoundUsers: string[] = [];

  // Le righe dati iniziano solitamente dalla riga 4 (indice 3)
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const name = row[0]?.toString().trim().toUpperCase();
    const squadra = row[3]?.toString().trim();

    if (!name || !squadra) continue;

    // Cerca utente (fuzzy match di base o exact)
    const user = users.find(u => u.name.toUpperCase() === name);

    if (user) {
      const catId = getCatId(squadra);
      if (catId) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            defaultServiceCategoryId: catId,
            servizio: squadra // Salviamo anche l'etichetta originale dell'excel
          }
        });
        updatedCount++;
        console.log(`✅ [${updatedCount}] Mappato: ${name} -> ${squadra} (${catId})`);
      } else {
        console.log(`⚠️  Nessuna categoria trovata per squadra: ${squadra} (Agente: ${name})`);
      }
    } else {
      notFoundUsers.push(name);
    }
  }

  console.log("\n--- FINE ---");
  console.log(`Totale aggiornati: ${updatedCount}`);
  if (notFoundUsers.length > 0) {
    console.log(`Agenti NON trovati nel database: ${notFoundUsers.join(", ")}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
