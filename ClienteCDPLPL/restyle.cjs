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
            if (filePath.endsWith('.jsx')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const replacements = [
    // GenerarReporte inner window fixes
    {
        from: /className="space-y-6 p-4 bg-white rounded shadow-lg max-w-xl mx-auto"/g,
        to: 'className="space-y-6 w-full mx-auto"'
    },
    // Gradients & Backgrounds (Mate colors)
    {
        from: /bg-white\/80 backdrop-blur-sm rounded-2xl border border-white\/60 shadow-xl/g,
        to: 'bg-white border border-slate-200 shadow-sm rounded-2xl'
    },
    {
        from: /bg-gradient-to-br from-slate-50 via-[a-z]+-50\/30 to-[a-z]+-50\/20/g,
        to: 'bg-slate-50/50'
    },
    {
        from: /bg-gradient-to-r from-emerald-500 to-green-600/g,
        to: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
        from: /bg-gradient-to-br from-emerald-500 to-green-600/g,
        to: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
        from: /bg-gradient-to-r from-slate-50 to-emerald-50/g,
        to: 'bg-slate-50'
    },
    {
        from: /hover:bg-[a-z]+-50\/30/g,
        to: 'hover:bg-slate-50'
    },
    // Modals buttons
    {
        from: /bg-blue-600 text-white/g,
        to: 'bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px]'
    },
    {
        from: /bg-green-500 hover:bg-green-600 text-white/g,
        to: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest text-[10px]'
    },
    {
        from: /bg-gray-200 text-black hover:bg-gray-300/g,
        to: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase tracking-widest text-[10px]'
    },
    {
        from: /bg-gray-300 hover:bg-gray-400 text-black/g,
        to: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold uppercase tracking-widest text-[10px]'
    },
    // Minor fixes for specific boxes
    {
        from: /bg-gradient-to-br from-blue-50 to-blue-100/g,
        to: 'bg-slate-50'
    },
    {
        from: /bg-gradient-to-br from-green-50 to-green-100/g,
        to: 'bg-emerald-50'
    },
    {
        from: /bg-gradient-to-br from-red-50 to-red-100/g,
        to: 'bg-rose-50'
    },
    {
        from: /bg-gradient-to-br from-purple-50 to-purple-100/g,
        to: 'bg-indigo-50'
    }
];

const files = walk('./src/features/dashboard');
let updatedCount = 0;

files.forEach(file => {
    const originalContent = fs.readFileSync(file, 'utf8');
    let newContent = originalContent;

    replacements.forEach(rep => {
        newContent = newContent.replace(rep.from, rep.to);
    });

    if (newContent !== originalContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        updatedCount++;
    }
});

console.log(`Updated styles in ${updatedCount} files.`);
