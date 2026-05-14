const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:PLAltamuraLocal2026!@localhost:5432/postgres?schema=public"
});

async function run() {
  await client.connect();
  console.log("Connesso al database.");

  const res = await client.query("SELECT id, \"tenantId\" FROM \"User\" WHERE name ILIKE '%dibenedetto%' LIMIT 1;");
  const agent = res.rows[0];

  if (!agent) {
    console.log("Agente non trovato.");
    await client.end();
    return;
  }

  const userId = agent.id;
  const tenantId = agent.tenantId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isoDate = today.toISOString();

  console.log(`Simulazione per ${userId} in data ${isoDate}`);

  // Pulizia
  await client.query("DELETE FROM \"ClockRecord\" WHERE \"userId\" = $1 AND timestamp >= $2;", [userId, isoDate]);
  await client.query("DELETE FROM \"AgentRequest\" WHERE \"userId\" = $1 AND date >= $2;", [userId, isoDate]);

  // Inserimento
  const insertQuery = `
    INSERT INTO "AgentRequest" (id, "userId", "tenantId", code, status, date, hours, notes, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
  `;
  const requestId = "sim-" + Math.random().toString(36).substring(7);
  
  await client.query(insertQuery, [
    requestId, userId, tenantId, 'STR_EXTRA', 'PENDING', today, 2.5, 'Test simulazione oggi - Intervento Urgente'
  ]);

  console.log("✅ Richiesta simulata creata con successo!");
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
