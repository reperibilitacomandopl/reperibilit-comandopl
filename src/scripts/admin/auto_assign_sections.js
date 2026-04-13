const xlsx = require("xlsx");
const path = require("path");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mapDefaults() {
  const filePath = path.resolve("C:\\Users\\dibenedettom\\Desktop\\portale-caserma\\Reperibilità dal 01_04_2026 al 30_04_2026-OK.xlsx");
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  const categories = await prisma.serviceCategory.findMany();
  
  // Algoritmo di Riconoscimento Intuitivo
  const getCatId = (text) => {
    const t = text.toUpperCase();
    if (t.includes("VIABILITA") || t.includes("PRONTO INTERVENTO") || t.includes("MOTOCICL")) return categories.find(c => c.name === "VIABILITA'")?.id;
    if (t.includes("EDILIZIA")) return categories.find(c => c.name === "EDILIZIA")?.id;
    if (t.includes("AMBIENT")) return categories.find(c => c.name === "AMBIENTE")?.id;
    if (t.includes("GIUDIZIARIA")) return categories.find(c => c.name === "POLIZIA GIUDIZIARIA")?.id;
    if (t.includes("CENTRALE") || t.includes("PIANTONE") || t.includes("OPERATIVA")) return categories.find(c => c.name === "CENTRALE OPERATIVA")?.id;
    if (t.includes("VERBALI") || t.includes("CED")) return categories.find(c => c.name === "UFFICIO VERBALI")?.id;
    if (t.includes("COMMERCIO") || t.includes("ANNONA")) return categories.find(c => c.name === "COMMERCIO E ANNONA")?.id;
    if (t.includes("AMMINISTRATIVA") || t.includes("COMMERCIAL")) return categories.find(c => c.name.includes("AMMINISTRA") || c.name.includes("EDILIZIA"))?.id;
    return null; // Ufficiali e non riconosciuti resteranno "A disposizione" (che è corretto)
  };

  let updatedCount = 0;
  console.log("🛠️ Inizio Compilazione Pannello Gestione Sezioni (Drag&Drop)...");

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0] || row[0] === "AGENTE") continue; 
    
    const name = row[0].toString().trim();
    const sezioneTesto = row[3] ? row[3].toString().trim() : "";
    
    const catId = getCatId(sezioneTesto);

    if (catId) {
      const dbUser = await prisma.user.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
      });

      if (dbUser) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { defaultServiceCategoryId: catId }
        });
        console.log(`[✔] PUNTATORE SETTATO: ${name} --> Trascindato dentro il contenitore ${sezioneTesto}`);
        updatedCount++;
      }
    } else {
        console.log(`[!] Salto posizionamento scatola per: ${name} (Resterà "A Disposizione" laterale per flessibilità O.d.s)`);
    }
  }
  console.log(`\n✅ Magia Eseguita! ${updatedCount} Agenti sono stati teletrasportati nei rispettivi Riquadri Verdi della tua foto.`);
}

mapDefaults().catch(console.error).finally(()=>prisma.$disconnect());
