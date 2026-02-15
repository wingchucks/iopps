// No imports needed for external URL testing


async function verifyApiSecurity() {
    console.log("🔒 Verifying API Security...");

    const endpoints = [
        { url: "http://localhost:3000/api/ai/analyze-poster", method: "POST" },
        { url: "http://localhost:3000/api/notifications/create", method: "POST" },
        { url: "http://localhost:3000/api/admin/impersonate", method: "POST" },
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint.url}...`);
            const res = await fetch(endpoint.url, {
                method: endpoint.method,
                headers: {
                    // No Authorization header
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            });

            if (res.status === 401) {
                console.log(`✅ ${endpoint.url} returned 401 Unauthorized (Expected)`);
            } else {
                console.error(`❌ ${endpoint.url} returned ${res.status} (Expected 401)`);
                // console.log(await res.text());
            }
        } catch (error) {
            console.error(`❌ Failed to request ${endpoint.url}:`, error);
        }
    }
}

verifyApiSecurity();
