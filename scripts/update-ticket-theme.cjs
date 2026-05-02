const fs = require('fs');
const path = require('path');

const ticketCssPath = path.join(__dirname, '..', 'src', 'style', 'ticket.css');
let css = fs.readFileSync(ticketCssPath, 'utf8');

css = css.replace(/rgba\(255, 251, 246, 0\.([0-9]+)\)/g, 'rgba(248, 250, 252, 0.$1)');
css = css.replace(/rgba\(248, 241, 233, 0\.([0-9]+)\)/g, 'rgba(241, 245, 249, 0.$1)');
css = css.replace(/rgba\(255, 248, 241, 0\.([0-9]+)\)/g, 'rgba(241, 245, 249, 0.$1)');
css = css.replace(/rgba\(255, 250, 245, 0\.([0-9]+)\)/g, 'rgba(248, 250, 252, 0.$1)');
css = css.replace(/rgba\(255, 241, 228, 0\.([0-9]+)\)/g, 'rgba(226, 232, 240, 0.$1)');
css = css.replace(/rgba\(255, 238, 222, 0\.([0-9]+)\)/g, 'rgba(226, 232, 240, 0.$1)');
css = css.replace(/rgba\(255, 247, 237, 0\.([0-9]+)\)/g, 'rgba(240, 249, 255, 0.$1)');
css = css.replace(/rgba\(255, 245, 235, 0\.([0-9]+)\)/g, 'rgba(240, 249, 255, 0.$1)');
css = css.replace(/rgba\(254, 240, 138, 0\.([0-9]+)\)/g, 'rgba(186, 230, 253, 0.$1)');

css = css.replace(/#b45309/g, '#0369a1');
css = css.replace(/#c2410c/g, '#0f62fe');
css = css.replace(/#ea580c/g, '#0f62fe');
css = css.replace(/#f97316/g, '#0f62fe');
css = css.replace(/#fbbf24/g, '#38bdf8');
css = css.replace(/#f59e0b/g, '#0284c7');
css = css.replace(/#a16207/g, '#0369a1');
css = css.replace(/#8b5e34/g, '#475569');
css = css.replace(/#9a5d2c/g, '#64748b');
css = css.replace(/#9a4b14/g, '#0f62fe');

css = css.replace(/rgba\(148, 88, 32, /g, 'rgba(15, 23, 42, ');
css = css.replace(/rgba\(251, 146, 60, /g, 'rgba(15, 98, 254, ');
css = css.replace(/rgba\(249, 115, 22, /g, 'rgba(15, 98, 254, ');
css = css.replace(/rgba\(251, 191, 36, /g, 'rgba(56, 189, 248, ');

css = css.replace(/color: #ea580c;/g, 'color: #0f62fe;');

fs.writeFileSync(ticketCssPath, css);
console.log('Ticket theme updated in src/style/ticket.css');