import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const data = [
  { name: 'LOIUDICE CIPRIANO', matricola: '251', service: 'Centrale Operativa e Piantone' },
  { name: 'RAGONE ROSA', matricola: '425', service: 'Centrale Operativa e Piantone' },
  { name: 'SCHIAVINO GIUSEPPE', matricola: '427', service: 'Centrale Operativa e Piantone' },
  { name: 'INDRIO ANNA', matricola: '222', service: 'Sezione Comando' },
  { name: 'PIERRO MADDALENA', matricola: '350', service: 'Sezione Comando' },
  { name: 'LATERZA NICOLA', matricola: '400', service: 'Ufficio Ced- Verbali' },
  { name: 'POPOLIZIO PAOLO', matricola: '418', service: 'Ufficio Ced- Verbali' },
  { name: 'TRAGNI ANGELANTONIO', matricola: '428', service: 'Ufficio Ced- Verbali' },
  { name: 'GRANDOLFO ANGELA', matricola: '1457', service: 'Polizia Ambientale' },
  { name: 'TEDONE GAETANO', matricola: '1459', service: 'Polizia Ambientale' },
  { name: 'D\'APRILE GIUSEPPE', matricola: '380', service: 'Polizia Commerciale' },
  { name: 'DELIZIA CATERINA', matricola: '408', service: 'Polizia Commerciale' },
  { name: 'BELTEMPO ANTONIO', matricola: '420', service: 'Polizia Edilizia' },
  { name: 'BERLOCO PASQUALE', matricola: '1386', service: 'Polizia Edilizia' },
  { name: 'FORTE MARIA', matricola: '362', service: 'Polizia Edilizia' },
  { name: 'SCIANNANTENO PASQUALE', matricola: '450', service: 'Polizia Edilizia' },
  { name: 'BOVE ANTONIO', matricola: '393', service: 'Polizia Giudiziaria' },
  { name: 'CIRROTTOLA NICOLA', matricola: '423', service: 'Polizia Giudiziaria' },
  { name: 'MARTIMUCCI MICHELE', matricola: '424', service: 'Polizia Giudiziaria' },
  { name: 'CAPORUSSO GAETANO', matricola: '1379', service: 'Ufficiali' },
  { name: 'CRISTALLO GIOVANNI', matricola: '399', service: 'Ufficiali' },
  { name: 'DE SIMONE BIAGIO PIETRO', matricola: '1374', service: 'Ufficiali' },
  { name: 'ERAMO ANGELA', matricola: '1375', service: 'Ufficiali' },
  { name: 'TRAGNI ANGELO ANTONIO', matricola: '426', service: 'Ufficiali' },
  { name: 'VENTURA GIUSEPPE', matricola: '220', service: 'Ufficiali' },
  { name: 'CENTONZE SAVERIO', matricola: '182', service: 'Disposizione Ufficiali Viabilità' },
  { name: 'DIBENEDETTO MARIO', matricola: '357', service: 'Disposizione Ufficiali Viabilità' },
  { name: 'BALDASSARRA MICHELE', matricola: '1458', service: 'Pronto Intervento' },
  { name: 'CRISTALLO ANTONELLA', matricola: '1403', service: 'Pronto Intervento' },
  { name: 'DIMARNO LEONARDO', matricola: '1494', service: 'Pronto Intervento' },
  { name: 'FIORE PAMELA', matricola: '1468', service: 'Pronto Intervento' },
  { name: 'MIRGALDI VINCENZO', matricola: '1507', service: 'Pronto Intervento' },
  { name: 'TAFUNI ANTONIO', matricola: '3540', service: 'Pronto Intervento' },
  { name: 'TEDESCO CARLO', matricola: '4000', service: 'Pronto Intervento' },
  { name: 'VALERIO GIUSEPPE', matricola: '3541', service: 'Pronto Intervento' },
  { name: 'DILELLA ANTONIO', matricola: '2167', service: 'Viabilità' },
  { name: 'LARUINA ANTONIO', matricola: '1497', service: 'Viabilità' },
  { name: 'LOCONSOLE GIUSEPPE', matricola: '1506', service: 'Viabilità' },
  { name: 'LORUSSO ANTONIO', matricola: '1496', service: 'Viabilità' },
  { name: 'MANCINI GIOVANNI', matricola: '1394', service: 'Viabilità' },
  { name: 'MORAMARCO ANTONIO', matricola: '362', service: 'Viabilità' },
  { name: 'NUZZO ROBERTO', matricola: '2166', service: 'Viabilità' },
  { name: 'ONTINO DAVIDE', matricola: '3538', service: 'Viabilità' },
  { name: 'PRISCIANDARO ANTONIA', matricola: '4085', service: 'Viabilità' },
  { name: 'SCHETTINO LEONARDO', matricola: '1484', service: 'Viabilità' },
  { name: 'TRITTO MARISTELLA', matricola: '1465', service: 'Viabilità' },
  { name: 'VALERIO RUGGIERO', matricola: '1483', service: 'Viabilità' }
];

async function main() {
  console.log('Inizio aggiornamento servizi...');
  let updatedCount = 0;
  for (const item of data) {
    // Try by matricola first
    let user = await prisma.user.findFirst({
      where: { matricola: item.matricola }
    });

    if (!user) {
      // Try by name ignoring case
      user = await prisma.user.findFirst({
        where: { name: { equals: item.name, mode: 'insensitive' } }
      });
    }

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { servizio: item.service }
      });
      console.log(`Aggiornato: ${user.name} -> ${item.service}`);
      updatedCount++;
    } else {
      console.log(`UTENTE NON TROVATO: ${item.name} (${item.matricola})`);
    }
  }
  
  console.log(`Aggiornamento completato! Modificati ${updatedCount} utenti.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
