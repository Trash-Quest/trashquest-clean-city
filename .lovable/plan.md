# ระบบ Zone, Map และ Leaderboard ตามพื้นที่

## 1. Database (migration)

เพิ่มคอลัมน์ในตาราง `reports`:
- `tambon` (text) — ตำบล
- `amphoe` (text) — อำเภอ
- `province` (text) — จังหวัด
- `geocode_source` (text) — เก็บว่ามาจาก nominatim

เพิ่มตารางใหม่ `duplicate_attempts`:
- `user_id`, `lat`, `lng`, `month_key` (เช่น `2026-06`), `attempt_count`
- ใช้นับครั้งที่ถ่ายซ้ำในรัศมี ≤70m ของผู้ใช้รายเดือน

เพิ่ม index พื้นที่บน `reports(lat, lng)` เพื่อ query ระยะทาง

## 2. Flow การถ่าย (ReportPage)

```text
[เริ่มภารกิจ] ──► ขอ GPS รอบ 1 ──► reverse geocode (Nominatim) ──► โชว์ "คุณอยู่ใน ตำบลX อำเภอY จังหวัดZ"
       │
       ▼
[เริ่มถ่าย] ──► ขอ GPS รอบ 2 ──► เช็ค:
       1. ระยะจาก GPS รอบ 1 ต้องไม่เกิน ~200m (กันสลับเครื่อง)
       2. accuracy ≤ 50m
       3. หาจุดเดิมในรัศมี 50–70m ของ user คนนี้:
          - ถ้ามี → +1 ใน attempt_count เดือนนี้
          - ถ้า attempt_count ≥ 4 → block ส่ง บอก "รอเดือนหน้า"
       │
       ▼
[ถ่ายรูป/วิดีโอ] ──► [ส่ง] ──► AI วิเคราะห์ ──► ถ้าผ่าน บันทึก lat/lng + ตำบล/อำเภอ/จังหวัด
```

## 3. หน้า Map (`/map` ใหม่)

- ใช้ **react-leaflet + OpenStreetMap tiles** (ฟรี ไม่ต้อง key)
- แสดงหมุดของผู้ใช้เอง (สีเขียว = ผ่าน)
- toggle ดูหมุดของ "ทั้งตำบล" / "ทั้งจังหวัด"
- คลิกหมุด → popup: วันที่, ประเภทขยะ, แต้ม
- ไม่มี search/route — แค่ดูจุด

## 4. Leaderboard — 3 แท็บ

อัปเดต `/leaderboard` ให้มี Tabs:
- **ตำบล** — top users ในตำบลของผู้ใช้ปัจจุบัน
- **จังหวัด** — top users ในจังหวัด
- **ทั่วประเทศ** — top ทั้งหมด (อันเดิม)

Query group by `province`/`tambon` จาก reports ที่ approved

## 5. รายละเอียดเทคนิค

- **Reverse geocoding**: Nominatim API ฟรี (`nominatim.openstreetmap.org/reverse`) — ต้องตั้ง User-Agent ตาม ToS, จำกัด 1 req/sec → call จาก edge function ใหม่ `reverse-geocode` (กัน rate limit + cache ผลในตาราง `reports`)
- **คำนวณระยะ**: Haversine formula ใน SQL function `distance_meters(lat1,lng1,lat2,lng2)` ใช้ check duplicate
- **Monthly reset**: ไม่ต้อง cron — แค่เช็ค `month_key = to_char(now(),'YYYY-MM')` ทุกครั้ง
- **Libraries เพิ่ม**: `leaflet`, `react-leaflet`, `@types/leaflet`

## 6. ลำดับการทำ

1. Migration (เพิ่มคอลัมน์ + ตาราง + SQL function)
2. Edge function `reverse-geocode`
3. ReportPage — flow 2 ขั้น + เช็ค duplicate
4. หน้า `/map` ใหม่ + ลิงก์ใน nav
5. Leaderboard 3 แท็บ

อนุมัติแผนนี้แล้วผมเริ่มจาก migration ก่อนเลยครับ
