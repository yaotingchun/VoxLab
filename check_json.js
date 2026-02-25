const fs = require('fs');
const data = JSON.parse(fs.readFileSync('test_output.json', 'utf8'));

console.log("Top level keys:");
console.dir(Object.keys(data), { maxArrayLength: null });

if (data.rawMetrics) {
    console.log("rawMetrics keys:");
    console.dir(Object.keys(data.rawMetrics), { maxArrayLength: null });
}

if (data.vocalSummary) {
    console.log("vocalSummary keys:", Object.keys(data.vocalSummary).join(", "));
}

if (data.postureSummary) {
    console.log("postureSummary keys:", Object.keys(data.postureSummary).join(", "));
}

if (data.faceMetrics) {
    console.log("faceMetrics keys:", Object.keys(data.faceMetrics).join(", "));
}
