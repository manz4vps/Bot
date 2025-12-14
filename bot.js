const mineflayer = require('mineflayer');
const fs = require('fs');
const readline = require('readline');

// === CONFIG ===
const HOST = '88.198.37.107';
const PORT = 4040;
const VERSION = '1.16.5';
const BOT_COUNT = 5;
const JOIN_DELAY = 10000;

// === FILE PENYIMPAN NAMA BOT ===
const FILE_BOTS = 'bots.json';

// === LOAD / SAVE NAMA BOT ===
function loadBotNames() {
    if (fs.existsSync(FILE_BOTS)) {
        return JSON.parse(fs.readFileSync(FILE_BOTS));
    }
    return [];
}
function saveBotNames(names) {
    fs.writeFileSync(FILE_BOTS, JSON.stringify(names, null, 2));
}

// === GENERATE NAMA RANDOM ===
function randomName() {
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    const vowels = 'aeiou';
    const numbers = '0123456789';
    
    let name = '';
    const targetLength = 7 + Math.floor(Math.random() * 3);
    let useConsonant = true;

    while (name.length < targetLength) {
        if (useConsonant) name += consonants[Math.floor(Math.random() * consonants.length)];
        else name += vowels[Math.floor(Math.random() * vowels.length)];
        useConsonant = !useConsonant;
    }

    if (Math.random() < 0.4) name += numbers[Math.floor(Math.random() * numbers.length)];

    if (Math.random() < 0.5) {
        const pos = 1 + Math.floor(Math.random() * (name.length - 2));
        name = name.slice(0, pos) + '_' + name.slice(pos);
    }

    name = name.charAt(0).toUpperCase() + name.slice(1);
    if (Math.random() < 0.5) name = '.' + name;

    return name;
}

// === BUAT LIST NAMA BOT ===
let botNames = loadBotNames();
if (botNames.length > BOT_COUNT) botNames = botNames.slice(0, BOT_COUNT);
while (botNames.length < BOT_COUNT) {
    const newName = randomName();
    if (!botNames.includes(newName)) botNames.push(newName);
}
saveBotNames(botNames);

// === TRACK BOT ===
let activeBots = {};
let joinedCount = 0;
let bots = {}; // simpan instance bot

// === CREATE BOT FUNCTION ===
function createBot(username, index) {
    const bot = mineflayer.createBot({
        host: HOST,
        port: PORT,
        username: username,
        version: VERSION
    });

    bots[username] = bot;

    bot.on('spawn', () => {
        joinedCount++;
        activeBots[username] = true;
        console.log(`[JOIN] ${username} berhasil join (${joinedCount}/${BOT_COUNT})`);

        // === NONAKTIF MUTER ===
        let yaw = 0;
        const spinSpeed = 0;
        setInterval(() => {
            if (!bot.entity) return;
            yaw += spinSpeed;
            if (yaw > Math.PI * 2) yaw -= Math.PI * 2;
            bot.look(yaw, 0, true);
        }, 50);
    });

    bot.on('end', () => {
        console.log(`[BOT ${username}] Disconnected. Reconnect 10 detik...`);
        activeBots[username] = false;
        setTimeout(() => createBot(username, index), 10000);
    });

    bot.on('kicked', reason => {
        console.log(`[BOT ${username}] Kicked:`, reason);
        activeBots[username] = false;
    });

    bot.on('error', err => {
        console.log(`[BOT ${username}] Error:`, err.message);
        activeBots[username] = false;
    });
}

// === JALANKAN BOT DENGAN DELAY ===
botNames.forEach((name, index) => {
    setTimeout(() => {
        console.log(`[MAIN] Menjalankan bot ${index + 1}/${BOT_COUNT} → ${name}`);
        createBot(name, index + 1);
    }, index * JOIN_DELAY);
});

// === FITUR LIST & PING DI CONSOLE ===
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    const cmd = input.trim().toLowerCase();

    if (cmd === 'list') {
        console.log('=== BOT LIST ===');
        botNames.forEach((name, i) => {
            const status = activeBots[name] ? '✅ Online' : '❌ Offline';
            console.log(`${i + 1}. ${name} → ${status}`);
        });
        console.log('================');
    }

    else if (cmd === 'ping') {
        console.log('=== BOT PING ===');
        botNames.forEach((name, i) => {
            const bot = bots[name];
            if (bot && bot.player) {
                const ping = bot.player.ping ?? bot.player.latency ?? 'Belum terdeteksi';
                const status = activeBots[name] ? '✅ Online' : '❌ Offline';
                console.log(`${i + 1}. ${name} → ${status} | Ping: ${ping} ms`);
            } else {
                console.log(`${i + 1}. ${name} → ❌ Offline / Belum data`);
            }
        });
        console.log('================');
    }
});
