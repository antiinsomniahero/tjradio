const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const readline = require('readline');

// --- ตั้งค่า ---
const USER_PROFILE_PATH = 'C:\\Users\\Admin\\AppData\\Local\\Chrome\\User Data\\Profile 2';

const LAUNCH_ARGS = {
    headless: false,
    userDataDir: USER_PROFILE_PATH,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized'
    ]
};

const preventCloseScript = () => {
    window.close = () => { console.log("⚠️ บล็อกการปิด!"); };
};

// --- ฟังก์ชันกวาดสถานี (ฉบับคัดกรองแม่นยำ) ---
async function getStationsAfterHeading(targetUrl, limit) {
    console.log(`\n🕵️‍♂️ [Phase 1] กำลังกวาดสถานีหลังจาก H1...`);
    const browser = await puppeteer.launch(LAUNCH_ARGS);
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(preventCloseScript);
    
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const stations = await page.evaluate((limit) => {
        const h1 = document.querySelector('h1');
        if (!h1) return [];

        const allLinks = Array.from(document.querySelectorAll('a'));
        
        return allLinks
            .filter(a => {
                // 1. เช็คว่าลิงก์อยู่หลัง H1 หรือไม่
                const isAfterH1 = h1.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING;
                
                // 2. เช็คว่าลิงก์อยู่ในเมนูนำทางหรือไม่ (กันพวก Sidebar/Nav)
                const isInMenu = a.closest('nav') || a.closest('header') || a.closest('.sidebar');
                
                // 3. เช็คว่าเป็นลิงก์สถานี (ถ้า URL มีคำว่า radio-thai.com และไม่ใช่ปุ่มพวกสมัครสมาชิก)
                const isStation = a.href.includes('radio-thai.com/') && !a.href.includes('/login') && !a.href.includes('/register');
                
                return isAfterH1 && !isInMenu && isStation && a.innerText.trim().length > 3;
            })
            .map(a => ({ name: a.innerText.trim(), url: a.href }))
            // ลบชื่อซ้ำ
            .filter((v, i, a) => a.findIndex(t => t.url === v.url) === i)
            .slice(0, limit === "ทั้งหมด" ? 999 : parseInt(limit));
    }, limit);

    await browser.close();
    console.log(`✅ [Phase 1] พบสถานีตัวจริง ${stations.length} ช่อง`);
    return stations;
}

// --- ฟังก์ชันเจาะสตรีม (เหมือนเดิม) ---
async function processStation(station, index, total) {
    console.log(`\n📢 [${index}/${total}] เจาะ: ${station.name}`);
    let browser;
    try {
        browser = await puppeteer.launch(LAUNCH_ARGS);
        const page = await browser.newPage();
        await page.evaluateOnNewDocument(preventCloseScript);

        let streamUrl = null;
        page.on('response', res => {
            const url = res.url();
            if ((url.includes('stream') || url.includes('.mp3') || url.includes('.m3u8')) && !streamUrl) {
                streamUrl = url;
            }
        });

        await page.goto(station.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.evaluate(() => {
            const btn = document.querySelector('button, .play-button, .main-play-button');
            if (btn) btn.click();
        });

        await new Promise(r => setTimeout(r, 6000));
        await browser.close();

        if (streamUrl) {
            console.log(`   └─ 🎉 สำเร็จ: ${streamUrl}`);
            return { name: station.name, url: streamUrl };
        } else {
            console.log(`   └─ ❌ ไม่พบสัญญาณ`);
            return null;
        }
    } catch (e) {
        console.log(`   └─ 💥 Error: ${e.message}`);
        if (browser) await browser.close().catch(() => {});
        return null;
    }
}

// --- รัน ---
async function run() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const url = await new Promise((resolve) => rl.question(`👉 ใส่ลิงก์: `, (ans) => { rl.close(); resolve(ans); }));
    const limit = await new Promise((resolve) => {
        const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl2.question(`👉 ระบุจำนวนสถานี: `, (ans) => { rl2.close(); resolve(ans || "ทั้งหมด"); });
    });

    const stations = await getStationsAfterHeading(url, limit);
    const results = [];

    for (let i = 0; i < stations.length; i++) {
        const result = await processStation(stations[i], i + 1, stations.length);
        if (result) results.push(result);
    }

    const fileName = `Pokemon-results-${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n💾 บันทึกสำเร็จ: ${fileName}`);
    process.exit(0);
}

run();