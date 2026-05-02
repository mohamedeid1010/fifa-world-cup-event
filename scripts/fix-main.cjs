const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, '..', 'src', 'js', 'main.js');
let js = fs.readFileSync(mainJsPath, 'utf8');

js = js.replace(/elements\.serviceForm\.addEventListener\('submit', \(event\) => \{[\s\S]*?elements\.emergencyBtns\.forEach/, 'elements.emergencyBtns.forEach');

fs.writeFileSync(mainJsPath, js);
console.log('main.js fixed in src/js/main.js');