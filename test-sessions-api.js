// Use global fetch (Node 18+)
async function testApi() {
    const userId = '1234'; // Testing demo fallback
    const url = `http://localhost:3000/api/sessions?userId=${userId}`;

    console.log(`Fetching: ${url}`);
    try {
        const start = Date.now();
        const res = await fetch(url);
        if (!res.ok) {
            console.error('API Error:', res.status, await res.text());
            return;
        }
        const data = await res.json();
        const end = Date.now();

        console.log(`Response Time: ${end - start}ms`);
        console.log('Session Count:', data.sessions?.length);

        if (data.sessions && data.sessions.length > 0) {
            const s = data.sessions[0];
            console.log('Sample Session:', {
                id: s.id,
                score: s.score,
                vocal: s.vocalScore,
                posture: s.postureScore,
                savedAt: s.savedAt,
                hasJson: !!s.jsonUrl,
                hasVideo: !!s.videoUrl
            });

            if (s.jsonUrl) console.log('JSON URL snippet:', s.jsonUrl.substring(0, 50) + '...');
        } else {
            console.log('No sessions found for user 1234.');
        }
    } catch (e) {
        console.error('API Test Failed:', e);
    }
}

testApi();
