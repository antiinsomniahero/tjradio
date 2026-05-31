// =================================================================
// บอทตรวจเช็คสถานีวิทยุอัตโนมัติ (Pokemon Radio Checker Bot) v3.1
// ชื่อไฟล์: Pokemon.js
// =================================================================

const stationList = [
  { 
    name: "ไฟล์เสียงมิวสิค (ทดสอบระบบบอท)", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
  },
  { 
    name: "Green Wave 106.5 FM", 
    url: "https://atimeonline3.smartclick.co.th/green" // 🔥 ลิงก์ตรงแท้จากบอทสายลับ
  },
  { 
    name: "EFM 94", 
    url: "https://atimeonline3.smartclick.co.th/efm"   // 🔥 ลิงก์ตรงแท้จากบอทสายลับ
  }
];

async function checkStation(station) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(station.url, {
      signal: controller.signal,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Pokemon-Checker/3.1',
        'Accept': '*/*',
        'Range': 'bytes=0-1024' 
      }
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 206) {
      const contentType = response.headers.get('content-type') || '';
      
      if (response.body) {
        const reader = response.body.getReader();
        await reader.cancel(); 
      }

      if (contentType.includes('audio') || contentType.includes('mpeg') || contentType.includes('stream') || contentType.includes('application/octet-stream')) {
        return { name: station.name, status: "🟢 ONLINE" };
      } else {
        return { name: station.name, status: "🟡 WARNING", reason: `ประเภทไม่ใช่เสียง (${contentType})` };
      }
    }
    return { name: station.name, status: "🔴 DEAD", reason: `HTTP Status ${response.status}` };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') return { name: station.name, status: "🔴 DEAD", reason: 'Timeout (เซิร์ฟเวอร์ไม่ตอบสนอง)' };
    return { name: station.name, status: "🔴 DEAD", reason: error.message };
  }
}

async function runPokemonBot() {
  console.log(`\n==================================================`);
  console.log(`=== [Pokemon Bot] เริ่มสำรวจสถานีวิทยุจำนวน ${stationList.length} ช่อง ===`);
  console.log(`==================================================\n`);
  
  for (const station of stationList) {
    process.stdout.write(`คัดกรองโดย Pokemon: ${station.name}... `);
    const result = await checkStation(station);
    console.log(result.status);
    if (result.status !== "🟢 ONLINE" && result.reason) {
      console.log(`   └─ สาเหตุลึกๆ: ${result.reason}`);
    }
  }
  console.log('\n=================== Pokemon สำรวจเสร็จสิ้น ===================\n');
}

runPokemonBot();