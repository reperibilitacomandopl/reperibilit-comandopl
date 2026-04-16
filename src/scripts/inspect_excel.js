const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\dibenedettom\\Desktop\\portale-caserma\\Programmazione POLIZIA LOCALE ALTAMURA dal 01_05_2026 al 01_06_2026.xls.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Leggi le prime 10 righe per capire la struttura
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }).slice(0, 10);
    
    console.log("STRUTTURA FILE EXCEL:");
    data.forEach((row, index) => {
        console.log(`Riga ${index}:`, row);
    });
} catch (error) {
    console.error("Errore lettura file:", error.message);
}
