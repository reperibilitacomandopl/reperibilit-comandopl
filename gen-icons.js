const fs = require('fs');
const path = require('path');

// Un pixel trasparente
const base64Pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPRyoQAAAA1JREFUGFdj+P///38ACfsD/QVXJw4AAAAASUVORK5CYII=';
const buf = Buffer.from(base64Pixel, 'base64');

fs.writeFileSync(path.join(__dirname, 'public', 'icon-192.png'), buf);
fs.writeFileSync(path.join(__dirname, 'public', 'icon-512.png'), buf);

console.log("Icone fittizie generate in /public");
