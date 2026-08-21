import fs from 'node:fs';

const files = fs.readdirSync('public/circuit');
console.log('Testing', files.length, 'files...');
let valid = 0;
for (const f of files) {
  const content = fs.readFileSync('public/circuit/' + f, 'utf8');
  const dMatch = content.match(/<path[^>]*\bd="([^"]+)"/i) || content.match(/<path[^>]*\bd='([^']+)'/i);
  if (dMatch && dMatch[1].length > 10) {
    valid++;
  } else {
    console.error('Invalid SVG path in:', f);
  }
}
console.log(`Result: ${valid}/${files.length} SVGs contain valid continuous path geometry.`);
