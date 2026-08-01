javascript:(function() {
    var el = document.getElementById('programmazioneCTL');
    if (!el || typeof angular === 'undefined') {
        alert("AngularJS non trovato sulla pagina. Assicurati di essere sulla pagina dei turni di Verbatel.");
        return;
    }
    
    var scope = angular.element(el).scope();
    var turni = scope.turni;
    
    if (!turni || !turni.length) {
        alert("Nessun turno trovato nella memoria della pagina.");
        return;
    }
    
    // Configura questi parametri:
    var API_URL = "http://localhost:3000/api/admin/shifts/import-verbatel"; // Cambia in produzione (es. https://app.portale-caserma.it/...)
    var API_SECRET = "INSERIRE_LA_STESSA_PASSWORD_DEL_FILE_ENV";
    var TENANT_ID = "altamura"; // ID del comando
    
    var payload = {
        tenantId: TENANT_ID,
        turni: turni
    };
    
    if(confirm("Vuoi inviare " + turni.length + " record di turni al portale?")) {
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_SECRET
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                alert("Importazione avvenuta con successo!\n" + data.message);
            } else {
                alert("Errore dal server:\n" + JSON.stringify(data.error || data));
            }
        })
        .catch(error => {
            alert("Errore di connessione al server:\n" + error);
        });
    }
})();
