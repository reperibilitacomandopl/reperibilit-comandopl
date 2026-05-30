const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak, LevelFormat
} = require('docx');
const fs = require('fs');

const BLUE = "1A3A6B"; const MIDBLUE = "2E5FA3"; const LIGHTBLUE = "D9E4F0";
const DARKGRAY = "444444"; const WHITE = "FFFFFF"; const CODEBG = "1E1E2E";
const CODEFG = "CDD6F4"; const GREEN = "A6E3A1"; const YELLOW = "F9E2AF";
const CYAN = "89DCEB"; const PINK = "F38BA8"; const MAUVE = "CBA6F7";
const GRAY = "F4F4F6";

const B = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS = { top: B, bottom: B, left: B, right: B };
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOBORDERS = { top: NB, bottom: NB, left: NB, right: NB };

const sp = (b = 0, a = 0) => ({ before: b, after: a });

function h1(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, spacing: sp(400, 160),
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 4 } },
    children: [new TextRun({ text: t, bold: true, size: 30, color: BLUE, font: "Arial" })]
  });
}
function h2(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, spacing: sp(280, 100),
    children: [new TextRun({ text: t, bold: true, size: 24, color: MIDBLUE, font: "Arial" })]
  });
}
function h3(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3, spacing: sp(200, 80),
    children: [new TextRun({ text: t, bold: true, size: 22, color: DARKGRAY, font: "Arial" })]
  });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: sp(60, 60), children: [new TextRun({ text, size: 20, font: "Arial", ...opts })] });
}
function bl(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 }, spacing: sp(30, 30),
    children: [new TextRun({ text, size: 20, font: "Arial" })]
  });
}
function pb() { return new Paragraph({ children: [new PageBreak()] }); }
function sp0() { return new Paragraph({ spacing: sp(80, 80), children: [new TextRun("")] }); }

function badge(text, color, textColor) {
  return new Table({
    width: { size: 1800, type: WidthType.DXA }, columnWidths: [1800],
    rows: [new TableRow({
      children: [new TableCell({
        borders: NOBORDERS, shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 120, right: 120 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, size: 17, color: textColor, font: "Arial" })]
        })]
      })]
    })]
  });
}

function infoRow(label, value, shade = false) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 2200, type: WidthType.DXA }, borders: BORDERS,
        shading: { fill: shade ? LIGHTBLUE : GRAY, type: ShadingType.CLEAR },
        margins: { top: 70, bottom: 70, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 19, color: BLUE, font: "Arial" })] })]
      }),
      new TableCell({
        width: { size: 6826, type: WidthType.DXA }, borders: BORDERS,
        margins: { top: 70, bottom: 70, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: value, size: 19, font: "Arial" })] })]
      })
    ]
  });
}

function infoTable(rows) {
  return new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: [2200, 6826],
    rows: rows.map((r, i) => infoRow(r[0], r[1], i % 2 === 0))
  });
}

// Codeblock: array di righe, ognuna {text, color}
function codeBlock(lines) {
  const cellChildren = lines.map(l =>
    new Paragraph({
      spacing: sp(0, 0),
      children: [new TextRun({
        text: l.text, size: 18, font: "Courier New",
        color: l.color || CODEFG
      })]
    })
  );
  return new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: [9026],
    rows: [new TableRow({
      children: [new TableCell({
        borders: NOBORDERS, shading: { fill: CODEBG, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 200, right: 200 },
        children: cellChildren
      })]
    })]
  });
}

function sectionCard(title, meta, children) {
  const headerRow = new TableRow({
    children: [new TableCell({
      borders: NOBORDERS, shading: { fill: BLUE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children: [
        new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 22, color: WHITE, font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: meta, size: 17, color: LIGHTBLUE, font: "Arial" })] })
      ]
    })]
  });
  const bodyRow = new TableRow({
    children: [new TableCell({
      borders: NOBORDERS, shading: { fill: GRAY, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children
    })]
  });
  return new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: [9026],
    rows: [headerRow, bodyRow]
  });
}

function label(text, color, tc) {
  return new Paragraph({
    spacing: sp(100, 60),
    children: [new TextRun({
      text: `  ${text}  `, bold: true, size: 17, color: tc || WHITE,
      highlight: undefined, font: "Arial",
      shading: { type: ShadingType.CLEAR, fill: color }
    })]
  });
}

function note(text) {
  return new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: [200, 8826],
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 200, type: WidthType.DXA }, borders: NOBORDERS,
          shading: { fill: "F9E2AF", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun("")] })]
        }),
        new TableCell({
          width: { size: 8826, type: WidthType.DXA }, borders: NOBORDERS,
          shading: { fill: "FFFBF0", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ spacing: sp(0, 0), children: [new TextRun({ text: "⚠ " + text, size: 19, font: "Arial", color: "7A4F00" })] })]
        })
      ]
    })]
  });
}

// ─────────────────────────────────────────────
// CODICE SNIPPETS
// ─────────────────────────────────────────────

const tasks = [
  {
    id: "T-002",
    title: "Microservizio Auth — JWT, RBAC, SPID",
    sprint: "Sprint 1 · 5 giorni · Dipende da T-001",
    priority: "CRITICO",
    why: "Il sistema di autenticazione è la fondamenta di sicurezza dell'intera piattaforma. Ogni richiesta API deve passare da qui. Gli errori qui hanno impatto su tutti i moduli.",
    blocks: [
      {
        label: "1. Struttura modulo NestJS",
        note: null,
        code: [
          { text: "// auth/auth.module.ts", color: "6C7086" },
          { text: "@Module({", color: CODEFG },
          { text: "  imports: [", color: CODEFG },
          { text: "    JwtModule.registerAsync({", color: CYAN },
          { text: "      useFactory: (config: ConfigService) => ({", color: CODEFG },
          { text: "        privateKey: config.get('JWT_PRIVATE_KEY'),", color: GREEN },
          { text: "        publicKey: config.get('JWT_PUBLIC_KEY'),", color: GREEN },
          { text: "        signOptions: { algorithm: 'RS256', expiresIn: '15m' },", color: GREEN },
          { text: "      }),", color: CODEFG },
          { text: "      inject: [ConfigService],", color: CODEFG },
          { text: "    }),", color: CODEFG },
          { text: "    PassportModule.register({ defaultStrategy: 'jwt' }),", color: CYAN },
          { text: "    TypeOrmModule.forFeature([Utente, RefreshToken]),", color: CYAN },
          { text: "  ],", color: CODEFG },
          { text: "  providers: [AuthService, JwtStrategy, LocalStrategy],", color: CODEFG },
          { text: "  exports: [AuthService, JwtModule],", color: CODEFG },
          { text: "})", color: CODEFG },
          { text: "export class AuthModule {}", color: CODEFG },
        ]
      },
      {
        label: "2. Login con rate limiting e 2FA",
        note: "Il rate limiting deve essere applicato PRIMA della validazione password, altrimenti si spreca DB",
        code: [
          { text: "// auth/auth.service.ts (metodo login)", color: "6C7086" },
          { text: "async login(email: string, password: string, ip: string) {", color: CODEFG },
          { text: "  // 1. Rate limiting tramite Redis", color: "6C7086" },
          { text: "  const key = `login_attempt:${ip}`;", color: YELLOW },
          { text: "  const attempts = await this.redis.incr(key);", color: CODEFG },
          { text: "  if (attempts === 1) await this.redis.expire(key, 300); // 5 min TTL", color: "6C7086" },
          { text: "  if (attempts > 10) throw new TooManyRequestsException();", color: PINK },
          { text: "", color: CODEFG },
          { text: "  // 2. Validazione credenziali", color: "6C7086" },
          { text: "  const utente = await this.utentiRepo.findOne({ where: { email } });", color: CODEFG },
          { text: "  if (!utente || !await bcrypt.compare(password, utente.passwordHash))", color: CODEFG },
          { text: "    throw new UnauthorizedException('Credenziali non valide');", color: PINK },
          { text: "", color: CODEFG },
          { text: "  // 3. Check 2FA se attivo", color: "6C7086" },
          { text: "  if (utente.twoFaAttivo && !dto.totpCode)", color: CODEFG },
          { text: "    return { requires2FA: true, tempToken: this.generateTempToken(utente.id) };", color: YELLOW },
          { text: "", color: CODEFG },
          { text: "  // 4. Genera token pair", color: "6C7086" },
          { text: "  await this.redis.del(key); // reset tentativi su successo", color: "6C7086" },
          { text: "  return this.generateTokenPair(utente);", color: GREEN },
          { text: "}", color: CODEFG },
        ]
      },
      {
        label: "3. Decorator @Roles + Guard RBAC",
        note: null,
        code: [
          { text: "// decorators/roles.decorator.ts", color: "6C7086" },
          { text: "export enum Ruolo {", color: CYAN },
          { text: "  OPERATORE = 'OPERATORE',", color: GREEN },
          { text: "  UFFICIALE = 'UFFICIALE',", color: GREEN },
          { text: "  ADMIN_ENTE = 'ADMIN_ENTE',", color: GREEN },
          { text: "  PERITO = 'PERITO',", color: GREEN },
          { text: "  SUPER_ADMIN = 'SUPER_ADMIN',", color: GREEN },
          { text: "}", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "export const Roles = (...roles: Ruolo[]) =>", color: CODEFG },
          { text: "  SetMetadata('roles', roles);", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "// guards/roles.guard.ts", color: "6C7086" },
          { text: "@Injectable()", color: MAUVE },
          { text: "export class RolesGuard implements CanActivate {", color: CODEFG },
          { text: "  canActivate(ctx: ExecutionContext): boolean {", color: CODEFG },
          { text: "    const required = this.reflector.get<Ruolo[]>('roles', ctx.getHandler());", color: CODEFG },
          { text: "    if (!required?.length) return true; // endpoint pubblico", color: "6C7086" },
          { text: "    const { user } = ctx.switchToHttp().getRequest();", color: CODEFG },
          { text: "    return required.includes(user.ruolo);", color: GREEN },
          { text: "  }", color: CODEFG },
          { text: "}", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "// Uso nel controller:", color: "6C7086" },
          { text: "@Get(':id/audit')", color: MAUVE },
          { text: "@UseGuards(JwtAuthGuard, RolesGuard)", color: MAUVE },
          { text: "@Roles(Ruolo.UFFICIALE, Ruolo.SUPER_ADMIN)", color: MAUVE },
          { text: "getAuditLog(@Param('id') id: string) { ... }", color: CODEFG },
        ]
      }
    ]
  },

  {
    id: "T-003",
    title: "Schema DB PostgreSQL/PostGIS + migrazioni",
    sprint: "Sprint 1 · 4 giorni · Dipende da T-001",
    priority: "CRITICO",
    why: "Lo schema definisce i vincoli di integrità forense di tutto il sistema. Errori nello schema sono costosi da correggere in produzione. I trigger per catena di custodia vanno qui.",
    blocks: [
      {
        label: "1. Migrazione TypeORM — tabella sinistri con PostGIS",
        note: "GEOMETRY(Point,4326) richiede PostGIS installato. Verificare con SELECT PostGIS_Version() prima della migrazione.",
        code: [
          { text: "// migrations/001_create_sinistri.ts", color: "6C7086" },
          { text: "export class CreateSinistri implements MigrationInterface {", color: CODEFG },
          { text: "  async up(runner: QueryRunner) {", color: CODEFG },
          { text: "    await runner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);", color: CYAN },
          { text: "    await runner.query(`CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"`);", color: CYAN },
          { text: "    await runner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);", color: CYAN },
          { text: "", color: CODEFG },
          { text: "    await runner.query(`", color: CODEFG },
          { text: "      CREATE TABLE sinistri (", color: YELLOW },
          { text: "        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),", color: GREEN },
          { text: "        codice_sinistro VARCHAR(30) UNIQUE NOT NULL,", color: GREEN },
          { text: "        data_ora TIMESTAMPTZ NOT NULL,", color: GREEN },
          { text: "        stato VARCHAR(30) NOT NULL DEFAULT 'BOZZA',", color: GREEN },
          { text: "        tipologia VARCHAR(50) NOT NULL,", color: GREEN },
          { text: "        gravita VARCHAR(20) NOT NULL,", color: GREEN },
          { text: "        meteo VARCHAR(30) NOT NULL,          -- UNI obbligatorio", color: "6C7086" },
          { text: "        illuminazione VARCHAR(30) NOT NULL,  -- UNI obbligatorio", color: "6C7086" },
          { text: "        fondo_stradale VARCHAR(30) NOT NULL, -- UNI obbligatorio", color: "6C7086" },
          { text: "        traffico VARCHAR(30) NOT NULL,       -- UNI obbligatorio", color: "6C7086" },
          { text: "        visibilita VARCHAR(30) NOT NULL,     -- UNI obbligatorio", color: "6C7086" },
          { text: "        geom GEOMETRY(Point, 4326) NOT NULL, -- GPS certificato", color: CYAN },
          { text: "        note TEXT,", color: GREEN },
          { text: "        ente_id UUID NOT NULL REFERENCES enti(id),", color: GREEN },
          { text: "        created_by UUID NOT NULL REFERENCES utenti(id),", color: GREEN },
          { text: "        created_at TIMESTAMPTZ NOT NULL DEFAULT now()", color: GREEN },
          { text: "      )", color: YELLOW },
          { text: "    `);", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "    // Indice spaziale GiST obbligatorio per query ST_DWithin", color: "6C7086" },
          { text: "    await runner.query(", color: CODEFG },
          { text: "      `CREATE INDEX idx_sinistri_geom ON sinistri USING GIST(geom)`", color: YELLOW },
          { text: "    );", color: CODEFG },
          { text: "  }", color: CODEFG },
          { text: "}", color: CODEFG },
        ]
      },
      {
        label: "2. Trigger PostgreSQL per catena di custodia (audit_log)",
        note: "Il trigger deve bloccare DELETE e UPDATE su audit_log a livello DB — non solo applicativo.",
        code: [
          { text: "-- trigger_audit.sql", color: "6C7086" },
          { text: "-- Funzione trigger che popola audit_log su ogni modifica", color: "6C7086" },
          { text: "CREATE OR REPLACE FUNCTION fn_audit_log()", color: YELLOW },
          { text: "RETURNS TRIGGER AS $$", color: CODEFG },
          { text: "DECLARE", color: CYAN },
          { text: "  v_prev_hash TEXT;", color: CODEFG },
          { text: "  v_payload JSONB;", color: CODEFG },
          { text: "BEGIN", color: CYAN },
          { text: "  -- Recupera hash dell'ultima riga per hash chain", color: "6C7086" },
          { text: "  SELECT hash_riga INTO v_prev_hash FROM audit_log", color: CODEFG },
          { text: "    ORDER BY created_at DESC LIMIT 1;", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  v_payload = jsonb_build_object(", color: CODEFG },
          { text: "    'tabella', TG_TABLE_NAME,", color: GREEN },
          { text: "    'operazione', TG_OP,", color: GREEN },
          { text: "    'before', to_jsonb(OLD),", color: GREEN },
          { text: "    'after', to_jsonb(NEW)", color: GREEN },
          { text: "  );", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  INSERT INTO audit_log(tabella, record_id, azione, payload,", color: CODEFG },
          { text: "    hash_precedente, hash_riga)", color: CODEFG },
          { text: "  VALUES (", color: CODEFG },
          { text: "    TG_TABLE_NAME,", color: GREEN },
          { text: "    COALESCE(NEW.id, OLD.id),", color: GREEN },
          { text: "    TG_OP,", color: GREEN },
          { text: "    v_payload,", color: GREEN },
          { text: "    v_prev_hash,", color: GREEN },
          { text: "    -- hash chain: SHA256(contenuto + hash_precedente)", color: "6C7086" },
          { text: "    encode(sha256((v_payload::text || COALESCE(v_prev_hash,''))", color: GREEN },
          { text: "      ::bytea), 'hex')", color: GREEN },
          { text: "  );", color: CODEFG },
          { text: "  RETURN NEW;", color: CODEFG },
          { text: "END; $$ LANGUAGE plpgsql;", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "-- Applica trigger su tabelle principali", color: "6C7086" },
          { text: "CREATE TRIGGER trg_audit_sinistri", color: YELLOW },
          { text: "  AFTER INSERT OR UPDATE OR DELETE ON sinistri", color: CODEFG },
          { text: "  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "-- Proteggi audit_log da modifiche dirette", color: "6C7086" },
          { text: "CREATE RULE no_update_audit AS ON UPDATE TO audit_log", color: YELLOW },
          { text: "  DO INSTEAD NOTHING;", color: CODEFG },
          { text: "CREATE RULE no_delete_audit AS ON DELETE TO audit_log", color: YELLOW },
          { text: "  DO INSTEAD NOTHING;", color: CODEFG },
        ]
      }
    ]
  },

  {
    id: "T-004",
    title: "API Incident — State Machine + Score UNI 11472",
    sprint: "Sprint 2 · 6 giorni · Dipende da T-002, T-003",
    priority: "CRITICO",
    why: "La state machine è la 'killer feature' della conformità UNI. Il workflow obbligato impedisce errori procedurali. Va implementata con rigore: ogni transizione deve essere atomica e tracciata.",
    blocks: [
      {
        label: "1. State Machine con validazioni per fase",
        note: "Usare pattern State o tabella transizioni permesse — mai if/else hardcoded per ogni transizione.",
        code: [
          { text: "// sinistri/state-machine.ts", color: "6C7086" },
          { text: "export enum StatoSinistro {", color: CYAN },
          { text: "  BOZZA = 'BOZZA',", color: GREEN },
          { text: "  SICUREZZA_OK = 'SICUREZZA_OK',", color: GREEN },
          { text: "  IN_RILIEVO = 'IN_RILIEVO',", color: GREEN },
          { text: "  FOTO_OK = 'FOTO_OK',", color: GREEN },
          { text: "  MISURE_OK = 'MISURE_OK',", color: GREEN },
          { text: "  VEICOLI_OK = 'VEICOLI_OK',", color: GREEN },
          { text: "  IN_REVISIONE = 'IN_REVISIONE',", color: GREEN },
          { text: "  FIRMATO = 'FIRMATO',", color: GREEN },
          { text: "  ARCHIVIATO = 'ARCHIVIATO',", color: GREEN },
          { text: "}", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "// Mappa: stato_corrente → [stati_successivi_permessi]", color: "6C7086" },
          { text: "const TRANSIZIONI: Record<StatoSinistro, StatoSinistro[]> = {", color: CODEFG },
          { text: "  [StatoSinistro.BOZZA]: [StatoSinistro.SICUREZZA_OK],", color: GREEN },
          { text: "  [StatoSinistro.SICUREZZA_OK]: [StatoSinistro.IN_RILIEVO],", color: GREEN },
          { text: "  [StatoSinistro.IN_RILIEVO]: [StatoSinistro.FOTO_OK],", color: GREEN },
          { text: "  [StatoSinistro.FOTO_OK]: [StatoSinistro.MISURE_OK],", color: GREEN },
          { text: "  [StatoSinistro.MISURE_OK]: [StatoSinistro.VEICOLI_OK],", color: GREEN },
          { text: "  // ... ecc", color: "6C7086" },
          { text: "};", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "// Validatori per ogni transizione", color: "6C7086" },
          { text: "const VALIDATORI: Partial<Record<StatoSinistro, (s: Sinistro) => string[]>> = {", color: CODEFG },
          { text: "  [StatoSinistro.FOTO_OK]: (s) => {", color: CODEFG },
          { text: "    const errori: string[] = [];", color: CODEFG },
          { text: "    const panoramiche = s.foto.filter(f => f.categoria === 'PANORAMICA');", color: CODEFG },
          { text: "    if (panoramiche.length < 4)", color: PINK },
          { text: "      errori.push('Servono almeno 4 foto panoramiche (UNI 11472)');", color: PINK },
          { text: "    return errori;", color: CODEFG },
          { text: "  },", color: CODEFG },
          { text: "  [StatoSinistro.MISURE_OK]: (s) => {", color: CODEFG },
          { text: "    if (s.misurazioni.length < 3)", color: PINK },
          { text: "      return ['Servono almeno 3 misurazioni metriche'];", color: PINK },
          { text: "    return [];", color: CODEFG },
          { text: "  },", color: CODEFG },
          { text: "};", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "export function validaTransizione(", color: CODEFG },
          { text: "  sinistro: Sinistro,", color: CODEFG },
          { text: "  nuovoStato: StatoSinistro,", color: CODEFG },
          { text: "  override?: { motivazione: string; ufficiale: boolean }", color: CODEFG },
          { text: "): { ok: boolean; errori: string[] } {", color: CODEFG },
          { text: "  const permessi = TRANSIZIONI[sinistro.stato] || [];", color: CODEFG },
          { text: "  if (!permessi.includes(nuovoStato))", color: PINK },
          { text: "    return { ok: false, errori: [`Transizione ${sinistro.stato}→${nuovoStato} non permessa`] };", color: PINK },
          { text: "", color: CODEFG },
          { text: "  const validatore = VALIDATORI[nuovoStato];", color: CODEFG },
          { text: "  if (!validatore) return { ok: true, errori: [] };", color: GREEN },
          { text: "", color: CODEFG },
          { text: "  const errori = validatore(sinistro);", color: CODEFG },
          { text: "  // Override ufficiale: bypassa validazione ma logga in audit", color: "6C7086" },
          { text: "  if (errori.length && override?.ufficiale)", color: CODEFG },
          { text: "    return { ok: true, errori }; // warning, non blocco", color: YELLOW },
          { text: "  return { ok: errori.length === 0, errori };", color: CODEFG },
          { text: "}", color: CODEFG },
        ]
      },
      {
        label: "2. Score completezza UNI 11472",
        note: null,
        code: [
          { text: "// sinistri/completezza.service.ts", color: "6C7086" },
          { text: "export function calcolaScoreUNI(sinistro: SinistroCCompleto): CompletezzaResult {", color: CODEFG },
          { text: "  const controlli = [", color: CODEFG },
          { text: "    {", color: CODEFG },
          { text: "      peso: 30, nome: 'campi_obbligatori_uni',", color: GREEN },
          { text: "      check: (s: SinistroCCompleto) => !!(", color: CODEFG },
          { text: "        s.meteo && s.illuminazione && s.fondoStradale &&", color: CODEFG },
          { text: "        s.traffico && s.visibilita && s.geom", color: CODEFG },
          { text: "      ),", color: CODEFG },
          { text: "    },", color: CODEFG },
          { text: "    {", color: CODEFG },
          { text: "      peso: 20, nome: 'foto_panoramiche_min4',", color: GREEN },
          { text: "      check: (s) => s.foto.filter(f => f.categoria === 'PANORAMICA').length >= 4,", color: CODEFG },
          { text: "    },", color: CODEFG },
          { text: "    {", color: CODEFG },
          { text: "      peso: 15, nome: 'veicolo_con_danni',", color: GREEN },
          { text: "      check: (s) => s.veicoli.some(v => v.danniJson?.length > 0),", color: CODEFG },
          { text: "    },", color: CODEFG },
          { text: "    {", color: CODEFG },
          { text: "      peso: 15, nome: 'misurazioni_min3',", color: GREEN },
          { text: "      check: (s) => s.misurazioni.length >= 3,", color: CODEFG },
          { text: "    },", color: CODEFG },
          { text: "    {", color: CODEFG },
          { text: "      peso: 10, nome: 'persone_presenti',", color: GREEN },
          { text: "      check: (s) => s.persone.length > 0,", color: CODEFG },
          { text: "    },", color: CODEFG },
          { text: "    {", color: CODEFG },
          { text: "      peso: 10, nome: 'checklist_sicurezza_firmata',", color: GREEN },
          { text: "      check: (s) => s.checklistFirmata === true,", color: CODEFG },
          { text: "    },", color: CODEFG },
          { text: "  ];", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  const risultati = controlli.map(c => ({", color: CODEFG },
          { text: "    ...c, superato: c.check(sinistro)", color: CODEFG },
          { text: "  }));", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  const score = risultati", color: CODEFG },
          { text: "    .filter(r => r.superato)", color: CODEFG },
          { text: "    .reduce((sum, r) => sum + r.peso, 0);", color: GREEN },
          { text: "", color: CODEFG },
          { text: "  return {", color: CODEFG },
          { text: "    score,", color: GREEN },
          { text: "    conformeUNI: score >= 70,", color: GREEN },
          { text: "    mancanti: risultati.filter(r => !r.superato).map(r => r.nome),", color: YELLOW },
          { text: "    dettaglio: risultati,", color: GREEN },
          { text: "  };", color: CODEFG },
          { text: "}", color: CODEFG },
        ]
      }
    ]
  },

  {
    id: "T-005",
    title: "Photo Forensic — Hash SHA-256 + Metadata + Watermark",
    sprint: "Sprint 2 · 5 giorni · Dipende da T-003",
    priority: "CRITICO",
    why: "L'integrità forense delle foto dipende da questo modulo. L'hash deve essere calcolato lato server tramite stream (non caricare tutto in RAM) e il watermark deve essere invisibile ma verificabile.",
    blocks: [
      {
        label: "1. Upload forense con hash SHA-256 via stream",
        note: "Non usare multer in-memory per file grandi. Usare stream direttamente su MinIO e calcolare hash in parallelo.",
        code: [
          { text: "// foto/foto-forensic.service.ts", color: "6C7086" },
          { text: "async uploadForense(file: Express.Multer.File, dto: UploadFotoDto) {", color: CODEFG },
          { text: "  const fotoId = uuid();", color: CODEFG },
          { text: "  const storagePath = `sinistri/${dto.sinistrId}/foto/${fotoId}.jpg`;", color: GREEN },
          { text: "", color: CODEFG },
          { text: "  // 1. Estrai metadati EXIF (gps, timestamp, orientamento)", color: "6C7086" },
          { text: "  const exif = await exifr.parse(file.buffer, {", color: CODEFG },
          { text: "    gps: true, ifd0: true, exif: true, pick: [", color: CODEFG },
          { text: "      'GPSLatitude','GPSLongitude','DateTimeOriginal',", color: GREEN },
          { text: "      'GPSImgDirection','Make','Model'", color: GREEN },
          { text: "    ]", color: CODEFG },
          { text: "  });", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // 2. Aggiungi watermark invisibile con ID operatore", color: "6C7086" },
          { text: "  const watermarked = await sharp(file.buffer)", color: CYAN },
          { text: "    .composite([{", color: CODEFG },
          { text: "      input: Buffer.from(", color: CODEFG },
          { text: "        `<svg><text opacity='0.02'>${dto.operatoreId}|${Date.now()}</text></svg>`", color: YELLOW },
          { text: "      ),", color: CODEFG },
          { text: "      gravity: 'center'", color: CODEFG },
          { text: "    }])", color: CODEFG },
          { text: "    .jpeg({ quality: 95 })", color: CODEFG },
          { text: "    .toBuffer();", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // 3. Calcola SHA-256 (stream-based, non in memoria)", color: "6C7086" },
          { text: "  const hashSha256 = crypto", color: CYAN },
          { text: "    .createHash('sha256')", color: CODEFG },
          { text: "    .update(watermarked)", color: CODEFG },
          { text: "    .digest('hex');", color: GREEN },
          { text: "", color: CODEFG },
          { text: "  // 4. Upload su MinIO/S3", color: "6C7086" },
          { text: "  await this.minio.putObject(", color: CYAN },
          { text: "    'sinistro-pl-foto', storagePath,", color: CODEFG },
          { text: "    watermarked,", color: CODEFG },
          { text: "    { 'Content-Type': 'image/jpeg', 'x-amz-meta-hash': hashSha256 }", color: GREEN },
          { text: "  );", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // 5. Salva in DB con tutti i metadati forensi", color: "6C7086" },
          { text: "  const foto = this.fotoRepo.create({", color: CODEFG },
          { text: "    id: fotoId, sinistrId: dto.sinistrId,", color: GREEN },
          { text: "    storagePath, hashSha256,", color: GREEN },
          { text: "    gps: exif?.GPSLatitude ?", color: CODEFG },
          { text: "      `POINT(${exif.GPSLongitude} ${exif.GPSLatitude})` : null,", color: CODEFG },
          { text: "    timestamp: exif?.DateTimeOriginal || new Date(),", color: GREEN },
          { text: "    orientamentoBussola: exif?.GPSImgDirection,", color: GREEN },
          { text: "    deviceId: `${exif?.Make} ${exif?.Model}`,", color: GREEN },
          { text: "    operatoreId: dto.operatoreId,", color: GREEN },
          { text: "    dimensioneBytes: watermarked.length,", color: GREEN },
          { text: "  });", color: CODEFG },
          { text: "  return this.fotoRepo.save(foto);", color: CODEFG },
          { text: "}", color: CODEFG },
        ]
      },
      {
        label: "2. Endpoint verifica integrità forense",
        note: null,
        code: [
          { text: "// foto/foto.controller.ts", color: "6C7086" },
          { text: "async verificaIntegrita(id: string): Promise<VerificaResult> {", color: CODEFG },
          { text: "  const foto = await this.fotoRepo.findOneOrFail({ where: { id } });", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // Scarica file da storage e ricalcola hash", color: "6C7086" },
          { text: "  const stream = await this.minio.getObject('sinistro-pl-foto', foto.storagePath);", color: CYAN },
          { text: "  const hash = crypto.createHash('sha256');", color: CYAN },
          { text: "", color: CODEFG },
          { text: "  await new Promise((resolve, reject) => {", color: CODEFG },
          { text: "    stream.on('data', chunk => hash.update(chunk));", color: CODEFG },
          { text: "    stream.on('end', resolve);", color: GREEN },
          { text: "    stream.on('error', reject);", color: PINK },
          { text: "  });", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  const hashCalcolato = hash.digest('hex');", color: CODEFG },
          { text: "  const integra = hashCalcolato === foto.hashSha256;", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // Logga accesso in audit_log indipendentemente dall'esito", color: "6C7086" },
          { text: "  await this.auditService.log({", color: CODEFG },
          { text: "    azione: 'VERIFICA_INTEGRITA_FOTO',", color: GREEN },
          { text: "    recordId: id, payload: { integra, hashCalcolato })", color: GREEN },
          { text: "  });", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  return {", color: CODEFG },
          { text: "    integra,", color: GREEN },
          { text: "    hashAtteso: foto.hashSha256,", color: GREEN },
          { text: "    hashCalcolato,", color: GREEN },
          { text: "    timestamp: new Date().toISOString(),", color: GREEN },
          { text: "  };", color: CODEFG },
          { text: "}", color: CODEFG },
        ]
      }
    ]
  },

  {
    id: "T-007",
    title: "Generazione verbale PDF/A art. 354 cpp",
    sprint: "Sprint 3 · 5 giorni · Dipende da T-004, T-005",
    priority: "CRITICO",
    why: "Il verbale è l'output legale finale. Puppeteer offre la massima qualità tipografica. La validazione PDF/A-1b è obbligatoria prima del rilascio — usare veraPDF in CI.",
    blocks: [
      {
        label: "1. Generatore Puppeteer con template Handlebars",
        note: "Puppeteer deve girare in un container con Chrome installato. In Docker usare l'immagine puppeteer/puppeteer o browserless/chrome.",
        code: [
          { text: "// verbali/pdf-generator.service.ts", color: "6C7086" },
          { text: "async generaVerbale(sinistrId: string, tipo: TipoVerbale): Promise<Buffer> {", color: CODEFG },
          { text: "  const sinistro = await this.sinistriService.getCompleto(sinistrId);", color: CODEFG },
          { text: "  if (sinistro.stato !== StatoSinistro.IN_REVISIONE &&", color: PINK },
          { text: "      sinistro.stato !== StatoSinistro.FIRMATO)", color: PINK },
          { text: "    throw new BadRequestException('Stato sinistro non consente generazione');", color: PINK },
          { text: "", color: CODEFG },
          { text: "  // 1. Prepara dati per il template", color: "6C7086" },
          { text: "  const urlFirmate = await Promise.all(", color: CODEFG },
          { text: "    sinistro.foto.slice(0, 48).map(f =>  // max 48 foto nel verbale", color: "6C7086" },
          { text: "      this.minio.presignedGetObject('sinistro-pl-foto', f.storagePath, 300)", color: CODEFG },
          { text: "    )", color: CODEFG },
          { text: "  );", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  const qrCode = await QRCode.toDataURL(", color: CYAN },
          { text: "    `${process.env.BASE_URL}/verbali/${sinistrId}/verifica`", color: YELLOW },
          { text: "  );", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // 2. Rendering HTML dal template", color: "6C7086" },
          { text: "  const templateSrc = fs.readFileSync(", color: CODEFG },
          { text: "    path.join(__dirname, 'templates', `${tipo}.hbs`), 'utf-8'", color: CODEFG },
          { text: "  );", color: CODEFG },
          { text: "  const template = Handlebars.compile(templateSrc);", color: CYAN },
          { text: "  const html = template({ ...sinistro, urlFirmate, qrCode });", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // 3. Generazione PDF con Puppeteer", color: "6C7086" },
          { text: "  const browser = await puppeteer.launch({", color: CYAN },
          { text: "    args: ['--no-sandbox', '--disable-setuid-sandbox'],", color: CODEFG },
          { text: "    executablePath: process.env.CHROME_PATH,", color: CODEFG },
          { text: "  });", color: CODEFG },
          { text: "  const page = await browser.newPage();", color: CODEFG },
          { text: "  await page.setContent(html, { waitUntil: 'networkidle0' });", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  const pdfBuffer = await page.pdf({", color: CODEFG },
          { text: "    format: 'A4',", color: GREEN },
          { text: "    printBackground: true,", color: GREEN },
          { text: "    margin: { top: '2cm', right: '2cm', bottom: '2.5cm', left: '2cm' },", color: GREEN },
          { text: "    // PDF/A-1b: aggiunto post-processing con ghostscript", color: "6C7086" },
          { text: "  });", color: CODEFG },
          { text: "  await browser.close();", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // 4. Converti in PDF/A-1b con ghostscript", color: "6C7086" },
          { text: "  const pdfA = await this.convertToPdfA(pdfBuffer);", color: CYAN },
          { text: "", color: CODEFG },
          { text: "  // 5. Salva hash in DB", color: "6C7086" },
          { text: "  const hashDoc = crypto.createHash('sha256').update(pdfA).digest('hex');", color: CODEFG },
          { text: "  await this.verbaliRepo.save({ sinistrId, tipo, hashSha256: hashDoc, pdfA });", color: GREEN },
          { text: "  return pdfA;", color: GREEN },
          { text: "}", color: CODEFG },
        ]
      }
    ]
  },

  {
    id: "T-015",
    title: "Offline-first Flutter — Isar, coda sync, conflict resolution",
    sprint: "Sprint 2–3 · 5 giorni · Parallelo a T-008",
    priority: "CRITICO",
    why: "Questo è il task tecnicamente più complesso del mobile. La gestione dei conflitti e il retry esponenziale vanno testati in condizioni di rete degradata. Isar è preferito a Hive per le query tipizzate.",
    blocks: [
      {
        label: "1. Schema Isar e coda operazioni pendenti",
        note: "Isar usa generazione di codice (build_runner). Ricordarsi di runnare flutter pub run build_runner build dopo modifiche agli schema.",
        code: [
          { text: "// models/operazione_pendente.dart", color: "6C7086" },
          { text: "import 'package:isar/isar.dart';", color: CYAN },
          { text: "part 'operazione_pendente.g.dart';", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "@collection", color: MAUVE },
          { text: "class OperazionePendente {", color: CODEFG },
          { text: "  Id id = Isar.autoIncrement;", color: GREEN },
          { text: "  late String tipo;        // 'CREATE_SINISTRO', 'UPLOAD_FOTO', ecc.", color: GREEN },
          { text: "  late String payload;     // JSON serializzato", color: GREEN },
          { text: "  late DateTime createdAt;", color: GREEN },
          { text: "  int tentativi = 0;", color: GREEN },
          { text: "  DateTime? prossimoTentativo;", color: GREEN },
          { text: "  bool completata = false;", color: GREEN },
          { text: "  String? erroreUltimo;", color: GREEN },
          { text: "}", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "// services/sync_service.dart", color: "6C7086" },
          { text: "class SyncService {", color: CODEFG },
          { text: "  final Isar _isar;", color: CODEFG },
          { text: "  final ApiClient _api;", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // Aggiunge operazione alla coda", color: "6C7086" },
          { text: "  Future<void> accoda(String tipo, Map<String, dynamic> payload) async {", color: CODEFG },
          { text: "    await _isar.writeTxn(() async {", color: CYAN },
          { text: "      await _isar.operazionePendentas.put(OperazionePendente()", color: CODEFG },
          { text: "        ..tipo = tipo", color: GREEN },
          { text: "        ..payload = jsonEncode(payload)", color: GREEN },
          { text: "        ..createdAt = DateTime.now()", color: GREEN },
          { text: "        ..prossimoTentativo = DateTime.now()", color: GREEN },
          { text: "      );", color: CODEFG },
          { text: "    });", color: CODEFG },
          { text: "  }", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  // Worker di sync con retry esponenziale", color: "6C7086" },
          { text: "  Future<void> processaCoda() async {", color: CODEFG },
          { text: "    final pendenti = await _isar.operazionePendentas", color: CODEFG },
          { text: "      .filter()", color: CODEFG },
          { text: "      .completataEqualTo(false)", color: CODEFG },
          { text: "      .prossimoTentativoLessThan(DateTime.now())", color: CODEFG },
          { text: "      .sortByCreatedAt()", color: CODEFG },
          { text: "      .findAll();", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "    for (final op in pendenti) {", color: CODEFG },
          { text: "      try {", color: CODEFG },
          { text: "        await _eseguiOperazione(op);", color: GREEN },
          { text: "        await _isar.writeTxn(() async {", color: CYAN },
          { text: "          op.completata = true;", color: GREEN },
          { text: "          await _isar.operazionePendentas.put(op);", color: CODEFG },
          { text: "        });", color: CODEFG },
          { text: "      } catch (e) {", color: PINK },
          { text: "        // Retry esponenziale: 5s, 30s, 5min, poi abbandona", color: "6C7086" },
          { text: "        final delay = [5, 30, 300][op.tentativi.clamp(0, 2)];", color: YELLOW },
          { text: "        await _isar.writeTxn(() async {", color: CODEFG },
          { text: "          op.tentativi++;", color: PINK },
          { text: "          op.prossimoTentativo = DateTime.now().add(Duration(seconds: delay));", color: CODEFG },
          { text: "          op.erroreUltimo = e.toString();", color: CODEFG },
          { text: "          if (op.tentativi >= 3) op.completata = true; // abbandona", color: PINK },
          { text: "          await _isar.operazionePendentas.put(op);", color: CODEFG },
          { text: "        });", color: CODEFG },
          { text: "      }", color: CODEFG },
          { text: "    }", color: CODEFG },
          { text: "  }", color: CODEFG },
          { text: "}", color: CODEFG },
        ]
      },
      {
        label: "2. Connectivity listener che triggerizza la sync",
        note: null,
        code: [
          { text: "// providers/connectivity_provider.dart (Riverpod)", color: "6C7086" },
          { text: "final connectivityProvider = StreamProvider<bool>((ref) {", color: CODEFG },
          { text: "  return Connectivity().onConnectivityChanged.map((result) =>", color: CODEFG },
          { text: "    result != ConnectivityResult.none", color: GREEN },
          { text: "  );", color: CODEFG },
          { text: "});", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "// Nel widget root o in un AppLifecycleObserver:", color: "6C7086" },
          { text: "ref.listen(connectivityProvider, (prev, next) {", color: CODEFG },
          { text: "  next.whenData((isOnline) {", color: CODEFG },
          { text: "    if (isOnline && prev?.value == false) {", color: CODEFG },
          { text: "      // Connessione appena ripristinata → avvia sync", color: "6C7086" },
          { text: "      ref.read(syncServiceProvider).processaCoda();", color: GREEN },
          { text: "    }", color: CODEFG },
          { text: "  });", color: CODEFG },
          { text: "});", color: CODEFG },
        ]
      }
    ]
  },

  {
    id: "T-016",
    title: "Catena di custodia — verifica hash chain lato API",
    sprint: "Sprint 2 · 3 giorni · Dipende da T-003",
    priority: "CRITICO",
    why: "La verifica della catena di custodia è l'elemento che rende il fascicolo legalmente inattaccabile. L'API deve rilevare qualsiasi manomissione, anche di un singolo carattere in un record intermedio.",
    blocks: [
      {
        label: "Verifica integrità catena lato NestJS",
        note: "La verifica deve essere O(n) sul numero di record — non fare query separate per ogni riga.",
        code: [
          { text: "// audit/audit.service.ts", color: "6C7086" },
          { text: "async verificaCatena(sinistrId: string): Promise<CatenaResult> {", color: CODEFG },
          { text: "  const records = await this.auditRepo.find({", color: CODEFG },
          { text: "    where: { recordId: sinistrId },", color: GREEN },
          { text: "    order: { createdAt: 'ASC' },", color: GREEN },
          { text: "  });", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  let hashPrecedente: string | null = null;", color: CODEFG },
          { text: "  let rotturaAllaRiga: number | null = null;", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  for (let i = 0; i < records.length; i++) {", color: CODEFG },
          { text: "    const r = records[i];", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "    // Ricalcola hash come fa il trigger PostgreSQL", color: "6C7086" },
          { text: "    const contenuto = JSON.stringify(r.payload) + (hashPrecedente ?? '');", color: CODEFG },
          { text: "    const hashCalcolato = crypto", color: CYAN },
          { text: "      .createHash('sha256')", color: CODEFG },
          { text: "      .update(contenuto)", color: CODEFG },
          { text: "      .digest('hex');", color: GREEN },
          { text: "", color: CODEFG },
          { text: "    if (hashCalcolato !== r.hashRiga) {", color: PINK },
          { text: "      rotturaAllaRiga = i;", color: PINK },
          { text: "      break; // Inutile verificare dopo la rottura", color: "6C7086" },
          { text: "    }", color: CODEFG },
          { text: "    hashPrecedente = r.hashRiga;", color: CODEFG },
          { text: "  }", color: CODEFG },
          { text: "", color: CODEFG },
          { text: "  return {", color: CODEFG },
          { text: "    integra: rotturaAllaRiga === null,", color: GREEN },
          { text: "    totalRecord: records.length,", color: GREEN },
          { text: "    rotturaAllaRiga,", color: rotturaAllaRiga => PINK },
          { text: "    rotturaAllaRiga,", color: PINK },
          { text: "    verificataAl: new Date().toISOString(),", color: GREEN },
          { text: "  };", color: CODEFG },
          { text: "}", color: CODEFG },
        ]
      }
    ]
  }
];

// ─────────────────────────────────────────────
// BUILD DOCUMENT
// ─────────────────────────────────────────────
const children = [];

// Frontespizio
children.push(sp0(), sp0(), sp0());
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: sp(0, 80),
  children: [new TextRun({ text: "SINISTRA PL", bold: true, size: 56, color: BLUE, font: "Arial" })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: sp(0, 40),
  children: [new TextRun({ text: "Spunti di codice — Task critici Fase 1 MVP", size: 26, color: DARKGRAY, font: "Arial" })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: sp(0, 160),
  children: [new TextRun({ text: "Documento tecnico per sviluppatori", size: 22, color: DARKGRAY, font: "Arial" })]
}));

children.push(new Table({
  width: { size: 9026, type: WidthType.DXA }, columnWidths: [9026],
  rows: [new TableRow({
    children: [new TableCell({
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE }, left: NB, right: NB },
      shading: { fill: LIGHTBLUE, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({ children: [new TextRun({ text: "Stack: NestJS · Flutter · PostgreSQL/PostGIS · MinIO · Redis · Puppeteer · Isar", size: 19, font: "Arial", color: MIDBLUE })] }),
        new Paragraph({ children: [new TextRun({ text: "Norma: UNI 11472:2019 · D.Lgs 82/2005 · GDPR 679/2016", size: 19, font: "Arial", color: MIDBLUE })] }),
      ]
    })]
  })]
}));

children.push(sp0(), sp0());
children.push(p("Questo documento raccoglie gli spunti di codice per i task più critici e complessi della Fase 1 MVP. Ogni sezione include: contesto tecnico, snippet pronti all'uso con commenti esplicativi, e note sulle insidie principali. Il codice è indicativo e va adattato al progetto specifico.", { color: DARKGRAY }));
children.push(sp0());

children.push(infoTable([
  ["Task critici", "T-002 Auth · T-003 DB+Trigger · T-004 StateMachine · T-005 Photo · T-007 PDF · T-015 Offline · T-016 Audit"],
  ["Linguaggi", "TypeScript (NestJS backend) · Dart (Flutter mobile) · SQL (PostgreSQL triggers)"],
  ["Formato snippet", "Codice colorato su sfondo scuro — copia direttamente, adatta al tuo progetto"],
  ["Versione", "1.0 · 2025"],
]));

children.push(pb());

// Task sections
for (const task of tasks) {
  children.push(new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: [9026],
    rows: [new TableRow({
      children: [new TableCell({
        borders: NOBORDERS,
        shading: { fill: BLUE, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: task.id + "  ", bold: true, size: 18, color: LIGHTBLUE, font: "Courier New" }),
              new TextRun({ text: task.title, bold: true, size: 24, color: WHITE, font: "Arial" })
            ]
          }),
          new Paragraph({ children: [new TextRun({ text: task.sprint, size: 17, color: "9BBFE0", font: "Arial" })] }),
        ]
      })]
    })]
  }));

  children.push(new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: [9026],
    rows: [new TableRow({
      children: [new TableCell({
        borders: { top: NB, bottom: NB, left: { style: BorderStyle.SINGLE, size: 12, color: MIDBLUE }, right: NB },
        shading: { fill: "F0F4FA", type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [new Paragraph({ spacing: sp(0, 0), children: [new TextRun({ text: "Perché è critico: " + task.why, size: 19, font: "Arial", color: DARKGRAY, italics: true })] })]
      })]
    })]
  }));

  children.push(sp0());

  for (const block of task.blocks) {
    children.push(new Paragraph({ spacing: sp(120, 60), children: [new TextRun({ text: block.label, bold: true, size: 20, color: MIDBLUE, font: "Arial" })] }));
    if (block.note) children.push(note(block.note));
    children.push(codeBlock(block.code));
    children.push(sp0());
  }

  children.push(pb());
}

// Appendice note generali
children.push(h1("Note generali per lo sviluppatore"));
children.push(sp0());

children.push(h2("Variabili d'ambiente necessarie"));
children.push(codeBlock([
  { text: "# .env.example (NON committare .env con valori reali)", color: "6C7086" },
  { text: "# Auth", color: "6C7086" },
  { text: "JWT_PRIVATE_KEY=<RS256 private key PEM>", color: GREEN },
  { text: "JWT_PUBLIC_KEY=<RS256 public key PEM>", color: GREEN },
  { text: "", color: CODEFG },
  { text: "# Database", color: "6C7086" },
  { text: "DATABASE_URL=postgresql://user:pass@localhost:5432/sinistrapl", color: GREEN },
  { text: "", color: CODEFG },
  { text: "# Redis", color: "6C7086" },
  { text: "REDIS_URL=redis://localhost:6379", color: GREEN },
  { text: "", color: CODEFG },
  { text: "# MinIO/S3", color: "6C7086" },
  { text: "MINIO_ENDPOINT=localhost", color: GREEN },
  { text: "MINIO_PORT=9000", color: GREEN },
  { text: "MINIO_ACCESS_KEY=<key>", color: GREEN },
  { text: "MINIO_SECRET_KEY=<secret>", color: GREEN },
  { text: "", color: CODEFG },
  { text: "# PDF", color: "6C7086" },
  { text: "CHROME_PATH=/usr/bin/google-chrome", color: GREEN },
  { text: "BASE_URL=https://sinistrapl.comune.example.it", color: GREEN },
]));

children.push(sp0());
children.push(h2("Comandi utili sviluppo"));
children.push(codeBlock([
  { text: "# Avvio stack locale completo", color: "6C7086" },
  { text: "docker compose up -d", color: CYAN },
  { text: "", color: CODEFG },
  { text: "# Backend dev con hot reload", color: "6C7086" },
  { text: "npm run start:dev", color: CYAN },
  { text: "", color: CODEFG },
  { text: "# Migrazioni DB", color: "6C7086" },
  { text: "npm run migration:generate -- src/migrations/NomeMigrazione", color: CYAN },
  { text: "npm run migration:run", color: CYAN },
  { text: "", color: CODEFG },
  { text: "# Test", color: "6C7086" },
  { text: "npm run test          # unit test", color: CYAN },
  { text: "npm run test:e2e      # integration test (richiede DB su)", color: CYAN },
  { text: "npm run test:cov      # coverage report", color: CYAN },
  { text: "", color: CODEFG },
  { text: "# Flutter mobile", color: "6C7086" },
  { text: "flutter pub run build_runner build --delete-conflicting-outputs  # genera Isar schemas", color: CYAN },
  { text: "flutter test", color: CYAN },
  { text: "flutter run --flavor staging", color: CYAN },
]));

children.push(sp0());
children.push(note("Tutti gli snippet sono scritti per TypeScript strict mode. Attivare strict: true in tsconfig.json. Per Dart, usare dart analyze prima di ogni commit."));

// ─────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets", levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: MIDBLUE },
        paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: DARKGRAY },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
            spacing: { before: 0, after: 120 },
            children: [
              new TextRun({ text: "SINISTRA PL  ·  Spunti di codice Fase 1 MVP", size: 17, color: MIDBLUE, font: "Arial" }),
              new TextRun({ text: "\tDocumento tecnico sviluppatori  ·  UNI 11472:2019", size: 17, color: DARKGRAY, font: "Arial" }),
            ],
            tabStops: [{ type: "right", position: 8748 }]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: LIGHTBLUE, space: 4 } },
            spacing: { before: 80, after: 0 },
            children: [new TextRun({ text: "Uso interno — progetto SINISTRA PL  ·  2025", size: 16, color: DARKGRAY, font: "Arial" })],
          })
        ]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/mnt/user-data/outputs/SINISTRA_PL_Spunti_Codice_Fase1.docx", buffer);
  console.log("OK");
});