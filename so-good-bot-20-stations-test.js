const puppeteer = require('puppeteer');
const fs = require('fs');

const MAIN_PAGE_URL = 'https://www.radio-thai.com/';
const STATION_LIMIT = 30; // 🎯 ปรับจำนวนสถานีได้ที่นี่

async function discoverStationsByGrid() {
  console.log(`\n🕵️‍♂️ [Phase 1] นินจาแอบเข้าหน้ารวมหลักเพื่อกวาดพิกัดตามตำแหน่งหน้าจอ...`);
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    console.log(`   └─ 🌐 กำลังเดินทางไปที่ ${MAIN_PAGE_URL}...`);
    await page.goto(MAIN_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    
    console.log(`   └─ 👁️ หน้าเว็บหลักมาแล้ว กำลังจัดเรียงลำดับกล่องสถานี...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const gridStations = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors
        .map(a => {
          const img = a.querySelector('img');
          let title = a.innerText || '';
          if (!title && img) title = img.alt || img.title || '';
          const rect = a.getBoundingClientRect();
          return {
            name: title.replace(/[\n\r]+/g, ' ').trim(),
            pageUrl: a.href || '',
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX
          };
        })
        .filter(item => {
          const url = item.pageUrl;
          return url.includes('radio-thai.com/') && 
                 !url.endsWith('radio-thai.com') && 
                 !url.endsWith('radio-thai.com/') &&
                 item.name.length > 2 &&
                 !url.includes('/privacy') && !url.includes('/contact') && !url.includes('/about') &&
                 item.top > 100;
        });
    });

    gridStations.sort((a, b) => {
      if (Math.abs(a.top - b.top) < 40) return a.left - b.left; 
      return a.top - b.top; 
    });

    const uniqueGrid = [];
    const seenUrls = new Set();
    for (const st of gridStations) {
      if (!seenUrls.has(st.pageUrl)) {
        seenUrls.add(st.pageUrl);
        uniqueGrid.push({ name: st.name, pageUrl: st.pageUrl });
      }
    }

    // 🔥 ปิดเบราว์เซอร์ Phase 1 แบบไม่ใส่ await เพื่อป้องกันการแช่แข็ง
    browser.close().catch(() => {});
    
    console.log(`   └─ ✅ [Phase 1] กวาดพิกัดสำเร็จ พบสถานี ${uniqueGrid.length} ช่อง`);
    return uniqueGrid;
  } catch (error) {
    console.log(`   └─ 💥 [Phase 1] ผิดพลาด: ${error.message}`);
    browser.close().catch(() => {});
    return [];
  }
}

async function crawlMediaUrl(station, index, total) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`🚗 [🔊 คิวที่ ${index}/${total}] กำลังบุกเจาะ: ${station.name}`);
  console.log(`🌐 ลิงก์คูหาจริง: ${station.pageUrl}`);
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
  }); 
  const page = await browser.newPage();
  let detectedStreamUrl = null;

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  page.on('response', response => {
    const url = response.url();
    if (url.includes('smartclick') || url.includes('atimeonline') || url.includes('stream') || url.includes('icecast') || url.includes('.mp3') || response.request().resourceType() === 'media') {
      if (url.startsWith('http') && !url.includes('.js') && !url.includes('.css') && !url.includes('google')) {
        detectedStreamUrl = url;
      }
    }
  });

  try {
    console.log(`   └─ ⏳ กำลังโหลดหน้าเครื่องเล่นเพลง...`);
    await page.goto(station.pageUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    
    console.log(`   └─ 🚶‍♂️ ขยับเมาส์/เลื่อนจอเลียนแบบมนุษย์...`);
    await page.evaluate(() => window.scrollBy(0, 120));
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`   └─ ⚔️ สั่งกดปุ่ม Play เพื่อเปิดระบบเสียง...`);
    const playButtonSelectors = ['.main-play-button', 'button[aria-label*="Play"]', 'button[aria-label*="เล่น"]', '.play-button', '#play', 'button'];
    let clicked = false;
    
    const frames = page.frames();
    for (const frame of frames) {
      for (const selector of playButtonSelectors) {
        try {
          const btn = await frame.$(selector);
          if (btn) {
            await btn.click();
            clicked = true;
            break;
          }
        } catch (e) {}
      }
      if (clicked) break;
    }

    if (!clicked) {
      console.log(`   └─ 🎯 ปุ่มไม่ชัดเจน บอทขอสุ่มคลิกพิกัดกลางจอ...`);
      await page.mouse.click(400, 360); 
    } else {
      console.log(`   └─ ✅ กดปุ่ม Play สำเร็จ!`);
    }

    console.log(`   └─ 🎧 กางตาข่ายดักสัญญาณ (รอ 10 วินาที)...`);
    let checkAttempts = 0;
    while (!detectedStreamUrl && checkAttempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      checkAttempts++;
    }

    if (detectedStreamUrl) {
      const cleanUrl = detectedStreamUrl.split('?')[0];
      console.log(`   └─ 🎉 [สำเร็จ] ได้รับสัญญาณ: ${cleanUrl}`);
      browser.close().catch(() => {});
      return cleanUrl;
    } else {
      console.log(`   └─ ❌ [ล้มเหลว] สถานีนี้เงียบสนิทหรือระบบบล็อก`);
      browser.close().catch(() => {});
      return null;
    }
  } catch (error) {
    console.log(`   └─ 💥 ข้อผิดพลาดในคิวนี้: ${error.message}`);
    browser.close().catch(() => {});
    return null;
  }
}

async function startMegaGridCrawl() {
  console.log(`==================================================================`);
  console.log(`===    [Pokemon Mega Stealth v2.7] บอทเริ่มปฏิบัติการถล่มคิว    ===`);
  console.log(`==================================================================`);

  const sortedStations = await discoverStationsByGrid();
  if (sortedStations.length === 0) {
    console.log("❌ ไม่สามารถดึงรายชื่อได้ โปรดลองใหม่อีกครั้งครับพี่");
    process.exit(0);
  }

  const targets = sortedStations.slice(0, STATION_LIMIT);
  console.log(`\n🎯 พบ ${targets.length} สถานีในแถวแรกๆ เตรียมบุก...`);
  targets.forEach((t, idx) => console.log(`   ${idx+1}. ${t.name}`));

  const finalStationConfig = [];

  for (let i = 0; i < targets.length; i++) {
    const streamUrl = await crawlMediaUrl(targets[i], i + 1, targets.length);
    if (streamUrl) {
      finalStationConfig.push({ name: targets[i].name, url: streamUrl });
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\n=================== 🏆 สรุปผลการปฏิบัติภารกิจ ===================\n`);
  console.log(JSON.stringify(finalStationConfig, null, 2));
  console.log(`\n===================================================================\n`);
  
  fs.writeFileSync('pokemon_links.json', JSON.stringify(finalStationConfig, null, 2), 'utf-8');
  console.log(`💾 บันทึกท่อส่งเสียงลงไฟล์ 'pokemon_links.json' เรียบร้อยครับพี่!`);
  
  setTimeout(() => { process.exit(0); }, 1000);
}

startMegaGridCrawl();