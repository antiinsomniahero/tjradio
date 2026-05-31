const puppeteer = require('puppeteer');
const fs = require('fs');

const STATION_LIMIT = 3; // 💡 ทดสอบแค่ 3 สถานีแรกพอครับ ดูว่าหน้ากากนินจาเราผ่านด่านตรวจไหม

const targetStations = [
  { name: "Green Wave 106.5 FM", pageUrl: "https://www.radio-thai.com/greenwave" },
  { name: "EFM 94", pageUrl: "https://www.radio-thai.com/efm" },
  { name: "Chill Online", pageUrl: "https://www.radio-thai.com/chill-online" }
];

async function crawlMediaWithStealth(station, index, total) {
  console.log(`\n🥷 [${index}/${total}] นินจาแฝงตัวเข้าจับพิกัด: ${station.name}...`);
  
  const browser = await puppeteer.launch({ 
    headless: false, // 💡 เปิดหน้าต่างไว้ พี่ลองช่วยสังเกตหน้าจอด้วยนะครับว่ามันติดหน้า Captcha ไหม
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled' // 🔥 ทุบสวิตช์แจ้งเตือนความเป็นบอททิ้ง!
    ] 
  }); 
  const page = await browser.newPage();
  let detectedStreamUrl = null;

  // 1. สวมหน้ากาก User-Agent ของมนุษย์กินเงินเดือนปกติทั่วไป
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // 2. ลบรอยสักบอท (Navigator WebDriver) ออกจากความทรงจำเบราว์เซอร์
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // ตาข่ายดักจับสายสตรีมมิ่ง
  page.on('response', response => {
    const url = response.url();
    if (url.includes('smartclick') || url.includes('atimeonline') || url.includes('stream') || url.includes('.mp3') || response.request().resourceType() === 'media') {
      if (url.startsWith('http') && !url.includes('.js') && !url.includes('.css') && !url.includes('google')) {
        detectedStreamUrl = url;
      }
    }
  });

  try {
    // โหลดหน้าเว็บแบบใจเย็นๆ รอ 10 วินาที
    await page.goto(station.pageUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    
    // 💡 ทำพฤติกรรมเลียนแบบมนุษย์: ขยับหน้าจอและนั่งรอ 3 วินาที เหมือนกำลังอ่านเนื้อหา
    await page.evaluate(() => window.scrollBy(0, 100));
    await new Promise(resolve => setTimeout(resolve, 3000));

    // มุดเจาะหาปุ่มคลิกเล่นเพลง
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
      // คลิกพิกัดสุ่มตรงจุดเครื่องเล่น
      await page.mouse.click(400, 360); 
    } else {
      console.log(`   └─ ✅ นินจาแอบกดปุ่ม Play โดยไม่มีใครรู้ตัว!`);
    }

    // ยืนรอสตรีมพ่นข้อมูลใส่กระเป๋า 6 วินาที
    let checkAttempts = 0;
    while (!detectedStreamUrl && checkAttempts < 6) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      checkAttempts++;
    }

    if (detectedStreamUrl) {
      const cleanUrl = detectedStreamUrl.split('?')[0];
      console.log(`   └─ 🎉 นินจาเจาะท่อสำเร็จได้ลิงก์แท้: \x1b[32m${cleanUrl}\x1b[0m`);
      browser.close().catch(() => {});
      return cleanUrl;
    } else {
      console.log(`   └─ ❌ รอบนี้โดน Server ดักทาง หรือสัญญาณไม่ตอบกลับ`);
      browser.close().catch(() => {});
      return null;
    }

  } catch (error) {
    console.log(`   └─ 💥 พลาดท่า: ${error.message}`);
    browser.close().catch(() => {});
    return null;
  }
}

async function startStealthCrawl() {
  console.log(`==================================================`);
  console.log(`===   [Pokemon Mega Crawler v2.5] โหมดนินจาพรางตัว ===`);
  console.log(`==================================================\n`);

  const finalStationConfig = [];

  for (let i = 0; i < targetStations.length; i++) {
    const streamUrl = await crawlMediaWithStealth(targetStations[i], i + 1, targetStations.length);
    if (streamUrl) {
      finalStationConfig.push({
        name: targetStations[i].name,
        url: streamUrl
      });
    }
    // เว้นจังหวะหายใจ 2 วินาทีก่อนไปสถานีถัดไป ไม่ให้ Server เอะใจ
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n=================== 🏆 สรุปผลงานนินจา ===================\n`);
  console.log(JSON.stringify(finalStationConfig, null, 2));
  console.log(`\n========================================================\n`);
  
  process.exit(0);
}

startStealthCrawl();