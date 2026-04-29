import { prisma } from "./src/lib/prisma";

async function test() {
  try {
    console.log("Tentativo di connessione al DB con client esteso...");
    const count = await prisma.user.count();
    console.log("Connessione riuscita! Utenti trovati:", count);
    process.exit(0);
  } catch (err) {
    console.error("ERRORE CRITICO PRISMA:", err);
    process.exit(1);
  }
}

test();
