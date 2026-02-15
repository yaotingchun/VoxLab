const https = require('https');

const API_KEY = "AIzaSyCJJjGhCXcS0tPfYwG2TBBtB8Isb4N2600";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                json.models.forEach(m => console.log(m.name));
            } else {
                console.log("No models found in response:", JSON.stringify(json));
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    });
}).on('error', (e) => {
    console.error("Error fetching models:", e);
});
