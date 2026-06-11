const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(filePath));
        } else { 
            if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walk('./src/features/dashboard');
let count = 0;
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('console.log')) {
        // Removes lines that only contain console.log
        let newContent = content.replace(/^[ \t]*console\.log\(.*\);?[ \t]*\r?\n/gm, '');
        // Removes inline console.logs
        newContent = newContent.replace(/console\.log\(.*?\);?/g, '');
        
        fs.writeFileSync(file, newContent, 'utf8');
        count++;
    }
});
console.log(`Cleaned console.logs from ${count} files.`);
