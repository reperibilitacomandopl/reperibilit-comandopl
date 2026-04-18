const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function runSeed() {
  const tenantId = 'af8b5f1c-a217-44f1-803e-10c06f61656d'; // comandomateraprova ID
  console.log('Running seed for tenant:', tenantId);

  try {
    const tenantUsers = await prisma.user.findMany({ where: { tenantId } })
    const mainAdminId = tenantUsers.find(u => u.role === "ADMIN")?.id

    await prisma.$transaction(async (tx) => {
      // 1. Pulisci dipendenze
      await tx.shift.deleteMany({ where: { tenantId } })
      await tx.vehicle.deleteMany({ where: { tenantId } })
      await tx.rotationGroup.deleteMany({ where: { tenantId } })
      await tx.globalSettings.deleteMany({ where: { tenantId } })
      await tx.serviceType.deleteMany({ where: { tenantId } })
      await tx.serviceCategory.deleteMany({ where: { tenantId } })
      await tx.agentBalance.deleteMany({ where: { tenantId } })
      await tx.user.deleteMany({ 
        where: { 
          tenantId,
          id: mainAdminId ? { not: mainAdminId } : undefined
        } 
      })

      // 2. Categorie di Servizio (Gold Template)
      const catPronto = await tx.serviceCategory.create({
        data: { tenantId, name: "🚨 Nucleo Pronto Intervento", orderIndex: 1 }
      })
      const catViab = await tx.serviceCategory.create({
        data: { tenantId, name: "🚙 Nucleo Viabilità", orderIndex: 2 }
      })
      const catPoliz = await tx.serviceCategory.create({
        data: { tenantId, name: "🏠 Polizia Amministrativa/Edilizia", orderIndex: 3 }
      })

      // 3. Tipi di Servizio
      await tx.serviceType.createMany({
        data: [
          { tenantId, categoryId: catPronto.id, name: "Pattuglia H24" },
          { tenantId, categoryId: catPronto.id, name: "Rilevamento Infortuni" },
          { tenantId, categoryId: catViab.id, name: "Controllo Varchi" },
          { tenantId, categoryId: catViab.id, name: "Sosta e ZTL" },
          { tenantId, categoryId: catPoliz.id, name: "Accertamenti Anagrafici" }
        ]
      })

      // 4. Veicoli
      await tx.vehicle.createMany({
        data: [
          { tenantId, name: "Alfa Romeo Giulia (P01)" },
          { tenantId, name: "Fiat Panda 4x4 (P02)" },
          { tenantId, name: "Jeep Renegade (V01)" },
          { tenantId, name: "Moto BMW R1250" }
        ]
      })

      // 5. Gruppi di Rotazione
      const patternM = JSON.stringify(Array(28).fill("").map((_, i) => (i % 7 < 5) ? "M" : "RP"))
      const patternP = JSON.stringify(Array(28).fill("").map((_, i) => (i % 7 < 5) ? "P" : "RP"))
      
      const groupA = await tx.rotationGroup.create({
        data: {
          tenantId,
          name: "Squadra ALFA (Mattina)",
          pattern: patternM,
          mStartTime: "07:00",
          mEndTime: "13:00",
          pStartTime: "13:00",
          pEndTime: "19:00"
        }
      })
      const groupB = await tx.rotationGroup.create({
        data: {
          tenantId,
          name: "Squadra BETA (Pomeriggio)",
          pattern: patternP,
          mStartTime: "07:00",
          mEndTime: "13:00",
          pStartTime: "13:00",
          pEndTime: "19:00"
        }
      })

      // 5b. Impostazioni Globali
      await tx.globalSettings.create({
        data: {
          tenantId,
          minUfficiali: 1,
          massimaleAgente: 8,
          massimaleUfficiale: 10,
          usaProporzionale: true
        }
      })

      const hashedPassword = await bcrypt.hash("password123", 10)
      
      const officersRaw = [
        { name: "Commissario Capo Bianchi Mario", matricola: "UFF001", qualifica: "Commissario Capo" },
        { name: "Sost. Comm. Verdi Luca", matricola: "UFF002", qualifica: "Sostituto Commissario" },
        { name: "Comm. Rossi Anna", matricola: "UFF003", qualifica: "Commissario" }
      ]

      const agentsRaw = [
        { name: "Sovr. Capo Esposito Giovanni", matricola: "AGT001", qualifica: "Sovrintendente Capo" },
        { name: "Sovr. Ferrari Giulia", matricola: "AGT002", qualifica: "Sovrintendente" },
        { name: "Ass. Sc. Romano Alessandro", matricola: "AGT003", qualifica: "Assistente Scelto" },
        { name: "Ass. Colombo Matteo", matricola: "AGT004", qualifica: "Assistente" },
        { name: "Ag. Sc. Ricci Elena", matricola: "AGT005", qualifica: "Agente Scelto" },
        { name: "Ag. Marino Roberto", matricola: "AGT006", qualifica: "Agente" },
        { name: "Ag. Greco Sofia", matricola: "AGT007", qualifica: "Agente" },
        { name: "Ag. Bruno Davide", matricola: "AGT008", qualifica: "Agente" }
      ]

      for (let i = 0; i < officersRaw.length; i++) {
        const o = officersRaw[i]
        await tx.user.create({
          data: { 
            ...o, 
            tenantId, 
            password: hashedPassword, 
            role: "AGENTE", 
            isUfficiale: true, 
            forcePasswordChange: false,
            rotationGroupId: i % 2 === 0 ? groupA.id : groupB.id
          }
        })
      }

      for (let i = 0; i < agentsRaw.length; i++) {
        const a = agentsRaw[i]
        await tx.user.create({
          data: { 
            ...a, 
            tenantId, 
            password: hashedPassword, 
            role: "AGENTE", 
            isUfficiale: false, 
            forcePasswordChange: false,
            rotationGroupId: i % 2 === 0 ? groupA.id : groupB.id
          }
        })
      }
      console.log('Users created in transaction');

      const allUsers = await tx.user.findMany({ where: { tenantId } })
      const currentYear = new Date().getFullYear()

      for (const user of allUsers) {
        await tx.agentBalance.create({
          data: {
            tenantId,
            userId: user.id,
            year: currentYear,
            details: {
              create: [
                { code: "0015", label: "Ferie", initialValue: 30, unit: "DAYS" },
                { code: "0010", label: "Festività Soppresse", initialValue: 4, unit: "DAYS" },
                { code: "0031", label: "L. 104", initialValue: 36, unit: "HOURS" }
              ]
            }
          }
        })
      }
      console.log('Balances created in transaction');

    });
    console.log('✅ Seed completato con successo!');
  } catch (error) {
    console.error('❌ SEED ERROR:', error);
  }
}

runSeed().finally(() => prisma.$disconnect());
