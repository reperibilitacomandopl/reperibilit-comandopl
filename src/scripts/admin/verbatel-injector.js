/**
 * =========================================================================
 *  SCRIPT AUTOMAZIONE VERBATEL - REPERIBILITÀ (DA ESEGUIRE IN CONSOLE)
 * =========================================================================
 * 
 * 1. Apri la griglia del portale Verbatel nel browser per il mese di interesse.
 * 2. Apri la console per gli sviluppatori (F12 -> Console).
 * 3. Incolla questo script e premi Invio.
 * 4. Lo script scarica i turni non sincronizzati dal Portale Caserma locale
 *    e li inserisce saltando i turni già occupati, MA IGNORANDO I DIVIETI.
 */

(async function syncVerbatel() {
  // PUNTA AL TUO SERVER VERCEL IN PRODUZIONE
  const PORTALE_URL = 'https://portale-caserma-altamura.vercel.app'; 
  
  // CHIAVE DI AUTENTICAZIONE (Stessa di AUTH_SECRET in .env)
  const API_KEY = 'my-super-secret-key-12345';
  
  const MESE = 4; // Mese da sincronizzare (es. 4 per Aprile, 5 per Maggio)
  const ANNO = 2026;

  console.log('🔄 Avvio sincronizzazione Reperibilità da Portale Caserma...');

  try {
    const res = await fetch(`${PORTALE_URL}/api/admin/verbatel-export?mese=${MESE}&anno=${ANNO}&unsyncedOnly=true&apiKey=${API_KEY}`);
    const turniDaInserire = await res.json();

    if (!Array.isArray(turniDaInserire) || turniDaInserire.length === 0) {
      console.log('✅ Nessun turno REP in sospeso da sincronizzare per questo mese.');
      return;
    }

    const table = document.getElementById('tableProspetto');
    if(!table) return alert('Tabella Verbatel non trovata! Assicurati di essere nella pagina corretta (Prospetto Reperibilità).');
    
    // Mappatura Colonne -> Giorni
    const ths = table.querySelectorAll('thead tr th');
    const columnToDayMap = {};
    ths.forEach((th, index) => {
        if(index === 0) return;
        const testText = th.innerText || th.textContent || "";
        const match = testText.match(/(\d{2})\/\d{2}/);
        if(match) columnToDayMap[index - 1] = parseInt(match[1], 10);
    });

    const sleep = ms => new Promise(res => setTimeout(res, ms));
    function simulateClick(el, x = 0, y = 0) {
        ['mousedown', 'mouseup', 'click'].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { 
                view: window, bubbles: true, cancelable: true, buttons: 1,
                clientX: x, clientY: y, screenX: x, screenY: y
            }));
        });
    }

    const unassignedShifts = [];
    let modificheFatte = 0;
    const rows = table.querySelectorAll('tbody tr');

    for(const turno of turniDaInserire) {
        console.log(`👤 Analisi agente: ${turno.agente} (Matricola: ${turno.matricola})`);
      
        let row = null;
        for(let r of rows) {
            const nomCell = r.querySelector('th.nominativo');
            if(nomCell && nomCell.innerHTML.includes(turno.matricola)) {
                row = r; break;
            }
        }
        if(!row) { console.warn('Agente non trovato in griglia Verbatel: ' + turno.agente); continue; }

        for(const shift of turno.shifts) {
            const giorno = shift.giorno;
            let targetColIndex = -1;
            for(let c in columnToDayMap) {
                if(columnToDayMap[c] === giorno) { targetColIndex = parseInt(c, 10); break; }
            }
            if(targetColIndex === -1) continue;
            
            const cell = row.querySelectorAll('td')[targetColIndex];
            if(!cell) continue;

            // RIMOSSO: || cell.innerHTML.includes('fa-ban')
            // Ora scavalcherà il divieto e inserirà la reperibilità.
            if (cell.className.includes('reperibile') || cell.innerHTML.includes('fa-calendar-day')) {
                continue;
            }

            const originalBg = cell.style.backgroundColor;
            cell.style.border = '2px solid red';
            
            // Per ingannare jQuery ContextMenu, servono coordinate precise
            const rect = cell.getBoundingClientRect();
            const cx = rect.left + (rect.width / 2);
            const cy = rect.top + (rect.height / 2);
            
            const mouseOpts = { 
                bubbles: true, cancelable: true, view: window, 
                clientX: cx, clientY: cy, screenX: cx, screenY: cy 
            };
            
            cell.dispatchEvent(new MouseEvent('mouseover', mouseOpts));
            cell.dispatchEvent(new MouseEvent('mouseenter', mouseOpts));
            await sleep(100);
            
            cell.dispatchEvent(new MouseEvent('mousedown', { ...mouseOpts, button: 0, buttons: 1 }));
            cell.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, button: 0, buttons: 0 }));
            cell.dispatchEvent(new MouseEvent('click', { ...mouseOpts, button: 0, buttons: 0 }));
            await sleep(200);

            // Simula Tasto Destro con coordinate per aprire il ContextMenu
            cell.dispatchEvent(new MouseEvent('contextmenu', { ...mouseOpts, button: 2, buttons: 2 }));
            await sleep(600); // aspetta tempo extra per caricamento menu jQuery

            let btn = null;
            const xpath = "//a[normalize-space(text())='Reperibile'] | //span[normalize-space(text())='Reperibile']";
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for(let i=0; i<result.snapshotLength; i++) {
                let el = result.snapshotItem(i);
                if(el.offsetParent !== null) { btn = el; break; }
            }

            if(!btn) {
                const lis = document.querySelectorAll('li');
                for(let l of lis) { if(l.innerText && l.innerText.trim()==='Reperibile' && l.offsetParent !== null) { btn = l.querySelector('a')||l; break; } }
            }

            if(btn) {
                const btnRect = btn.getBoundingClientRect();
                simulateClick(btn, btnRect.left + 5, btnRect.top + 5);
                unassignedShifts.push(shift.id); // Salva ID per sincronizzarlo col database locale!
                modificheFatte++;
                await sleep(600);
            } else {
                console.error("Tasto 'Reperibile' non trovato per " + turno.agente);
                cell.style.border = '';
            }
        }
    }

    // 3. Comunica al Portale Caserma che i turni sono stati inseriti
    if (unassignedShifts.length > 0) {
      console.log(`📤 Segno ${unassignedShifts.length} turni come sincronizzati nel Portale Caserma Vercel...`);
      const syncRes = await fetch(`${PORTALE_URL}/api/admin/verbatel-sync?apiKey=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftIds: unassignedShifts, status: true })
      });
      
      const syncData = await syncRes.json();
      if (syncData.success) {
        alert(`✅ Sincronizzazione Completata! Inseriti ${modificheFatte} turni in Verbatel e salvati in Vercel.`);
      } else {
        alert(`❌ Errore durante il salvataggio nel db Vercel! Volendo, ripeti.`);
      }
    } else {
      alert('Nessun nuovo turno inserito in questa esecuzione.');
    }

  } catch (error) {
    console.error('❌ Sincronizzazione Fallita:', error);
    alert('Errore nello script! Controlla la console.');
  }
})();
