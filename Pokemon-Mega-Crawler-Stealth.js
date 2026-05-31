const puppeteer = require('puppeteer');
const fs = require('fs');

const MAIN_PAGE_URL = 'https://www.radio-thai.com/';
const STATION_LIMIT = 10; // 💡 พี่อยากให้กวาดกี่สถานี ปรับตัวเลขตรงนี้ได้เลยครับ!

async function startUltraStealthCrawl() {
  console.log(`==================================================================`);
  console.log(`===    [Pokemon Ultra Stealth v3.0] โหมดนินจาเรียงตามพิกัดจอ    ===`);
  console.log(`==================================================================\n`);

  console.log(`📡 [สถานะ] 1. กำลังเปิดเบราว์เซอร์จำลองพรางตัวขั้นสูง...`);
  const browser = await puppeteer.launch({ 
    headless: false, // เปิดหน้าต่างให้เห็นจังหวะบอททำงาน
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled' // ลบรอยสักบอท
    ] 
  }); 
  const page = await browser.newPage();

  // สวมหน้ากากเป็นคนปกติบน Windows 11
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  console.log(`📡 [สถานะ] 2. กำลังเดินทางไปหน้ารวมหลัก: ${MAIN_PAGE_URL}`);
  try {
    await page.goto(MAIN_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`📡 [สถานะ] 3. โหลดหน้าหลักสำเร็จ... กำลังรอโครงสร้างกล่องสถานีให้พร้อม...`);
    await new Promise(resolve => setTimeout(resolve, 4000)); // ให้เวลาเว็บประกอบร่างปุ่มสักครู่

    // ⚡ ขั้นตอนเด็ด: ให้บอทกวาดกล่องสถานีทั้งหมดบนจอ เรียงจาก ซ้ายไปขวา และ บนลงล่าง แบบแม่นยำ
    const stations = await page.evaluate(() => {
      // ค้นหากล่องที่เป็นลิงก์สถานีทั้งหมด (หาจากแท็ก <a> ที่ห่อรูปภาพโลโก้ไว้)
      const anchors = Array.from(document.querySelectorAll('a'));
      
      return anchors
        .map(a => {
          const rect = a.getBoundingClientRect();
          let title = a.innerText || '';
          const img = a.querySelector('img');
          if (!title && img) title = img.alt || img.title || '';

          return {
            name: title.replace(/[\n\r]+/g, ' ').trim(),
            pageUrl: a.href || '',
            // เก็บพิกัดตำแหน่งบนหน้าจอเพื่อเช็คตำแหน่ง ซ้าย-ขวา, บน-ล่าง
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX
          };
        })
        .filter(item => {
          const url = item.pageUrl;
          // กรองเอาเฉพาะลิงก์คูหาช่องวิทยุจริง ๆ ไม่เอาหน้าติดต่อหรือนโยบาย
          return url.includes('radio-thai.com/') && 
                 !url.endsWith('radio-thai.com') && 
                 !url.endsWith('radio-thai.com/') &&
                 item.name.length > 2 &&
                 !url.includes('/privacy') && !url.includes('/contact') && !url.includes('/about');
        })
        // 🔥 จัดเรียงลำดับ: บนลงล่าง (top) มาก่อน ถ้าอยู่แถวเดียวกันให้เรียงจาก ซ้ายไปขวา (left)
        .sort((a, b) => {
          if (Math.abs(a.top - b.top) < 15) { // ถ้าระยะความสูงใกล้เคียงกัน ถือว่าอยู่แถวเดียวกัน
            return a.left - b.left; // เรียงจากซ้ายไปขวา
          }
          return a.top - b.top; // เรียงจากบนลงล่าง
        });
    });

    // กรองชื่อที่ซ้ำกันออก
    const uniqueStations = [];
    const seenUrls = new Set();
    for (const st of stations) {
      if (!seenUrls.has(st.pageUrl)) {
        seenUrls.add(st.pageUrl);
        uniqueStations.push(st);
      }
    }

    console.log(`✅ [สถานะ] 4. ตรวจพบสถานีวิทยุจัดเรียงตามลำดับสายตาเรียบร้อย ทั้งหมด ${uniqueStations.length} ช่อง`);
    const targets = uniqueStations.slice(0, STATION_LIMIT);
    console.log(`🎯 [เป้าหมาย] โควตารอบนี้บอทจะลุยเจาะจำนวน ${targets.length} สถานีแรกครับ\n`);

    const finalStationConfig = [];

    // 🚗 เริ่มกระบวนการเจาะเข้าทีละลิงก์ตามลำดับกล่องบนหน้าจอ
    for (let i = 0; i < targets.length; i++) {
      const current = targets[i];
      console.log(`------------------------------------------------------------------`);
      console.log(`🏃‍♂️ [คิวที่ ${i + 1}/${targets.length}] บอทกำลังเคลื่อนที่ไปกล่อง: "${current.name}"`);
      console.log(`📡 [สถานะ] บอทกำลังเปิดแท็บใหม่เพื่อมุดเข้าลิงก์ตรง: ${current.pageUrl}`);
      
      const targetPage = await browser.newPage();
      let detectedStreamUrl = null;

      // กางตาข่ายดักจับสัญญาณเสียงสตรีมมิ่งหลังบ้านของหน้านั้น ๆ
      targetPage.on('response', response => {
        const url = response.url();
        if (url.includes('smartclick') || url.includes('atimeonline') || url.includes('stream') || url.includes('.mp3') || response.request().resourceType() === 'media') {
          if (url.startsWith('http') && !url.includes('.js') && !url.includes('.css') && !url.includes('google')) {
            detectedStreamUrl = url;
          }
        }
      });

      try {
        // วิ่งเข้าหน้าช่องวิทยุโดยตรง ไม่รอโหลดโฆษณาเกิน 10 วินาที
        await targetPage.goto(current.pageUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        console.log(`📡 [สถานะ] แฝงตัวเข้าหน้าเว็บสำเร็จ... กำลังแกล้งทำเป็นเลื่อนหน้าจอเหมือนมนุษย์`);
        
        await targetPage.evaluate(() => window.scrollBy(0, 120));
        await new Promise(resolve => setTimeout(resolve, 3000)); // นั่งรอใจเย็น ๆ 3 วินาที

        // ควานหาปุ่ม Play ทะลวงกำแพง iframe
        console.log(`📡 [สถานะ] กำลังค้นหาตำแหน่งปุ่ม Play หลังกำแพงเว็บ...`);
        const playButtonSelectors = ['.main-play-button', 'button[aria-label*="Play"]', 'button[aria-label*="เล่น"]', '.play-button', '#play', 'button'];
        let clicked = false;
        
        const frames = targetPage.frames();
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
          console.log(`📡 [สถานะ] ไม่เจอโค้ดปุ่มตรง ๆ บอทจะใช้โหมดสุ่มกดพิกัดกลางเครื่องเล่นแทน`);
          await targetPage.mouse.click(400, 360); 
        } else {
          console.log(`📡 [สถานะ] ✅ บอทลอบกดปุ่ม Play เรียบร้อยแล้ว!`);
        }

        // นั่งเฝ้าท่อส่งเสียงสตรีมมิ่ง 5 วินาที
        console.log(`📡 [สถานะ] กำลังกางตาข่ายดักสัญญาณเสียงสตรีมมิ่ง...`);
        let checkAttempts = 0;
        while (!detectedStreamUrl && checkAttempts < 5) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          checkAttempts++;
        }

        if (detectedStreamUrl) {
          const cleanUrl = detectedStreamUrl.split('?')[0];
          console.log(`🎉 [สำเร็จ] ขุดเจอลิงก์สตรีมแท้: \x1b[32m${cleanUrl}\x1b[0m`);
          finalStationConfig.push({ name: current.name, url: cleanUrl });
        } else {
          console.log(`❌ [พลาด] สถานีนี้โดนระบบบล็อก หรือไม่มีสัญญาณเสียงส่งออกมาในรอบนี้`);
        }

      } catch (err) {
        console.log(`💥 [ผิดพลาด] เกิดข้อผิดพลาดระหว่างเจาะระบบช่องนี้: ${err.message}`);
      }

      // ปิดแท็บช่องปัจจุบันทิ้งอย่างนิ่มนวลเพื่อไม่ให้หน่วยความจำเต็ม
      await targetPage.close().catch(() => {});
      console.log(`📡 [สถานะ] พักสายตา 2 วินาที ก่อนสลับไปกล่องถัดไปเพื่อความเนียน...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 🏆 สรุปผลลัพธ์และเซฟไฟล์ลงเครื่อง
    console.log(`\n=================== 🏆 สรุปผลงานล้างกระดานสำเร็จ ===================\n`);
    console.log(JSON.stringify(finalStationConfig, null, 2));
    console.log(`\n==================================================================\n`);

    if (finalStationConfig.length > 0) {
      fs.writeFileSync('pokemon_links.json', JSON.stringify(finalStationConfig, null, 2), 'utf-8');
      console.log(`💾 [ไฟล์] อัปเดตพิกัดลิงก์แท้ทั้งหมดลงไฟล์ 'pokemon_links.json' เรียบร้อยครับพี่!`);
    }

  } catch (mainErr) {
    console.log(`💥 เกิดข้อผิดพลาดร้ายแรงที่หน้าหลัก: ${mainErr.message}`);
  }

  // ปิดระบบทั้งหมดอย่างปลอดภัย
  await browser.close().catch(() => {});
  process.exit(0);
}

startUltraStealthCrawl();