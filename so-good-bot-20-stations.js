const puppeteer = require('puppeteer');
const fs = require('fs');

const MAIN_PAGE_URL = 'https://www.radio-thai.com/';

// ฟังก์ชันช่วยทำจังหวะให้เหมือนคน
const humanDelay = () => new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

// --- ฟังก์ชันข้ามหน้า Security Warning ---
async function bypassSecurityWarning(page) {
    try {
        const isWarning = await page.evaluate(() => {
            return document.body.innerText.includes("doesn't support a secure connection") || 
                   document.body.innerText.includes("Not secure");
        });
        
        if (isWarning) {
            console.log(`   └─ 🛡️ [ตรวจพบ] หน้า Security Warning! กำลังกด Continue ให้...`);
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const text = await btn.evaluate(node => node.innerText);
                if (text.includes("Continue to site") || text.includes("Continue")) {
                    await btn.click();
                    await new Promise(r => setTimeout(r, 2000));
                    console.log(`   └─ ✅ [สำเร็จ] ผ่านหน้า Warning แล้ว!`);
                    return true;
                }
            }
        }
    } catch (e) { /* เงียบไว้ */ }
    return false;
}

// --- Phase 1: กวาดพิกัด ---
async function discoverStationsByGrid() {
  console.log(`\n🕵️‍♂️ [Phase 1] กำลังกวาดรายชื่อสถานี...`);
  const browser = await puppeteer.launch({ 
    headless: false, 
    ignoreHTTPSErrors: true, 
    args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-running-insecure-content']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(MAIN_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await humanDelay();

    const gridStations = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
          name: (a.innerText || a.querySelector('img')?.alt || '').replace(/[\n\r]+/g, ' ').trim(),
          pageUrl: a.href || ''
      })).filter(item => item.pageUrl.includes('radio-thai.com/') && item.name.length > 2);
    });

    browser.close().catch(() => {});
    return [...new Map(gridStations.map(item => [item.pageUrl, item])).values()];
  } catch (e) { browser.close(); return []; }
}

// --- Phase 2: เจาะสตรีม ---
async function crawlMediaUrl(station, index, total) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`🚗 [🔊 คิวที่ ${index}/${total}] เจาะสถานี: ${station.name}`);
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    ignoreHTTPSErrors: true, 
    args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-running-insecure-content'] 
  }); 
  let page = await browser.newPage();
  let detectedStreamUrl = null;

  // ดักจับ Network
  page.on('response', response => {
      const url = response.url();
      if ((url.includes('.m3u8') || url.includes('.mp3') || url.includes('stream')) && !detectedStreamUrl) {
          detectedStreamUrl = url;
      }
  });

  try {
    await page.goto(station.pageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    
    // 1. กดข้าม Warning ถ้าเจอ
    await bypassSecurityWarning(page);
    
    // 2. กด Play ครั้งแรก (พร้อมกัน Error เฟรมหาย)
    console.log(`   └─ 👤 [คน] กด Play ครั้งแรก...`);
    const playButtonSelectors = ['.main-play-button', 'button', 'a.play', '#play'];
    
    const safeClick = async (context) => {
        try {
            for (const sel of playButtonSelectors) {
                const btn = await context.$(sel);
                if (btn) { await btn.click().catch(()=>{}); return true; }
            }
        } catch (e) { return false; }
        return false;
    };

    await safeClick(page);
    for (const frame of page.frames()) { await safeClick(frame); }

    // 3. รอ Popup
    const newPage = await new Promise(resolve => {
        browser.once('targetcreated', async (t) => { const p = await t.page(); if(p) resolve(p); });
        setTimeout(() => resolve(null), 4000);
    });

    if (newPage) {
      console.log(`   └─ 🆕 พบ Popup! กดซ้ำหน้าใหม่...`);
      page = newPage;
      await humanDelay();
      await safeClick(page);
    }

    // 4. รอผล
    for(let i=0; i<15; i++) {
        if(detectedStreamUrl) break;
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(detectedStreamUrl ? `   └─ 🎉 สำเร็จ!` : `   └─ ❌ ไม่เจอลิงก์`);
    browser.close();
    return detectedStreamUrl ? detectedStreamUrl.split('?')[0] : null;

  } catch (error) {
    console.log(`   └─ 💥 Error: ${error.message}`);
    browser.close();
    return null;
  }
}

// --- Main ---
async function start() {
  const stations = await discoverStationsByGrid();
  console.log(`พบ ${stations.length} สถานี`);
  const final = [];
  for (let i = 0; i < stations.length; i++) {
      const res = await crawlMediaUrl(stations[i], i + 1, stations.length);
      if(res) final.push({ name: stations[i].name, url: res });
      await new Promise(r => setTimeout(r, 2000)); // พักก่อนเริ่มสถานีถัดไป
  }
  fs.writeFileSync('pokemon_links.json', JSON.stringify(final, null, 2));
  console.log(`\n💾 บันทึกเสร็จแล้ว! ดูผลลัพธ์ได้ที่ไฟล์ 'pokemon_links.json'`);
  process.exit(0);
}

start();