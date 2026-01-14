
import { KaitenClient } from './src/kaiten-client.ts';
import { config } from './src/config.ts';

console.log('API URL:', config.KAITEN_API_URL);
console.log('Token length:', config.KAITEN_API_TOKEN?.length);

const client = new KaitenClient(config.KAITEN_API_URL, config.KAITEN_API_TOKEN);

async function run() {
    try {
        console.log('Fetching card 59690068...');
        const card = await client.getCard(59690068);
        console.log('Card fetched successfully!');
        // Log all top-level keys
        console.log('Card keys:', Object.keys(card));

        // Check specific fields
        console.log('Goals done:', (card as any).goals_done);
        console.log('Goals total:', (card as any).goals_total);
        console.log('Parent checklist IDs:', (card as any).parent_checklist_ids);

        // Explicitly check for checklists or goals arrays
        if ((card as any).checklists) console.log('Found "checklists" array in card!');
        if ((card as any).goals) console.log('Found "goals" array in card!');

        console.log('\n--- Testing Endpoints ---');

        const endpoints = [
            `/cards/59690068/checklists`,
            `/cards/59690068/goals`,
            `/checklists?card_id=59690068`,
            `/cards/59690068?fillChecklists=true`,
            `/checklists/10608255` // Validation of user's ID
        ];

        for (const url of endpoints) {
            console.log(`GET ${url}...`);
            try {
                const res = await (client as any).client.get(url);
                console.log(`SUCCESS: ${res.status}`);
                console.log('Keys:', Object.keys(res.data));
                if (Array.isArray(res.data)) console.log('Is Array, length:', res.data.length);
            } catch (e: any) {
                console.log(`FAILED: ${e.response?.status || e.message}`);
            }
        }

        // Try to call the client's getCardChecklists method
        console.log('\nTesting getCardChecklists...');
        try {
            const playlists = await client.getCardChecklists(59690068);
            console.log('Checklists fetched:', playlists);
        } catch (err: any) {
            console.log('getCardChecklists failed:', err.message);
            if (err.response) {
                console.log('Status:', err.response.status);
                console.log('Data:', JSON.stringify(err.response.data));
            }
        }

    } catch (error: any) {
        console.error('Core error:', error.message);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', JSON.stringify(error.response.data));
        }
    }
}

run();
