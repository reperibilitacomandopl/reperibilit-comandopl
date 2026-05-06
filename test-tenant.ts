import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const tenantId = "d067ae4e-1c94-4f0d-b540-d1716214b54b";
const defaultPassword = "$2a$10$wE9OqjJvGxjzZcTq5d.LueP2aX7M8uDq4Cj4vH8sS9fG/t9lO8R9W"; // "password"

async function run() {
  console.log("Inizio generazione dati per comando-test...");

  // 1. Svuotamento dati esistenti per il tenant
  console.log("Pulizia dati precedenti...");
  await prisma.clockRecord.deleteMany({ where: { tenantId } });
  await prisma.shiftSwapRequest.deleteMany({ where: { tenantId } });
  await prisma.agentRequest.deleteMany({ where: { tenantId } });
  await prisma.shift.deleteMany({ where: { tenantId } });
  await prisma.agentBalance.deleteMany({ where: { tenantId } });
  await prisma.vehicle.deleteMany({ where: { tenantId } });
  await prisma.radio.deleteMany({ where: { tenantId } });
  await prisma.weapon.deleteMany({ where: { tenantId } });
  await prisma.armor.deleteMany({ where: { tenantId } });
  await prisma.serviceType.deleteMany({ where: { tenantId } });
  await prisma.serviceCategory.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });

  // 2. Creazione Categorie di Servizio
  console.log("Creazione Servizi e Veicoli...");
  const catViabilita = await prisma.serviceCategory.create({
    data: { tenantId, name: "VIABILITA E PRONTO INTERVENTO", orderIndex: 1 }
  });
  const catUfficio = await prisma.serviceCategory.create({
    data: { tenantId, name: "SERVIZI INTERNI E UFFICIO", orderIndex: 2 }
  });

  const typePattuglia = await prisma.serviceType.create({
    data: { tenantId, categoryId: catViabilita.id, name: "Pattuglia Automontata" }
  });
  const typeMotociclisti = await prisma.serviceType.create({
    data: { tenantId, categoryId: catViabilita.id, name: "Pattuglia Motomontata" }
  });
  const typePiantone = await prisma.serviceType.create({
    data: { tenantId, categoryId: catUfficio.id, name: "Piantone Caserma" }
  });

  // 3. Creazione Veicoli
  const vehicles = [];
  for (let i = 1; i <= 5; i++) {
    vehicles.push(await prisma.vehicle.create({
      data: { tenantId, name: `Alfa ${i} - Fiat Tipo`, stato: "ATTIVO" }
    }));
  }

  // 4. Creazione Utenti (Gerarchia)
  console.log("Creazione Personale (Ufficiali e Agenti)...");
  const users = [];

  // Comandante
  users.push(await prisma.user.create({
    data: {
      tenantId, name: "COMANDANTE ROSSI MARIO", email: "comandante@test.it",
      role: "ADMIN", isUfficiale: true, matricola: "CMD001", qualifica: "Comandante",
      isActive: true, canManageShifts: true, canManageUsers: true,
      password: defaultPassword,
    }
  }));

  // Ufficiali
  for (let i = 1; i <= 3; i++) {
    users.push(await prisma.user.create({
      data: {
        tenantId, name: `UFFICIALE BIANCHI LUCA ${i}`, email: `ufficiale${i}@test.it`,
        role: "UFFICIALE", isUfficiale: true, matricola: `UFF00${i}`, qualifica: "Vice Commissario",
        isActive: true, canManageShifts: true,
        password: defaultPassword,
      }
    }));
  }

  // Agenti
  for (let i = 1; i <= 15; i++) {
    users.push(await prisma.user.create({
      data: {
        tenantId, name: `AGENTE ESPOSITO ${i}`, email: `agente${i}@test.it`,
        role: "AGENTE", isUfficiale: false, matricola: `AGT00${i}`, qualifica: "Agente di P.L.",
        isActive: true,
        password: defaultPassword,
      }
    }));
  }

  // 5. Assegnazione Saldi
  console.log("Assegnazione Saldi...");
  for (const u of users) {
    await prisma.agentBalance.create({
      data: {
        tenantId, userId: u.id, year: 2026,
        details: {
          create: [
            { code: "FERIE", label: "Ferie", initialValue: 32, unit: "DAYS" },
            { code: "FERIE_", label: "Ferie AP", initialValue: 5, unit: "DAYS" },
            { code: "FEST_S", label: "Festività Soppresse", initialValue: 4, unit: "DAYS" }
          ]
        }
      }
    });
  }

  // 6. Generazione Turni per Maggio 2026
  console.log("Generazione Turni per Maggio 2026...");
  const year = 2026;
  const month = 5; // Maggio (1-indexed per i calcoli ma i Date vanno da 0-11)
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // mezzogiorno per evitare problemi fuso
    const dayOfWeek = date.getUTCDay(); // 0 = Domenica

    // Distribuzione turni giornaliera
    // Metà degli agenti a M7, metà a P13
    for (let uIdx = 0; uIdx < users.length; uIdx++) {
      const u = users[uIdx];

      // Simulazione Riposi
      let isRiposo = false;
      // Agenti 0-5 hanno riposo fisso di Domenica
      if (uIdx <= 5 && dayOfWeek === 0) isRiposo = true;
      // Altri hanno riposo a rotazione: un giorno ogni 6
      if (uIdx > 5 && (day + uIdx) % 7 === 0) isRiposo = true;

      if (isRiposo) {
        await prisma.shift.create({
          data: { tenantId, userId: u.id, date, type: "RP", durationHours: 0 }
        });
        continue;
      }

      // Reperibilità (7 o 8 al mese per ciascuno)
      let rType = "";
      // Distribuiamo le REP: es. se il giorno + idx è multiplo di 4
      if ((day + uIdx) % 4 === 0) {
        rType = "REP";
      }

      // Turno effettivo (M7 o P13)
      const sType = uIdx % 2 === 0 ? "M7" : "P13";
      
      const v = vehicles[uIdx % vehicles.length];

      await prisma.shift.create({
        data: { 
          tenantId, userId: u.id, date, 
          type: sType, repType: rType, 
          durationHours: 6,
          vehicleId: v.id,
          serviceCategoryId: catViabilita.id,
          serviceTypeId: typePattuglia.id
        }
      });

      // Se non è riposo, generiamo le timbrature!
      // Ingressi / Uscite in base al turno
      let inHour = sType === "M7" ? 7 : 13;
      let inMin = 15;
      let outHour = sType === "M7" ? 13 : 19;
      let outMin = 15;

      const inDate = new Date(Date.UTC(year, month - 1, day, inHour - 2, inMin, 0)); // UTC offset finto -2 per l'ora locale IT estiva
      const outDate = new Date(Date.UTC(year, month - 1, day, outHour - 2, outMin, 0));

      await prisma.clockRecord.createMany({
        data: [
          { tenantId, userId: u.id, timestamp: inDate, type: "IN" },
          { tenantId, userId: u.id, timestamp: outDate, type: "OUT" }
        ]
      });
    }
  }

  // Aggiungiamo qualche giorno di Ferie manuale per verificare i calcoli del Cartellino
  console.log("Inserimento assenze e richieste fittizie...");
  const sampleUser = users[10]; // Agente 5
  
  // Sovrascriviamo il turno del giorno 10 con Ferie
  await prisma.shift.updateMany({
    where: { tenantId, userId: sampleUser.id, date: { gte: new Date(Date.UTC(year, month-1, 10, 0,0,0)), lt: new Date(Date.UTC(year, month-1, 11, 0,0,0)) } },
    data: { type: "FERIE", durationHours: 0, repType: "" }
  });
  
  // Cancelliamo le timbrature di quel giorno per quell'agente
  await prisma.clockRecord.deleteMany({
    where: { tenantId, userId: sampleUser.id, timestamp: { gte: new Date(Date.UTC(year, month-1, 10, 0,0,0)), lt: new Date(Date.UTC(year, month-1, 11, 0,0,0)) } }
  });

  // Creazione Richiesta Congedo (da approvare)
  await prisma.agentRequest.create({
    data: {
      tenantId, userId: users[12].id, date: new Date(Date.UTC(year, month - 1, 15, 12, 0, 0)),
      code: "FERIE", status: "PENDING", notes: "Richiesta ferie per visita"
    }
  });

  // Creazione Scambio Turno
  const shiftToSwap = await prisma.shift.findFirst({
    where: { tenantId, userId: users[13].id }
  });
  if (shiftToSwap) {
    await prisma.shiftSwapRequest.create({
      data: {
        tenantId, 
        requesterId: users[13].id, targetUserId: users[14].id,
        shiftId: shiftToSwap.id,
        status: "PENDING", message: "Cambio per motivi familiari"
      }
    });
  }

  console.log("Generazione completata con successo!");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
