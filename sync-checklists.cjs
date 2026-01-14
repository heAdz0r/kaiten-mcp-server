
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Config
const REFERENCE_CARD_ID = 59690068;
const TARGET_CARD_IDS = [59690291, 59690292, 59690293, 59690295];
const API_BASE = 'https://flant.kaiten.ru/api/latest';

// Get token
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envMatch = envContent.match(/KAITEN_API_TOKEN=(.+)/);
const token = envMatch ? envMatch[1].trim() : process.env.KAITEN_API_TOKEN;

if (!token) {
    console.error('No KAITEN_API_TOKEN found');
    process.exit(1);
}

const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

// Helper fetch
async function request(url, method = 'GET', body = null) {
    // console.log(`${method} ${url}`);
    try {
        const options = {
            method,
            headers
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Failed ${method} ${url}: ${res.status} ${text}`);
        }
        // DELETE often returns 204 No Content
        if (res.status === 204) return null;
        return await res.json();
    } catch (e) {
        throw new Error(e.message);
    }
}

async function run() {
    console.log(`Starting sync from Reference Card ${REFERENCE_CARD_ID}...`);

    // 1. Get Reference Checklists
    const refCard = await request(`${API_BASE}/cards/${REFERENCE_CARD_ID}`);
    const refChecklists = refCard.checklists || [];
    console.log(`Found ${refChecklists.length} checklists on reference card.`);

    if (refChecklists.length === 0) {
        console.warn("No checklists found on reference card!");
        return;
    }

    // 2. Process Targets
    for (const targetId of TARGET_CARD_IDS) {
        console.log(`\nProcessing Target Card ${targetId}...`);

        try {
            // A. Get current checklists on target
            const targetCard = await request(`${API_BASE}/cards/${targetId}`);
            const currentChecklists = targetCard.checklists || [];

            // B. Delete existing checklists (Cleanup)
            console.log(`- Deleting ${currentChecklists.length} existing checklists...`);
            for (const cl of currentChecklists) {
                await request(`${API_BASE}/cards/${targetId}/checklists/${cl.id}`, 'DELETE');
            }

            // C. Create new checklists
            for (const refCl of refChecklists) {
                console.log(`- Creating checklist "${refCl.name}"...`);
                // Create checklist
                const newCl = await request(`${API_BASE}/cards/${targetId}/checklists`, 'POST', { name: refCl.name });

                // Add items
                if (refCl.items && refCl.items.length > 0) {
                    console.log(`  - Adding ${refCl.items.length} items...`);
                    // We can batch create items? No, standard API suggests one by one or batch?
                    // User example: {"items":[{"text":"тест",...}]} - Suggests array support!
                    // Let's map ref items to the payload format

                    const itemsPayload = refCl.items.map(item => ({
                        text: item.text,
                        checked: false, // Reset checked state for new cards? Usually yes.
                        sort_order: item.sort_order
                    }));

                    await request(`${API_BASE}/checklists/${newCl.id}/items`, 'POST', { items: itemsPayload });
                }
            }
            console.log(`✓ Card ${targetId} synced.`);

        } catch (err) {
            console.error(`Error processing card ${targetId}:`, err.message);
        }
    }
    console.log('\nSync completed.');
}

run();
