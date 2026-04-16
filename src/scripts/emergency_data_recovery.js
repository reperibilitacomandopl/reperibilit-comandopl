const { PrismaClient } = require("@prisma/client")
const fs = require("fs")
const path = require("path")

const prisma = new PrismaClient()

async function main() {
  console.log("=== INIZIO RECUPERO DATI EMERGENZA ===")

  // 1. Creazione Tenant Altamura
  const tenant = await prisma.tenant.upsert({
    where: { slug: "altamura" },
    update: {},
    create: {
      name: "Comune di Altamura",
      slug: "altamura",
      lat: 40.8268755,
      lng: 16.53325,
      clockInRadius: 200,
      planType: "TRIAL",
      isActive: true
    }
  })
  console.log(`Tenant 'altamura' pronto (ID: ${tenant.id})`)

  // 2. Lettura SQL
  const sqlPath = path.join(__dirname, "../../prisma/data_migration.sql")
  const sqlContent = fs.readFileSync(sqlPath, "utf8")
  
  // Dividiamo per righe e puliamo
  const lines = sqlContent.split("\n")
  
  let userCount = 0
  let shiftCount = 0
  let settingsCount = 0

  for (let line of lines) {
    line = line.trim()
    if (!line || line.startsWith("--") || line.startsWith("BEGIN") || line.startsWith("COMMIT") || line.startsWith("SET ")) continue

    try {
      if (line.startsWith("INSERT INTO \"User\"")) {
        // Modifichiamo l'insert per includere tenantId
        // Formato originale: INSERT INTO "User" ("id", "matricola", ...) VALUES ('...', '...', ...)
        const modifiedLine = line
          .replace("(\"id\",", "(\"id\", \"tenantId\",")
          .replace("VALUES (", `VALUES ('${tenant.id}', `) 
          // Aspetta, il replace sopra è sbagliato se id è il primo valore.
          // Meglio essere precisi:
          const valuesIndex = line.indexOf("VALUES (") + 8
          const newValues = `'${tenant.id}', ` + line.substring(valuesIndex)
          const newColumns = line.substring(0, line.indexOf("VALUES (")).replace("(\"id\"", "(\"tenantId\", \"id\"")
          
          const finalLine = newColumns + "VALUES (" + newValues
          
        await prisma.$executeRawUnsafe(finalLine)
        userCount++
      } 
      else if (line.startsWith("INSERT INTO \"Shift\"")) {
        const valuesIndex = line.indexOf("VALUES (") + 8
        const finalLine = line.substring(0, line.indexOf("VALUES (")).replace("(\"id\"", "(\"tenantId\", \"id\"") + 
                          "VALUES (" + `'${tenant.id}', ` + line.substring(valuesIndex)
        await prisma.$executeRawUnsafe(finalLine)
        shiftCount++
      }
      else if (line.startsWith("INSERT INTO \"GlobalSettings\"")) {
         // GlobalSettings non ha tenantId nell'insert del backup ma lo ha nel nuovo schema
         const valuesIndex = line.indexOf("VALUES (") + 8
         const finalLine = line.substring(0, line.indexOf("VALUES (")).replace("(\"id\"", "(\"tenantId\", \"id\"") + 
                           "VALUES (" + `'${tenant.id}', ` + line.substring(valuesIndex)
         await prisma.$executeRawUnsafe(finalLine)
         settingsCount++
      }
      else if (line.startsWith("INSERT INTO \"MonthStatus\"")) {
        const valuesIndex = line.indexOf("VALUES (") + 8
        const finalLine = line.substring(0, line.indexOf("VALUES (")).replace("(\"id\"", "(\"tenantId\", \"id\"") + 
                          "VALUES (" + `'${tenant.id}', ` + line.substring(valuesIndex)
        await prisma.$executeRawUnsafe(finalLine)
      }
    } catch (e) {
      // console.error(`Errore caricamento riga: ${line.substring(0, 50)}... -> ${e.message}`)
    }
  }

  console.log(`Ripristino completato:`)
  console.log(`- Utenti: ${userCount}`)
  console.log(`- Turni: ${shiftCount}`)
  console.log(`- Impostazioni: ${settingsCount}`)
  console.log("=== FINE RECUPERO DATI ===")
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
