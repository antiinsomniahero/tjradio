import urllib.request
import os
import zipfile

# 1. กำหนดโครงสร้างโฟลเดอร์ปลายทางตามที่ต้องการ (media/radios-150px)
target_folder = os.path.join("media", "radios-150px")
zip_filename = "radios-150px.zip"

if not os.path.exists(target_folder):
    os.makedirs(target_folder)

# ข้อมูลจับคู่ URL เดิม กับ ชื่อไฟล์ใหม่ (อิงจากชื่อช่องจริงและแปลงเป็น Eng ล่าสุด)
logos = [
    # --- รายการสถานีวิทยุหลัก (60 ช่อง) ---
    {"url": "https://static.mytuner.mobi/media/radios-150px/KvDHAwT62s.png", "filename": "cool-93.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/815/green-wave-1065-fm.ea9ba6a2.jpg", "filename": "greenwave.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/yevk8f78cyqr.jpeg", "filename": "flex-1045-fm.jpeg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/vxc3vq6dxy8j.jpeg", "filename": "90-rakthai.jpeg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/379/fm-95-luukthungmhaankhr-smth.fce400b5.png", "filename": "ltmfm95.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/973/fm99-active-radio.fb3cd8bf.png", "filename": "fm99.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/367/fm-965-khluuenkhwaamkhid-thinking-radio.c01e225c.png", "filename": "fm-965.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/RKj5SekkUY.png", "filename": "request-radio-music.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/178/935-top-radio-fm.80355d64.png", "filename": "935-top-radio-fm.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/Ck8sVEmWdv.jpeg", "filename": "efm.jpeg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/446/ephlngstringekaa-eingdoi-radio.79ee6ee7.jpg", "filename": "eingdoi-radio.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/Shf4dp98ac.png", "filename": "request-radio-forlife.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/662/great-93.a0cb964a.png", "filename": "great-93.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/369/met-107-fm.e754f3fd.jpg", "filename": "met-107.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/bk6a8wzk9wsr.png", "filename": "luukthungentewir-looktung-network.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/GSJSFuqNnJ.png", "filename": "request-radio-country-music.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/272/talay-9025.c2ab9312.png", "filename": "talay-9025.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/181/106-khrbkhrawkhaaw.7d16a7d7.png", "filename": "106familynews.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/95eeadbawa4q.png", "filename": "buymaa-phandwng.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/ptshgz8bvtsk.jpeg", "filename": "fm91.jpeg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/228/bp-radio-hd.2fbc8388.jpg", "filename": "bp-radio-hd.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/fzc5x62n4qk8.jpg", "filename": "yesterday-1065-fm.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/78dwuzgjfqmh.png", "filename": "sthaaniiwithuyswnphuumiphaakh-mcot-radio-lampaang.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/pFkhvW6wPL.png", "filename": "request-radio-international-music.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/dqhdnczntxrn.png", "filename": "yes-radio-thai-family-th-only.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/nb2ery3pqq9y.png", "filename": "sthaaniiwithuyswnphuumiphaakh-mcot-radio-echiiyngaihm.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/32nfvg7pxmdt.png", "filename": "the-shock-fm101.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/282/string-wowradio.6ca455bf.jpg", "filename": "string-wowradio.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/dkbtbmamjlxr.png", "filename": "ephlngluukthunghmlam-kantruem-aithylaannaaerdio.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/fupLAccBRh.png", "filename": "ondio-new.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/naazdc5h6kuz.png", "filename": "98-iisaan-efem.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/gcevqeh6xptz.png", "filename": "thai-music.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/260/fm91-pattaya-mun-d.3630640c.png", "filename": "fm91-pattaya-mundee.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/epechblwdmx9.png", "filename": "cu-radio.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/470/js-100-radio.425b78b2.jpg", "filename": "js100.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/e6qvtshx8e64.png", "filename": "sthaaniiwithuyswnphuumiphaakh-mcot-radio-echiiyngraay.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/fANqGSV3WH.png", "filename": "munforward-xtra.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/rt8MwG59Av.jpg", "filename": "hotwave-online.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/004/luukthungaihm-885-wow-radio-cchanghwadaephr.193af252.jpg", "filename": "wow-radio.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/5qHHXe7LRX.png", "filename": "munfoward.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/7CdaEWFPHD.png", "filename": "mcot-modern-radio.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/156/city-radio-pattaya.ea03ead4.png", "filename": "city-radio-pattaya.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/972/rad-radio-895.bfe6a248.jpg", "filename": "rad-radio-895.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/dlaqq6tswujg.png", "filename": "wat.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/226/friends-bangkok.47f2124f.png", "filename": "friends-bangkok.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/wryg76p7ebax.png", "filename": "request-radio-dancemix.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/345/smooth-fm-1055.754ab47c.png", "filename": "smooth-fm-1055.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/b5xenqq4q4kv.jpg", "filename": "ephlngluukthung-cchakkacchiierdio.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/wbu3vFWvq4.png", "filename": "mcot-radio-1020-fm-surat-thani.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/682/great-online-thailand.782a3dd3.png", "filename": "great-online2.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/580/swthsngkhlaa-fm-905-mhz-radiothailand.95aec903.jpg", "filename": "swthsngkhlaa-fm-905-mhz-radiothailand.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/ltwwznwtmq8e.jpg", "filename": "wadpaaaithrngaam-wat-sai-ngam.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/kD8W96emy7.jpg", "filename": "102-radio-sthaaniiwithyukracchaayesiiyng-khsthb.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/japcrdy9nsfm.png", "filename": "ephlngluukthung-laannaaerdio.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/452/surf-1025-fm.f2a7db1b.png", "filename": "surf-1025-fm.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/328/905-smart-news-mitikhaaw.b742cb9c.jpg", "filename": "smart-news.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/043/ephlngluukthung-huahin-radio.c6db6f26.png", "filename": "huahinmusic-radio.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/rvk9j5ak7cqs.jpeg", "filename": "fm102-khluuenkhnthamngaan.jpeg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/npf98zpgecxc.png", "filename": "sthaaniiwithuyswnphuumiphaakh-mcot-radio-buriiramy.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/187/musichitz-radio-inter.1312996b.jpg", "filename": "musichitz-radio-inter.jpg"},
    
    # --- รายการสถานีวิทยุแนะนำ (Featured - 17 ช่อง) ---
    {"url": "https://static.mytuner.mobi/media/radios-150px/680/wonder-80s.46eec212.jpg", "filename": "wonder-80s.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/007/recuerda.ec023a93.png", "filename": "recuerda.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/679/classic-rock-station.3a3fd1f7.png", "filename": "classic-rock-station.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/248/tiktok-hits.08ab6d31.png", "filename": "tiktok-hits.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/003/romantic-vibes.e695b56b.png", "filename": "romantic-vibes.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/676/groov-smooth-jazz.7d0b32ad.png", "filename": "groov-smooth-jazz.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/672/love-90s-portugal.6f1135d3.png", "filename": "love-90s.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/918/beam-fm-adult-hits.f507af17.jpg", "filename": "beam-fm-adult-hits.jpg"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/006/country-vibes.daa4c6e0.png", "filename": "country-vibes.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/004/chillout-vibes.c101d07e.png", "filename": "chillout-vibes.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/677/rewind-2000s.24e9977a.png", "filename": "rewind-2000s.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/251/k-pop-vibes.3f09ab2f.png", "filename": "k-pop-vibes.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/673/bandida.9e68a0a7.png", "filename": "bandida.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/984/beam-fm.edf8798f.png", "filename": "beam-fm.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/005/oldies-vibes.89fd564b.png", "filename": "oldies-vibes.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/252/lofi-vibes.b91edb9c.png", "filename": "lofi-vibes.png"},
    {"url": "https://static.mytuner.mobi/media/radios-150px/674/dance-machine.c990d6cc.png", "filename": "dance-machine.png"}
]

# 2. ทำการดาวน์โหลดโลโก้ลงโฟลเดอร์ media/radios-150px
print(f"กำลังเริ่มดาวน์โหลดโลโก้ทั้งหมด {len(logos)} ไฟล์...")
downloaded_files = []

for item in logos:
    filepath = os.path.join(target_folder, item['filename'])
    try:
        req = urllib.request.Request(item['url'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
            out_file.write(response.read())
        print(f"✅ Downloaded: {item['filename']}")
        downloaded_files.append(filepath)
    except Exception as e:
        print(f"❌ Error ({item['filename']}): {e}")

# 3. ทำการบีบอัดโฟลเดอร์ media/radios-150px ให้เป็นไฟล์ ZIP
print("\nกำลังเริ่มการบีบอัดไฟล์ให้อยู่ในรูปแบบ ZIP...")
try:
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("media"):
            for file in files:
                file_path = os.path.join(root, file)
                # รักษาโครงสร้างโฟลเดอร์ภายในไฟล์ ZIP ให้เป็น media/radios-150px/ไฟล์
                zipf.write(file_path, file_path)
    print(f"📦 สำเร็จ! ไฟล์ ZIP ถูกบันทึกเรียบร้อยที่: {os.path.abspath(zip_filename)}")
except Exception as e:
    print(f"❌ เกิดข้อผิดพลาดระหว่างบีบอัดไฟล์ ZIP: {e}")

print("\n--- เสร็จสิ้นกระบวนการทั้งหมด ---")