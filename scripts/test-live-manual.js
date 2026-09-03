const https = require('https');

https.get('https://maui-church-finance.vercel.app/pages/manual.html', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        console.log('LIVE MANUAL.HTML STATUS:', res.statusCode);
        console.log('Includes Table of Contents:', d.includes('Table of Contents'));
        console.log('Includes Hardware Setup:', d.includes('Hardware & Workstation Setup'));
        console.log('Includes Import Guide:', d.includes('Bulk Member Excel Import'));
    });
});
