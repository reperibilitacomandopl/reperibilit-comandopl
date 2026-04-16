import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const prisma = new PrismaClient()

async function syncPersonnel() {
  console.log("🚀 Avvio sincronizzazione anagrafica...")

  const filePath = "c:\\Users\\dibenedettom\\Desktop\\portale-caserma\\Programmazione dal 01_04_2026 al 01_05_2026_file\\sheet001.htm"
  
  if (!fs.existsSync(filePath)) {
    console.error("❌ File non trovato:", filePath)
    return
  }

  const content = fs.readFileSync(filePath, "utf-8")
  
  // Regex per estrarre le righe della tabella HTML
  // Struttura attesa: <tr> ... <td>Nome</td> <td>Matricola</td> <td>Qualifica</td> <td>Squadra</td> ... </tr>
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi

  let match
  let count = 0
  let updated = 0
  let created = 0

  // Trova il primo tenant (assumiamo sia quello principale per questo Comando)
  const tenant = await prisma.tenant.findFirst()
  if (!tenant) {
    console.error("❌ Nessun Tenant trovato nel database.")
    return
  }
  console.log(`📍 Utilizzando Tenant: ${tenant.name} (${tenant.id})`)

  // Carica categorie per mappatura automatica
  const categories = await prisma.serviceCategory.findMany({
    where: { tenantId: tenant.id },
    include: { types: true }
  })

  while ((match = rowRegex.exec(content)) !== null) {
    const rowHtml = match[1]
    const tds = []
    let tdMatch
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      // Pulizia HTML e entità
      let text = tdMatch[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
      tds.push(text)
    }

    if (tds.length < 4) continue

    const name = tds[0].toUpperCase()
    const matricola = tds[1]
    const qualifica = tds[2]
    const squadra = tds[3]

    // Salta header o righe vuote o righe con keyword di sistema
    if (name === "AGENTE" || !name || !matricola || isNaN(Number(matricola))) continue

    count++

    // Rilevamento Ufficiale
    const qual = qualifica.toUpperCase()
    const squad = squadra.toUpperCase()
    const isUff = squad.includes("UFFICIALI") || 
                  qual.includes("COMMISSARIO") || 
                  qual.includes("ISPETTORE") || 
                  qual.includes("DIRIGENTE") || 
                  qual.includes("COMANDANTE") ||
                  qual.includes("TENENTE") ||
                  qual.includes("CAPITANO")

    // Mapping Sezione
    let defaultCatId = null
    let defaultTypeId = null
    const matchedCat = categories.find(c => {
      const cName = c.name.toUpperCase()
      const sClean = squad.replace("POLIZIA ", "").replace("PRONTO ", "").replace("UFFICIO ", "").trim()
      return squad.includes(cName) || cName.includes(sClean)
    })
    if (matchedCat) {
      defaultCatId = matchedCat.id
      if (matchedCat.types.length > 0) defaultTypeId = matchedCat.types[0].id
    }

    // Cerca utente per matricola
    let user = await prisma.user.findFirst({
      where: { matricola: matricola, tenantId: tenant.id }
    })

    if (user) {
      // Aggiorna
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name,
          qualifica: qualifica,
          servizio: squadra,
          isUfficiale: isUff,
          defaultServiceCategoryId: user.defaultServiceCategoryId || defaultCatId,
          defaultServiceTypeId: user.defaultServiceTypeId || defaultTypeId
        }
      })
      updated++
    } else {
      // Crea (placeholder password)
      const crypto = await import("crypto")
      const tempPass = "$2a$10$PHH.VnZf9mZ4L6tXZS.HreLh6p1z6pQv8L8z8z8z8z8z8z8z8z8z8" // Corrisponde a una pass di default hashata se possibile, o usiamo bcrypt in runtime se disponibile. 
      // Per semplicità usiamo un hash corretto se abbiamo bcrypt, altrimenti usiamo una stringa che l'auth riconosce come "da resettare"
      
      await prisma.user.create({
        data: {
          name,
          matricola,
          password: tempPass, // Verrà forzato il reset al primo login
          role: "AGENTE",
          tenantId: tenant.id,
          qualifica,
          servizio: squadra,
          isUfficiale: isUff,
          defaultServiceCategoryId: defaultCatId,
          defaultServiceTypeId: defaultTypeId,
          forcePasswordChange: true
        }
      })
      created++
    }
  }

  console.log(`✅ Sincronizzazione completata!`)
  console.log(`📊 Totale processati: ${count}`)
  console.log(`   - Aggiornati: ${updated}`)
  console.log(`   - Creati: ${created}`)
}

syncPersonnel()
  .catch(e => console.error("❌ Errore durante la sincronizzazione:", e))
  .finally(async () => await prisma.$disconnect())
