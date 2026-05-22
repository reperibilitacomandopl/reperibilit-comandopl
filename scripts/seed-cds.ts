import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Extrapolated and enhanced data from prontuario-cds.json
const cdsData = [
  {
    articolo: 7,
    titolo: "Regolamentazione della circolazione nei centri abitati",
    testo: "Nei centri abitati i comuni possono, con ordinanza del sindaco, prescrivere divieti di sosta...",
    violazioni: [
      {
        comma: "1/15",
        descrizione: "Sosta in zona a traffico limitato (ZTL) o su strisce blu senza ticket",
        sanzioneMin: 29.40,
        sanzioneMax: 117.60,
        puntiPatente: 0,
        paroleChiave: ["sosta", "ztl", "strisce blu", "ticket", "parcheggio", "pagamento", "disco orario"]
      }
    ]
  },
  {
    articolo: 142,
    titolo: "Limiti di velocità",
    testo: "Ai fini della sicurezza della circolazione e della tutela della vita umana la velocità massima...",
    violazioni: [
      {
        comma: "7",
        descrizione: "Eccesso di velocità (superamento limite fino a 10 km/h)",
        sanzioneMin: 42.00,
        sanzioneMax: 173.00,
        puntiPatente: 0,
        paroleChiave: ["velocità", "eccesso", "limite", "veloce", "autovelox", "10 km/h"]
      },
      {
        comma: "8",
        descrizione: "Eccesso di velocità (superamento limite tra 10 e 40 km/h)",
        sanzioneMin: 173.00,
        sanzioneMax: 694.00,
        puntiPatente: 3,
        paroleChiave: ["velocità", "eccesso", "limite", "veloce", "autovelox", "40 km/h"]
      }
    ]
  },
  {
    articolo: 143,
    titolo: "Posizione dei veicoli sulla carreggiata",
    testo: "I veicoli devono circolare sulla parte destra della carreggiata e in prossimità del margine destro...",
    violazioni: [
      {
        comma: "11",
        descrizione: "Circolazione contromano",
        sanzioneMin: 167.00,
        sanzioneMax: 665.00,
        puntiPatente: 4,
        paroleChiave: ["contromano", "senso vietato", "senso unico", "inverso", "direzione vietata"]
      }
    ]
  },
  {
    articolo: 145,
    titolo: "Precedenza",
    testo: "I conducenti, approssimandosi ad una intersezione, devono usare la massima prudenza al fine di evitare incidenti...",
    violazioni: [
      {
        comma: "10",
        descrizione: "Mancata precedenza",
        sanzioneMin: 167.00,
        sanzioneMax: 665.00,
        puntiPatente: 5,
        paroleChiave: ["precedenza", "incrocio", "stop", "dare precedenza", "sinistro", "incidente", "urto"]
      }
    ]
  },
  {
    articolo: 146,
    titolo: "Violazione della segnaletica stradale",
    testo: "L'utente della strada è tenuto ad osservare i comportamenti imposti dalla segnaletica stradale...",
    violazioni: [
      {
        comma: "3",
        descrizione: "Passaggio con semaforo rosso",
        sanzioneMin: 167.00,
        sanzioneMax: 665.00,
        puntiPatente: 6,
        paroleChiave: ["semaforo", "rosso", "incrocio", "lanterna", "luce rossa"]
      }
    ]
  },
  {
    articolo: 157,
    titolo: "Arresto, fermata e sosta dei veicoli",
    testo: "In caso di arresto, fermata o sosta il veicolo deve essere collocato il più vicino possibile al margine destro...",
    violazioni: [
      {
        comma: "8",
        descrizione: "Sosta irregolare (motore acceso, non parallela al margine, ecc.)",
        sanzioneMin: 42.00,
        sanzioneMax: 173.00,
        puntiPatente: 0,
        paroleChiave: ["sosta", "fermata", "motore acceso", "margine", "irregolare"]
      }
    ]
  },
  {
    articolo: 158,
    titolo: "Divieto di fermata e di sosta dei veicoli",
    testo: "La fermata e la sosta sono vietate in prossimità dei passaggi a livello e sui binari...",
    violazioni: [
      {
        comma: "1",
        descrizione: "Divieto di fermata e sosta (curve, dossi, incroci, gallerie)",
        sanzioneMin: 87.00,
        sanzioneMax: 344.00,
        puntiPatente: 2,
        paroleChiave: ["fermata", "sosta", "curva", "dosso", "incrocio", "galleria", "pericolo"]
      },
      {
        comma: "2",
        descrizione: "Sosta su marciapiede, strisce pedonali o passo carrabile",
        sanzioneMin: 87.00,
        sanzioneMax: 344.00,
        puntiPatente: 2,
        paroleChiave: ["marciapiede", "strisce", "pedoni", "passo carrabile", "scivolo", "sosta", "parcheggio", "ingresso"]
      }
    ]
  },
  {
    articolo: 171,
    titolo: "Uso del casco protettivo per gli utenti di veicoli a due ruote",
    testo: "Durante la marcia, ai conducenti e agli eventuali passeggeri di ciclomotori e motocicli è fatto obbligo di indossare...",
    violazioni: [
      {
        comma: "1/2",
        descrizione: "Guida senza casco",
        sanzioneMin: 83.00,
        sanzioneMax: 332.00,
        puntiPatente: 5,
        sospensione: true,
        fermo: true,
        paroleChiave: ["casco", "testa", "moto", "scooter", "motociclo", "ciclomotore", "slacciato"]
      }
    ]
  },
  {
    articolo: 172,
    titolo: "Uso delle cinture di sicurezza e sistemi di ritenuta",
    testo: "Il conducente ed i passeggeri dei veicoli hanno l'obbligo di utilizzarle in qualsiasi situazione di marcia...",
    violazioni: [
      {
        comma: "1/10",
        descrizione: "Mancato uso delle cinture di sicurezza",
        sanzioneMin: 83.00,
        sanzioneMax: 332.00,
        puntiPatente: 5,
        paroleChiave: ["cintura", "cinture", "sicurezza", "seggiolino", "bambini"]
      }
    ]
  },
  {
    articolo: 173,
    titolo: "Uso di lenti o di determinati apparecchi durante la guida",
    testo: "È vietato al conducente di far uso durante la marcia di apparecchi radiotelefonici ovvero di usare cuffie sonore...",
    violazioni: [
      {
        comma: "2/3",
        descrizione: "Uso del cellulare alla guida",
        sanzioneMin: 165.00,
        sanzioneMax: 660.00,
        puntiPatente: 5,
        paroleChiave: ["cellulare", "telefono", "smartphone", "chiamata", "messaggio", "whatsapp", "mano"]
      }
    ]
  },
  {
    articolo: 180,
    titolo: "Possesso dei documenti di circolazione e di guida",
    testo: "Per poter circolare con veicoli a motore il conducente deve avere con sé i documenti...",
    violazioni: [
      {
        comma: "1/7",
        descrizione: "Mancanza di documenti al seguito (patente, libretto, assicurazione)",
        sanzioneMin: 42.00,
        sanzioneMax: 173.00,
        puntiPatente: 0,
        paroleChiave: ["documenti", "patente", "libretto", "assicurazione", "dimenticato", "casa", "seguito", "carta di circolazione"]
      }
    ]
  },
  {
    articolo: 186,
    titolo: "Guida sotto l'influenza dell'alcool",
    testo: "È vietato guidare in stato di ebbrezza in conseguenza dell'uso di bevande alcoliche...",
    violazioni: [
      {
        comma: "2",
        descrizione: "Guida in stato di ebbrezza",
        sanzioneMin: 543.00,
        sanzioneMax: 2170.00,
        puntiPatente: 10,
        sospensione: true,
        fermo: true,
        contestoOperativo: "Necessario scontrino etilometro",
        paroleChiave: ["alcol", "alcool", "ebbrezza", "ubriaco", "etilometro", "bere", "vino", "birra"]
      }
    ]
  },
  {
    articolo: 188,
    titolo: "Circolazione e sosta dei veicoli al servizio di persone invalide",
    testo: "Per la circolazione e la sosta dei veicoli al servizio delle persone invalide...",
    violazioni: [
      {
        comma: "4",
        descrizione: "Sosta abusiva in stallo per invalidi",
        sanzioneMin: 165.00,
        sanzioneMax: 660.00,
        puntiPatente: 4,
        paroleChiave: ["invalidi", "disabili", "stallo", "parcheggio", "giallo", "concessione", "spazio"]
      }
    ]
  },
  {
    articolo: 193,
    titolo: "Obbligo dell'assicurazione di responsabilità civile",
    testo: "I veicoli a motore senza guida di rotaie non possono essere posti in circolazione...",
    violazioni: [
      {
        comma: "2",
        descrizione: "Veicolo sprovvisto di copertura assicurativa",
        sanzioneMin: 866.00,
        sanzioneMax: 3464.00,
        puntiPatente: 5,
        fermo: true,
        paroleChiave: ["assicurazione", "rca", "scoperto", "scaduta", "polizza", "tagliando"]
      }
    ]
  }
]

async function main() {
  console.log('🔄 Inizio sincronizzazione Codice della Strada nel Database...')

  for (const art of cdsData) {
    // 1. Upsert Article
    // @ts-ignore - Prisma client non ancora generato localmente per i nuovi modelli
    const article = await prisma.cdsArticle.upsert({
      where: { articolo: art.articolo },
      update: {
        titolo: art.titolo,
        testo: art.testo,
        aggiornatoIl: new Date()
      },
      create: {
        articolo: art.articolo,
        titolo: art.titolo,
        testo: art.testo
      }
    })

    console.log(`✅ Articolo ${article.articolo} sincronizzato.`)

    // 2. Upsert Violations
    for (const viol of art.violazioni as any[]) {
      // Find existing to avoid duplicates if possible based on article and comma
      // @ts-ignore
      const existingViol = await prisma.cdsViolation.findFirst({
        where: {
          articoloId: article.id,
          comma: viol.comma
        }
      })

      if (existingViol) {
        // @ts-ignore
        await prisma.cdsViolation.update({
          where: { id: existingViol.id },
          data: {
            descrizione: viol.descrizione,
            sanzioneMin: viol.sanzioneMin,
            sanzioneMax: viol.sanzioneMax,
            puntiPatente: viol.puntiPatente,
            sospensione: viol.sospensione || false,
            fermo: viol.fermo || false,
            contestoOperativo: viol.contestoOperativo,
            paroleChiave: viol.paroleChiave
          }
        })
      } else {
        // @ts-ignore
        await prisma.cdsViolation.create({
          data: {
            articoloId: article.id,
            comma: viol.comma,
            descrizione: viol.descrizione,
            sanzioneMin: viol.sanzioneMin,
            sanzioneMax: viol.sanzioneMax,
            puntiPatente: viol.puntiPatente,
            sospensione: viol.sospensione || false,
            fermo: viol.fermo || false,
            contestoOperativo: viol.contestoOperativo,
            paroleChiave: viol.paroleChiave
          }
        })
      }
    }
  }

  console.log('🎉 Sincronizzazione Prontuario CdS completata con successo!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
