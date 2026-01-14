
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envMatch = envContent.match(/KAITEN_API_TOKEN=(.+)/);
const token = envMatch ? envMatch[1].trim() : process.env.KAITEN_API_TOKEN;

const baseUrl = 'https://flant.kaiten.ru/api/latest';
const baseV1 = 'https://flant.kaiten.ru/api/v1';

if (!token) {
    console.error('No KAITEN_API_TOKEN found');
    process.exit(1);
}

const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

async function fetchUrl(url, label) {
    console.log(`\n--- ${label}: ${url} ---`);
    try {
        const res = await fetch(url, { headers });
        console.log(`Status: ${res.status} ${res.statusText}`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                console.log(`Response is Array of length ${data.length}`);
                if (data.length > 0) console.log('First item keys:', Object.keys(data[0]));
            } else {
                console.log('Response Keys:', Object.keys(data));
                if (data.checklists) {
                    console.log('Has checklists property!');
                    console.log('Checklists content:', JSON.stringify(data.checklists, null, 2));
                }
                if (data.goals) console.log('Has goals property!');
            }
            return data;
        } else {
            const text = await res.text();
            console.log('Error Body:', text.substring(0, 200));
        }
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

async function run() {
    const cardId = 59690291; // Target card

    // 1. Get Card 
    await fetchUrl(`${baseUrl}/cards/${cardId}`, 'Get Target Card');
}

run();
