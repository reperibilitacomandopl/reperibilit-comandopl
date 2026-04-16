const XLSX = require('xlsx');

function analyzeExcel(filePath) {
    try {
        const wb = XLSX.readFile(filePath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        console.log("File Name:", filePath);
        console.log("Number of Rows:", data.length);
        console.log("Header rows sample (first 5):");
        data.slice(0, 5).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });
    } catch (e) {
        console.error("Error reading file:", e.message);
    }
}

analyzeExcel('c:/Users/dibenedettom/Desktop/portale-caserma/Programmazione REP.xlsx');
