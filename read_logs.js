const fs = require('fs');
const content = fs.readFileSync('server_logs.txt', 'utf16le');
const lines = content.split('\n');
lines.filter(l => l.includes('Found') || l.includes('Checking') || l.includes('Error')).forEach(l => console.log(l.trim()));
