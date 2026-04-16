const xlsx = require('xlsx');

function simulateParsing(filePath, currentYear, currentMonth) {
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

    let headerRowIndex = -1;
    for (let r = 0; r < Math.min(data.length, 15); r++) {
        const row = data[r];
        if (Array.isArray(row)) {
            const rowStr = row.map(c => String(c || "")).join(" ").toLowerCase();
            // Cerca parole chiave per l'intestazione
            if (rowStr.includes("matricola") || rowStr.includes("nominativo") || rowStr.includes("agente") || rowStr.includes("nome")) {
                headerRowIndex = r;
                break;
            }
        }
    }

    console.log("Header Row Index Found:", headerRowIndex);
    if (headerRowIndex === -1) return;

    const shiftsData = [];
    const ignoreKeywords = ["AGENTE", "ISTRUTTORE", "UFFICIALE", "SOVRINTENDENTE", "ASSISTENTE", "VICE", "CAPITANO", "TENENTE", "TOTAL", "COMUNE", "POLIZIA"];
    const startRow = headerRowIndex + 1;
    const colOffset = 4; // As per the code

    for (let r = startRow; r < data.length; r++) {
        const rowData = data[r];
        if (!rowData || !rowData[0]) continue;

        const rawName = rowData[0]?.toString().trim().toUpperCase() || "";
        if (!rawName || ignoreKeywords.some(kw => rawName === kw || rawName.includes("PROGRAMMAZIONE"))) continue;
        if (rawName.length < 3) continue;

        for (let d = 1; d <= 31; d++) {
            const shiftValue = rowData[d + colOffset - 1];
            const shiftType = shiftValue?.toString().trim();

            if (shiftType) {
                const dateObj = new Date(Date.UTC(currentYear, currentMonth - 1, d));
                if (dateObj.getUTCMonth() === currentMonth - 1) {
                    shiftsData.push({
                        name: rawName,
                        matricola: rowData[1]?.toString().trim() || "",
                        qualifica: rowData[2]?.toString().trim() || "",
                        squadra: rowData[3]?.toString().trim() || "",
                        date: dateObj.toISOString(),
                        type: shiftType
                    });
                }
            }
        }
    }

    console.log("Total Shifts Parsed:", shiftsData.length);
    if (shiftsData.length > 0) {
        console.log("First 3 Shifts Sample:", shiftsData.slice(0, 3));
    }
}

simulateParsing('rep.xlsx', 2026, 5);
