-- Pulizia dati odierni
DELETE FROM "ClockRecord" WHERE "userId" IN (SELECT id FROM "User" WHERE name ILIKE '%dibenedetto%') AND timestamp >= CURRENT_DATE;
DELETE FROM "AgentRequest" WHERE "userId" IN (SELECT id FROM "User" WHERE name ILIKE '%dibenedetto%') AND date >= CURRENT_DATE;

-- Inserimento richiesta fittizia
INSERT INTO "AgentRequest" (id, "userId", "tenantId", code, status, date, hours, notes, "createdAt", "updatedAt")
SELECT 
    'sim-' || substr(md5(random()::text), 1, 8), 
    id, 
    "tenantId", 
    'STR_EXTRA', 
    'PENDING', 
    CURRENT_DATE, 
    2.5, 
    'Test simulazione oggi - Intervento Urgente per rilievo sinistro', 
    NOW(), 
    NOW()
FROM "User" 
WHERE name ILIKE '%dibenedetto%' 
LIMIT 1;
