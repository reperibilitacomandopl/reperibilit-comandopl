-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "matricola" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AGENTE',
    "isUfficiale" BOOLEAN NOT NULL DEFAULT false,
    "qualifica" TEXT DEFAULT 'Agente di P.L.',
    "gradoLivello" INTEGER NOT NULL DEFAULT 13,
    "massimale" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REP 22-07',
    "repType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "minUfficiali" INTEGER NOT NULL DEFAULT 1,
    "usaProporzionale" BOOLEAN NOT NULL DEFAULT true,
    "annoCorrente" INTEGER NOT NULL DEFAULT 2026,
    "meseCorrente" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthStatus" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MonthStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hours" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PecSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "host" TEXT NOT NULL DEFAULT '',
    "port" TEXT NOT NULL DEFAULT '465',
    "user" TEXT NOT NULL DEFAULT '',
    "pass" TEXT NOT NULL DEFAULT '',
    "fromAddr" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PecSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_matricola_key" ON "User"("matricola");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Absence_userId_date_key" ON "Absence"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_userId_date_key" ON "Shift"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MonthStatus_month_year_key" ON "MonthStatus"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaEntry_userId_date_code_key" ON "AgendaEntry"("userId", "date", "code");

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEntry" ADD CONSTRAINT "AgendaEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

