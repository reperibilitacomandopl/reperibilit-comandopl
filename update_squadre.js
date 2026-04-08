const xlsx = require("xlsx");
const path = require("path");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSquadre() {
  const filePath = path.resolve("C:\\Users\\dibenedettom\\Desktop\\portale-caserma\\Reperibilità dal 01_04_2026 al 30_04_2026-OK.xlsx");
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  let updatedCount = 0;

  console.log("🛠️ Inizio Travaso Sezioni Appartenenza...");

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0] || row[0] === "AGENTE") continue; 
    
    const name = row[0].toString().trim();
    const sezione = row[3] ? row[3].toString().trim() : null; // Indice 3 = Sezione
    
    if (!sezione) continue; // Salta se la cella è vuota

    const dbUser = await prisma.user.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (dbUser) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { 
          squadra: sezione,   // Assegnazione nel campo testuale storico
          servizio: sezione   // Assegnazione parallela per coprire eventuali export
        }
      });
      console.log(`[✔] ${name} Assegnato al reparto => ${sezione}`);
      updatedCount++;
    }
  }
  console.log(`\n✅ Squadre e Sezioni Assegnate Permanentemente a ${updatedCount} Agenti!`);
}

updateSquadre().catch(console.error).finally(()=>prisma.$disconnect());
