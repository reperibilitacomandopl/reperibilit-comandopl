const xlsx = require("xlsx");
const path = require("path");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getLivello = (q) => {
  const norm = (q || "").toUpperCase();
  if (norm.includes("COMANDANTE") || norm.includes("DIRIGENTE")) return 1;
  if (norm.includes("COMMISSARIO CAPO")) return 2;
  if (norm.includes("VICE QUESTORE")) return 3;
  if (norm.includes("COMMISSARIO")) return 4;
  if (norm.includes("SOSTITUTO COMMISSARIO")) return 5;
  if (norm.includes("ISPETTORE CAPO")) return 6;
  if (norm.includes("VICE ISPETTORE")) return 8;
  if (norm.includes("ISPETTORE")) return 7;
  if (norm.includes("SOVRINTENDENTE CAPO")) return 9;
  if (norm.includes("VICE SOVRINTENDENTE")) return 11;
  if (norm.includes("SOVRINTENDENTE")) return 10;
  if (norm.includes("ASSISTENTE SCELTO")) return 12;
  if (norm.includes("ASSISTENTE")) return 13;
  if (norm.includes("AGENTE SCELTO")) return 14;
  return 15; // Agente Semplice (Numero più alto, grado gerarchico più basso)
};

async function updateDatabase() {
  const filePath = path.resolve("C:\\Users\\dibenedettom\\Desktop\\portale-caserma\\Reperibilità dal 01_04_2026 al 30_04_2026-OK.xlsx");
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  let updatedCount = 0;

  console.log("🛠️ Inizio Mappatura Gerarchica nel Database...");

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0] || row[0] === "AGENTE") continue; // Salta Header
    
    const name = row[0].toString().trim();
    const matricola = row[1] ? row[1].toString().trim() : null;
    const qualifica = row[2] ? row[2].toString().trim() : "Agente di P.L.";
    
    // Trova Risorsa
    const dbUser = await prisma.user.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (dbUser) {
      const lvl = getLivello(qualifica);
      
      // I Commissari vengono elevati brutalmente a "Ufficiale" anche a livello di Flag.
      const isUfficialeFlag = lvl <= 4; 

      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          qualifica: qualifica,
          gradoLivello: lvl,
          isUfficiale: isUfficialeFlag || dbUser.isUfficiale // Mantieni se lo era già
        }
      });
      console.log(`[✔] Registrato: ${name} => ${qualifica} (RATING HIERARCHICO: ${lvl})`);
      updatedCount++;
    }
  }
  console.log(`\n✅ Trattamento Concluso. ${updatedCount} Agenti Aggiornati con i Loro Gradi Reali!`);
}

updateDatabase().catch(console.error).finally(()=>prisma.$disconnect());
