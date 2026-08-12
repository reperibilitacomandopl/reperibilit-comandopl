-- ============================================================
-- MIGRAZIONE: Modulo Ordinanze Viabilità
-- Da eseguire sul server Oracle PostgreSQL
-- Comando: psql -U postgres -d postgres -f ordinanze_migration.sql
-- ============================================================

-- Tabella: OrdinanzaRequest
CREATE TABLE IF NOT EXISTS "OrdinanzaRequest" (
    "id"              TEXT NOT NULL,
    "tenantId"        TEXT NOT NULL,
    "createdById"     TEXT NOT NULL,
    "tipoOrdinanza"   TEXT NOT NULL,
    "testoRichiesta"  TEXT NOT NULL,
    "fileUrl"         TEXT,
    "richiedente"     TEXT,
    "via"             TEXT,
    "civico"          TEXT,
    "dataInizio"      TIMESTAMP(3),
    "dataFine"        TIMESTAMP(3),
    "oraDalle"        TEXT,
    "oraAlle"         TEXT,
    "motivazione"     TEXT,
    "analisiAi"       JSONB,
    "verifiche"       JSONB,
    "stato"           TEXT NOT NULL DEFAULT 'NUOVA',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdinanzaRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrdinanzaRequest_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "OrdinanzaRequest_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "OrdinanzaRequest_tenantId_idx"    ON "OrdinanzaRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "OrdinanzaRequest_createdById_idx" ON "OrdinanzaRequest"("createdById");
CREATE INDEX IF NOT EXISTS "OrdinanzaRequest_stato_idx"       ON "OrdinanzaRequest"("stato");
CREATE INDEX IF NOT EXISTS "OrdinanzaRequest_tipo_idx"        ON "OrdinanzaRequest"("tipoOrdinanza");

-- Tabella: OrdinanzaBozza
CREATE TABLE IF NOT EXISTS "OrdinanzaBozza" (
    "id"               TEXT NOT NULL,
    "requestId"        TEXT NOT NULL,
    "tenantId"         TEXT NOT NULL,
    "numeroProtocollo" TEXT,
    "anno"             INTEGER,
    "progressivo"      INTEGER,
    "testo"            TEXT NOT NULL,
    "testoModificato"  TEXT,
    "documentiUsati"   JSONB,
    "stato"            TEXT NOT NULL DEFAULT 'BOZZA',
    "approvataDaId"    TEXT,
    "approvataAt"      TIMESTAMP(3),
    "noteOperatore"    TEXT,
    "fileDocxUrl"      TEXT,
    "filePdfUrl"       TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdinanzaBozza_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrdinanzaBozza_requestId_fkey"
        FOREIGN KEY ("requestId") REFERENCES "OrdinanzaRequest"("id") ON DELETE CASCADE,
    CONSTRAINT "OrdinanzaBozza_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "OrdinanzaBozza_approvataDaId_fkey"
        FOREIGN KEY ("approvataDaId") REFERENCES "User"("id"),
    CONSTRAINT "OrdinanzaBozza_tenantId_anno_progressivo_key"
        UNIQUE ("tenantId", "anno", "progressivo")
);

CREATE INDEX IF NOT EXISTS "OrdinanzaBozza_tenantId_idx"   ON "OrdinanzaBozza"("tenantId");
CREATE INDEX IF NOT EXISTS "OrdinanzaBozza_requestId_idx"  ON "OrdinanzaBozza"("requestId");
CREATE INDEX IF NOT EXISTS "OrdinanzaBozza_stato_idx"      ON "OrdinanzaBozza"("stato");

-- Tabella: OrdinanzaTemplate
CREATE TABLE IF NOT EXISTS "OrdinanzaTemplate" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "nome"        TEXT NOT NULL,
    "tipo"        TEXT NOT NULL,
    "descrizione" TEXT,
    "contenuto"   TEXT NOT NULL,
    "fileUrl"     TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
    "isDefault"   BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdinanzaTemplate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrdinanzaTemplate_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrdinanzaTemplate_tenantId_idx" ON "OrdinanzaTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "OrdinanzaTemplate_tipo_idx"     ON "OrdinanzaTemplate"("tipo");

-- Funzione trigger per aggiornare updatedAt automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ordinanza_request_updated_at
    BEFORE UPDATE ON "OrdinanzaRequest"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordinanza_bozza_updated_at
    BEFORE UPDATE ON "OrdinanzaBozza"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordinanza_template_updated_at
    BEFORE UPDATE ON "OrdinanzaTemplate"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
