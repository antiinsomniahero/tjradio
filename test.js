const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getStationsAfterHeading(targetUrl, limit) {
    console.log(`\n🕵️‍♂️ [Phase 1] นินจาเข้าหน้ารวม และกำลังกวาดรายชื่อ...`);
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
    });
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // คำสั่งคัดกรอง: หาหัวข้อ -> แล้วกวาดเฉพาะที่อยู่ใต้หัวข้อนั้น
    const stations = await page.evaluate((limit) => {
        const headingText = "สถานีวิทยุออนไลน์ไทย 24 ชั่วโมง";
        // หาหัวข้อที่ตรงกับชื่อที่พี่ระบุ
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, strong, span'));
        const targetHeading = headings.find(h => h.innerText.includes(headingText));
        
        if (!targetHeading) return [];
        
        const headingBottom = targetHeading.getBoundingClientRect().bottom;
        const anchors = Array.from(document.querySelectorAll('a'));
        
        return anchors
            .map(a => ({ 
                name: (a.innerText || a.querySelector('img')?.alt || '').trim(), 
                url: a.href, 
                top: a.getBoundingClientRect().top 
            }))
            // กรอง: ต้องมีชื่อ, ต้องเป็นลิงก์สถานี และต้องอยู่ใต้หัวข้อ
            .filter(i => i.name.length > 2 && i.url.includes('radio-thai.com/') && i.top > headingBottom)
            .slice(0, limit);
    }, limit);

    await browser.close();
    console.log(`✅ [Phase 1] พบสถานีตามเป้าหมายจำนวน ${stations.length} ช่อง`);
    return stations;
}

async function processStation(station, index, total) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`📢 [สถานะ] กำลังลุยคิวที่ ${index}/${total}: ${station.name}`);
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
    });
    const page = await browser.newPage();
    let streamUrl = null;

    // ดักฟังท่อเสียง
    page.on('response', res => {
        const url = res.url();
        if ((url.includes('smartclick') || url.includes('stream') || url.includes('.mp3')) && !streamUrl) {
            streamUrl = url;
        }
    });

    try {
        console.log(`   └─ 🌐 กำลังเข้าลิงก์: ${station.url}`);
        await page.goto(station.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        console.log(`   └─ ⚔️ กดปุ่มเล่นเพลง...`);
        await page.evaluate(() => {
            const btn = document.querySelector('button, .play-button, .main-play-button');
            if (btn) btn.click();
        });

        console.log(`   └─ ⏳ รอตรวจสอบสัญญาณ 5 วินาที...`);
        await new Promise(r => setTimeout(r, 5000));
        
        if (streamUrl) {
            console.log(`   └─ 🎉 [สำเร็จ] ได้ลิงก์เสียง: ${streamUrl}`);
        } else {
            console.log(`   └─ ❌ [ไม่สำเร็จ] ไม่พบสัญญาณเสียง`);
        }
    } catch (e) {
        console.log(`   └─ 💥 [Error] ${e.message}`);
    }
    
    await browser.close();
    return streamUrl ? { name: station.name, url: streamUrl } : null;
}

async function run() {
    const url = await askQuestion("👉 ใส่ลิงก์หน้ารวมสถานี: ");
    const limit = parseInt(await askQuestion("👉 ต้องการเจาะกี่สถานี (ตัวเลข): "));

    const stations = await getStationsAfterHeading(url, limit);
    const results = [];

    for (let i = 0; i < stations.length; i++) {
        const result = await processStation(stations[i], i + 1, stations.length);
        if (result) results.push(result);
    }

    fs.writeFileSync('pokemon_links.json', JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n============================================================`);
    console.log(`💾 [งานเสร็จสิ้น] ข้อมูลถูกบันทึกลงไฟล์ 'pokemon_links.json'`);
    console.log(`============================================================`);
    rl.close();
    process.exit(0);
}

run();