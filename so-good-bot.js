const puppeteer = require('puppeteer');
const fs = require('fs');

const MAIN_PAGE_URL = 'https://www.radio-thai.com/';
const STATION_LIMIT = 10; // 🎯 พี่ปรับตัวเลขเพิ่ม-ลดจำนวนสถานีตรงนี้ได้ตามใจชอบเลยครับ

async function discoverStationsByGrid() {
  console.log(`\n🕵️‍♂️ [Phase 1] นินจาแอบเข้าหน้ารวมหลักเพื่อกวาดพิกัดตามตำแหน่งหน้าจอ (ซ้าย -> ขวา, บน -> ล่าง)...`);
  
  const browser = await puppeteer.launch({ 
    headless: false, // เปิดหน้าต่างสแกนพิกัดให้เห็นแว๊บแรก
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    await page.goto(MAIN_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    console.log(`   └─ 👁️ หน้าเว็บหลักมาแล้ว กำลังดึงและจัดระเบียบลำดับกล่องสถานี...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ดึงลิงก์จากกล่องสี่เหลี่ยมเรียงตามโครงสร้างหน้าจอจริง
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

    // เรียงลำดับตามพิกัดหน้าจอจริง (บนลงล่าง และ ซ้ายไปขวา)
    gridStations.sort((a, b) => {
      if (Math.abs(a.top - b.top) < 40) { 
        return a.left - b.left; 
      }
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

    // 🔥 [จุดแก้บั๊กค้าง Phase 1]: สั่งปิดหน้าแรกทิ้งเบื้องหลังแบบไม่ใส่ await เพื่อไม่ให้ Windows แช่แข็งบอท!
    browser.close().catch(() => {});
    
    console.log(`✅ [Phase 1] สำเร็จ! กวาดคิวรายชื่อมาเข้าระบบได้เรียบร้อยครับ`);
    return uniqueGrid;
  } catch (error) {
    console.log(`💥 [Phase 1] เกิดข้อผิดพลาด: ${error.message}`);
    browser.close().catch(() => {});
    return [];
  }
}

async function crawlMediaUrl(station, index, total) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`🚗 [🔊 คิวที่ ${index}/${total}] กำลังบุกเจาะ: ${station.name}`);
  console.log(`🌐 ลิงก์คูหาจริง: ${station.pageUrl}`);
  console.log(`------------------------------------------------------------`);
  
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
    console.log(`   └─ ⏳ กำลังโหลดหน้าเครื่องเล่นเพลง (จำกัดเวลารอ 10 วินาที)...`);
    await page.goto(station.pageUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    
    console.log(`   └─ 🚶‍♂️ แกล้งขยับหน้าจอเลียนแบบมนุษย์ 2 วินาที...`);
    await page.evaluate(() => window.scrollBy(0, 120));
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`   └─ ⚔️ กำลังสั่งกดปุ่ม Play เพื่อเปิดระบบเสียง...`);
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
      console.log(`   └─ 🎯 สุ่มคลิกพิกัดกลางจอเครื่องเล่นเผื่อไว้...`);
      await page.mouse.click(400, 360); 
    } else {
      console.log(`   └─ ✅ กดปุ่ม Play สำเร็จ!`);
    }

    console.log(`   └─ 🎧 กางตาข่ายดักฟังสายสัญญาณเสียง (รอสัญญาณ 5 วินาที)...`);
    let checkAttempts = 0;
    while (!detectedStreamUrl && checkAttempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      checkAttempts++;
    }

    if (detectedStreamUrl) {
      const cleanUrl = detectedStreamUrl.split('?')[0];
      console.log(`   └─ 🎉 [สำเร็จ] ขุดเจอท่อเสียงสตรีมแท้: \x1b[32m${cleanUrl}\x1b[0m`);
      browser.close().catch(() => {});
      return cleanUrl;
    } else {
      console.log(`   └─ ❌ [พลาด] สถานีนี้ไม่มีสัญญาณเสียงตอบกลับ`);
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
  console.log(`===    [Pokemon Mega Stealth v2.7] เวอร์ชันทลวงล็อกหน้าแรก     ===`);
  console.log(`==================================================================`);

  const sortedStations = await discoverStationsByGrid();
  if (sortedStations.length === 0) {
    console.log("❌ ไม่สามารถดึงรายชื่อแบบเรียงคิวได้ โปรดลองใหม่อีกครั้งครับพี่");
    process.exit(0);
  }

  const targets = sortedStations.slice(0, STATION_LIMIT);
  console.log(`\n🎯 บอทได้คิวเรียงตามหน้าจอภาพของพี่เป๊ะๆ ทั้งหมด ${targets.length} สถานีแรกดังนี้:`);
  targets.forEach((t, idx) => console.log(`   ${idx+1}. ${t.name}`));

  const finalStationConfig = [];

  for (let i = 0; i < targets.length; i++) {
    const streamUrl = await crawlMediaUrl(targets[i], i + 1, targets.length);
    if (streamUrl) {
      finalStationConfig.push({
        name: targets[i].name,
        url: streamUrl
      });
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\n=================== 🏆 สรุปก้อนโค้ดจากตารางหน้า 1 ===================\n`);
  console.log(JSON.stringify(finalStationConfig, null, 2));
  console.log(`\n===================================================================\n`);
  
  fs.writeFileSync('pokemon_links.json', JSON.stringify(finalStationConfig, null, 2), 'utf-8');
  console.log(`💾 อัปเดตรายชื่อและท่อส่งเสียงลงไฟล์ 'pokemon_links.json' เรียบร้อยแล้วครับพี่!`);
  
  setTimeout(() => { process.exit(0); }, 1000);
}

startMegaGridCrawl();