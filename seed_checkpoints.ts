
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"

const prisma = new PrismaClient()

async function main() {
  const tenantId = "tenant_id_to_replace"; // We will replace this dynamically
  const tenant = await prisma.tenant.findFirst()
  if (!tenant) {
    console.error("Nessun tenant trovato!")
    return
  }
  const tid = tenant.id

  // 1. Pulisci i dati vecchi
  await prisma.checkpoint.deleteMany({ where: { tenantId: tid } })

  console.log("Generazione di dati realistici per gli ultimi 12 mesi...")
  const now = new Date()
  
  const luoghi = ["Piazza Garibaldi", "Via Roma", "Via Milano", "Corso Vittorio Emanuele", "Via Napoli", "Piazza Duomo", "SS 16", "Via Bari", "SP 23", "Viale delle Olimpiadi"]
  const operatori = ["Isp. Rossi", "Ag. Bianchi, Ag. Verdi", "Sov. Neri, Ag. Gialli", "Isp. Russo", "Ag. Ferrari", "Isp. Esposito, Ag. Romano"]
  const veicoliServizio = ["Alfa Romeo Giulia", "Fiat Tipo", "Subaru Forester", "Jeep Renegade", "Moto BMW"]
  
  const targhe = Array.from({length: 100}, () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const l1 = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)]
    const l2 = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)]
    const num = String(Math.floor(Math.random() * 999)).padStart(3, "0")
    return l1 + num + l2
  })

  // Aggiungiamo qualche targa "recidiva" che compare più spesso
  const targheRecidive = [targhe[0], targhe[1], targhe[2], targhe[3], targhe[4]]

  const sanzioniFrequenti = [
    "Art. 172 C.10 - MANCATO USO CINTURE",
    "Art. 173 - USO DEL CELLULARE",
    "Art. 142 - ECCESSO DI VELOCITA",
    "Art. 193 - MANCANZA COPERTURA ASSICURATIVA",
    "Art. 80 - OMESSA REVISIONE"
  ]

  let totalCheckpoints = 0
  let totalVehicles = 0

  // Generiamo controlli per gli ultimi 12 mesi
  for (let i = 11; i >= 0; i--) {
    const monthBase = new Date(now.getFullYear(), now.getMonth() - i, 15) // metà mese
    // Da 5 a 15 controlli al mese
    const controlliMese = Math.floor(Math.random() * 11) + 5
    
    for (let j = 0; j < controlliMese; j++) {
      // Data casuale nel mese
      const dayOffset = Math.floor(Math.random() * 28) - 14
      const dataControllo = new Date(monthBase)
      dataControllo.setDate(dataControllo.getDate() + dayOffset)
      
      const oraInizioObj = new Date(dataControllo)
      oraInizioObj.setHours(Math.floor(Math.random() * 12) + 7, 0, 0)
      const oraFineObj = new Date(oraInizioObj)
      oraFineObj.setHours(oraInizioObj.getHours() + 2)

      const checkpoint = await prisma.checkpoint.create({
        data: {
          tenantId: tid,
          dataControllo: dataControllo,
          oraInizio: oraInizioObj.toTimeString().substring(0,5),
          oraFine: oraFineObj.toTimeString().substring(0,5),
          luogo: luoghi[Math.floor(Math.random() * luoghi.length)],
          operatori: operatori[Math.floor(Math.random() * operatori.length)],
          veicoloServizio: veicoliServizio[Math.floor(Math.random() * veicoliServizio.length)],
          importSource: "MANUALE"
        }
      })
      totalCheckpoints++

      // Da 3 a 12 veicoli per controllo
      const numVeicoli = Math.floor(Math.random() * 10) + 3
      
      for (let k = 0; k < numVeicoli; k++) {
        // 15% di probabilità di targa recidiva
        const targa = Math.random() > 0.85 
          ? targheRecidive[Math.floor(Math.random() * targheRecidive.length)]
          : targhe[Math.floor(Math.random() * targhe.length)]
        
        // 10% di probabilità di sanzione
        const hasSanzione = Math.random() > 0.90
        const sanzione = hasSanzione ? sanzioniFrequenti[Math.floor(Math.random() * sanzioniFrequenti.length)] : null

        // Anomalie (5% revisione scaduta, 2% assicurazione)
        let revisione = new Date(dataControllo)
        if (Math.random() > 0.95) {
          revisione.setFullYear(revisione.getFullYear() - 1) // Scaduta
        } else {
          revisione.setFullYear(revisione.getFullYear() + 1) // Valida
        }

        let assicurazione = new Date(dataControllo)
        if (Math.random() > 0.98) {
          assicurazione.setMonth(assicurazione.getMonth() - 2) // Scaduta
        } else {
          assicurazione.setMonth(assicurazione.getMonth() + 6) // Valida
        }

        await prisma.checkedVehicle.create({
          data: {
            tenantId: tid,
            checkpointId: checkpoint.id,
            targa: targa,
            tipoVeicolo: "AUTOVETTURA",
            sanzioneElevata: sanzione,
            ultimaRevisione: revisione,
            assicuratoFino: assicurazione
          }
        })
        totalVehicles++
      }
    }
  }

  // Aggiungiamo anche un controllo "oggi" per far vedere le statistiche giornaliere
  const checkpointOggi = await prisma.checkpoint.create({
    data: {
      tenantId: tid,
      dataControllo: new Date(),
      oraInizio: "08:00",
      oraFine: "12:00",
      luogo: "Via Napoli",
      operatori: "Pattuglia Falco 1",
      veicoloServizio: "Alfa Romeo",
      importSource: "MANUALE"
    }
  })
  totalCheckpoints++

  for (let k = 0; k < 5; k++) {
    await prisma.checkedVehicle.create({
      data: {
        tenantId: tid,
        checkpointId: checkpointOggi.id,
        targa: targhe[Math.floor(Math.random() * targhe.length)],
        tipoVeicolo: "AUTOVETTURA",
        sanzioneElevata: k === 0 ? "Art. 142 - ECCESSO DI VELOCITA" : null,
        ultimaRevisione: new Date(now.getFullYear() + 1, 1, 1),
        assicuratoFino: new Date(now.getFullYear() + 1, 1, 1)
      }
    })
    totalVehicles++
  }

  console.log(`Fatto! Inseriti ${totalCheckpoints} posti di controllo e ${totalVehicles} veicoli.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

