const xlsx = require("xlsx");
const path = require("path");

async function scan() {
  const filePath = path.resolve("C:\\Users\\dibenedettom\\Desktop\\portale-caserma\\Reperibilità dal 01_04_2026 al 30_04_2026-OK.xlsx");
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Cerchiamo le intestazioni o stampiamo le prime righe per capire il tracciato
  console.log("=== PRIME 15 RIGHE EXCEL ===");
  for (let i = 0; i < 15; i++) {
    console.log(rawData[i]);
  }
}

scan().catch(console.error);
