
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_BASE = 'https://flant.kaiten.ru/api/latest';
const CARD_ID = 59690291;

// Get token
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envMatch = envContent.match(/KAITEN_API_TOKEN=(.+)/);
const token = envMatch ? envMatch[1].trim() : process.env.KAITEN_API_TOKEN;

const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

async function request(url, method = 'GET', body = null) {
    try {
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(url, options);
        if (!res.ok) {
            console.log(`[${res.status}] ${method} ${url} failed`);
            return null;
        }
        console.log(`[${res.status}] ${method} ${url} success`);
        if (res.status === 204) return true;
        return await res.json();
    } catch (e) {
        console.log(`Error: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log('--- Testing Item Endpoints ---');

    // 1. Get a checklist ID from the card
    const card = await request(`${API_BASE}/cards/${CARD_ID}`);
    if (!card || !card.checklists || card.checklists.length === 0) {
        console.log('No checklists found.');
        return;
    }
    const checklist = card.checklists[0];
    console.log(`Using checklist: ${checklist.id} (${checklist.name})`);

    // 2. Create a dummy item
    console.log('\nCreating dummy item...');
    // We know this works from sync-checklists.cjs: POST /checklists/{id}/items
    const createRes = await request(`${API_BASE}/checklists/${checklist.id}/items`, 'POST', {
        items: [{ text: "TEST_ITEM_TO_DELETE", checked: false }]
    });

    // The response is usually an array of created items
    const item = Array.isArray(createRes) ? createRes[0] : createRes;

    if (!item) {
        console.log('Failed to create item, executing cleanup just in case and exiting.');
        return;
    }
    console.log(`Created item: ${item.id}`);

    // 3. Test UPDATE using /checklists/{listId}/items/{itemId} (Short path)
    console.log('\nTesting UPDATE (Short Path)...');
    const updateShort = await request(`${API_BASE}/checklists/${checklist.id}/items/${item.id}`, 'PATCH', { checked: true });

    // 4. Test UPDATE using /cards/{cardId}/checklists/{listId}/items/{itemId} (Long path)
    console.log('\nTesting UPDATE (Long Path)...');
    const updateLong = await request(`${API_BASE}/cards/${CARD_ID}/checklists/${checklist.id}/items/${item.id}`, 'PATCH', { checked: false });

    // 5. Test DELETE using Short Path
    // console.log('\nTesting DELETE (Short Path)...');
    // await request(`${API_BASE}/checklists/${checklist.id}/items/${item.id}`, 'DELETE');

    // Re-create if deleted? No, let's just try delete with Long Path if Short worked, or vice versa.
    // Actually, let's keep the item for the second delete test if the first fails.

    // 5. Test DELETE using Long Path
    console.log('\nTesting DELETE (Long Path)...');
    const deleteLong = await request(`${API_BASE}/cards/${CARD_ID}/checklists/${checklist.id}/items/${item.id}`, 'DELETE');

    if (!deleteLong) {
        console.log('Long path delete failed, trying Short Path...');
        await request(`${API_BASE}/checklists/${checklist.id}/items/${item.id}`, 'DELETE');
    }

    console.log('\n--- Done ---');
}

run();
