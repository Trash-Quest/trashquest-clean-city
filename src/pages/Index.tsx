import { Button } from "@/components/ui/button";
import {
  Trash2, Wind, Frown, MapPin, Trophy, ScanLine, Camera, CheckCircle2,
  Gift, Users, Building2, Play, Download, Leaf, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import heroPhone from "@/assets/hero-phone.png";
import solMap from "@/assets/sol-map.png";
import solGame from "@/assets/sol-game.png";
import solAi from "@/assets/sol-ai.png";

const Index = () => {
  const { user } = useAuth();
  const startHref = user ? "/report" : "/auth";
  return (
    <div className="min-h-screen bg-background text-ink">
      <AppHeader />


      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-trash-pattern opacity-70" aria-hidden />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-green-soft blur-3xl" aria-hidden />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand-amber-soft blur-3xl" aria-hidden />
        <div className="container relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green-soft px-4 py-1.5 text-sm font-semibold text-brand-green">
              <span className="h-2 w-2 rounded-full bg-brand-green" /> Civic Tech for Cleaner Cities
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              เปลี่ยน<span className="relative inline-block">
                <span className="relative z-10">ขยะ</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-4 bg-brand-amber/60" aria-hidden />
              </span>
              <br />ให้เป็น<span className="text-brand-green">แต้ม</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
              Turn trash into rewards. Clean your city.{" "}
              <span className="font-semibold text-ink">Breathe better air.</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to={startHref}>
                <Button variant="hero" size="xl">
                  เริ่มภารกิจ <ArrowRight />
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="ghostInk" size="xl">
                  <Trophy /> ดูอันดับ
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-ink-soft">
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-9 rounded-full border-2 border-background"
                    style={{
                      background: i % 2 ? "hsl(var(--brand-amber))" : "hsl(var(--brand-green))",
                    }}
                  />
                ))}
              </div>
              <span><span className="font-bold text-ink">80,000+</span> นักล่าขยะทั่วประเทศ</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-8 -z-0 rounded-[3rem] bg-brand-green/10" aria-hidden />
            <img
              src={heroPhone}
              alt="แผนที่จุดขยะและคุณภาพอากาศในแอป TrashQuest"
              width={1024}
              height={1024}
              className="relative z-10 mx-auto w-full max-w-md drop-shadow-2xl"
            />
            <div className="absolute -left-2 top-12 z-20 hidden rounded-2xl border border-ink/10 bg-background px-4 py-3 shadow-xl sm:block">
              <div className="text-xs font-medium text-ink-soft">AQI ใกล้คุณ</div>
              <div className="text-2xl font-extrabold text-brand-green">42 · ดี</div>
            </div>
            <div className="absolute -right-2 bottom-16 z-20 hidden rounded-2xl border border-ink/10 bg-background px-4 py-3 shadow-xl sm:block">
              <div className="text-xs font-medium text-ink-soft">แต้มวันนี้</div>
              <div className="text-2xl font-extrabold text-brand-amber">+ 320</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="border-y border-ink/10 bg-secondary/40 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-amber">The Problem</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">เมืองของเรากำลังป่วย</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Trash2, title: "ขยะล้นเมือง", desc: "ส่งกลิ่นเหม็น สะสมตามตรอกซอกซอย ไม่มีใครเก็บ" },
              { icon: Wind, title: "อากาศเสีย", desc: "ฝุ่น PM 2.5 เกินค่ามาตรฐาน ทำลายสุขภาพทุกวัน" },
              { icon: Frown, title: "แอปเดิมๆ น่าเบื่อ", desc: "รายงานแล้วเงียบ ไม่มีแรงจูงใจ ไม่เห็นผล" },
            ].map((card, i) => (
              <div
                key={i}
                className="group rounded-3xl border border-ink/10 bg-background p-8 transition hover:-translate-y-1 hover:border-brand-amber/40 hover:shadow-xl"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-amber-soft text-brand-amber">
                  <card.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 text-2xl font-bold">{card.title}</h3>
                <p className="mt-2 text-ink-soft">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section id="solution" className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-green">Our Solution</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
              เกม + แผนที่ + AI = เมืองสะอาด
            </h2>
          </div>

          <div className="mt-16 space-y-24">
            {[
              {
                tag: "01 · Smart Hybrid Map",
                title: "แผนที่เรียลไทม์ ขยะ + AQI",
                desc: "เห็นจุดขยะรอบตัวคุณ พร้อมค่าฝุ่น PM 2.5 อัพเดทแบบสด เลือกภารกิจที่ใกล้และเร่งด่วนที่สุด",
                bullets: ["จุดขยะ Crowdsource", "AQI ทุก 1 กม.", "แนะนำเส้นทาง"],
                img: solMap,
              },
              {
                tag: "02 · Cleanup Gamification",
                title: "ภารกิจ ทีม เลเวล รางวัล",
                desc: "เก็บขยะได้แต้ม สะสมเลเวล รวมทีมกับเพื่อน แข่งขันกับชุมชน แลกของรางวัลจากแบรนด์ที่คุณรัก",
                bullets: ["Daily Quest", "Team Battle", "Reward Shop"],
                img: solGame,
              },
              {
                tag: "03 · AI Verification",
                title: "ตรวจสอบรูป Before/After + GPS",
                desc: "AI ของเราตรวจสอบรูปก่อน-หลังทำความสะอาด ยืนยันด้วย GPS กันโกง 100% โปร่งใส น่าเชื่อถือ",
                bullets: ["Image Diff AI", "GPS Lock", "Anti-Cheat"],
                img: solAi,
              },
            ].map((s, i) => (
              <div
                key={i}
                className={`grid items-center gap-12 lg:grid-cols-2 ${
                  i % 2 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <span className="text-sm font-bold tracking-widest text-brand-amber">{s.tag}</span>
                  <h3 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">{s.title}</h3>
                  <p className="mt-4 text-lg text-ink-soft">{s.desc}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {s.bullets.map((b) => (
                      <li
                        key={b}
                        className="rounded-full bg-brand-green-soft px-4 py-1.5 text-sm font-semibold text-brand-green"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative">
                  <div className="absolute inset-4 -z-0 rounded-[2.5rem] bg-secondary/60" aria-hidden />
                  <img
                    src={s.img}
                    alt={s.title}
                    width={900}
                    height={700}
                    loading="lazy"
                    className="relative z-10 mx-auto w-full max-w-lg"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-ink/10 bg-ink py-24 text-background">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-amber">How it works</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">4 ขั้นตอน เริ่มเก็บแต้ม</h2>
          </div>

          <div className="relative mt-16">
            <div
              className="absolute left-0 right-0 top-9 hidden h-0.5 bg-background/15 lg:block"
              aria-hidden
            />
            <div className="grid gap-10 lg:grid-cols-4">
              {[
                { n: "1", icon: MapPin, title: "เปิดแอป", desc: "ดูจุดขยะใกล้บ้านบนแผนที่" },
                { n: "2", icon: Camera, title: "ถ่าย Before", desc: "ไปยังจุด ถ่ายรูปก่อนเก็บ" },
                { n: "3", icon: ScanLine, title: "ถ่าย After", desc: "AI ตรวจสอบความสะอาด" },
                { n: "4", icon: Gift, title: "รับแต้ม", desc: "แลกของรางวัลจากพาร์ตเนอร์" },
              ].map((s) => (
                <div key={s.n} className="relative text-center">
                  <div className="relative mx-auto grid h-[72px] w-[72px] place-items-center rounded-2xl bg-brand-amber text-ink shadow-[0_8px_0_0_hsl(var(--brand-amber)/0.4)]">
                    <s.icon className="h-7 w-7" />
                    <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-green text-xs font-extrabold text-brand-green-foreground">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-background/70">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impact" className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-green">Real Impact</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">ตัวเลขที่เปลี่ยนเมือง</h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: "5,000+", l: "จุดขยะถูกเก็บ" },
              { v: "120 ตัน", l: "CO₂ ลดลง" },
              { v: "80,000", l: "ผู้ใช้งาน" },
              { v: "200+", l: "แบรนด์พาร์ตเนอร์" },
            ].map((s, i) => (
              <div
                key={i}
                className={`rounded-3xl p-8 text-center ${
                  i % 2 ? "bg-brand-amber-soft" : "bg-brand-green-soft"
                }`}
              >
                <div
                  className={`font-display text-5xl font-extrabold ${
                    i % 2 ? "text-brand-amber" : "text-brand-green"
                  }`}
                >
                  {s.v}
                </div>
                <div className="mt-2 font-semibold text-ink">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="border-t border-ink/10 bg-secondary/40 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-amber">For Everyone</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">ใครเหมาะกับ TrashQuest?</h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border-2 border-brand-green/20 bg-background p-10">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-green text-brand-green-foreground">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="mt-6 font-display text-3xl font-extrabold">สำหรับ Users</h3>
              <p className="mt-2 text-ink-soft">Gen Z · นักศึกษา · อาสาสมัคร</p>
              <p className="mt-4 text-ink-soft">
                ทำดีต่อเมือง ได้สนุกและของรางวัลกลับบ้าน เจอเพื่อนใหม่ในชุมชนนักล่าขยะ
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["🎮 Fun", "🎁 Rewards", "👥 Community"].map((b) => (
                  <span
                    key={b}
                    className="rounded-full bg-brand-green-soft px-4 py-1.5 text-sm font-semibold text-brand-green"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border-2 border-brand-amber/30 bg-background p-10">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-amber text-brand-amber-foreground">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="mt-6 font-display text-3xl font-extrabold">สำหรับ Partners</h3>
              <p className="mt-2 text-ink-soft">เทศบาล · บริษัท CSR · โรงงานรีไซเคิล</p>
              <p className="mt-4 text-ink-soft">
                เข้าถึงข้อมูลขยะแบบ Real-time วัด Impact ได้จริง รายงาน ESG น่าเชื่อถือ
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["📊 Data", "🌍 Impact", "🏆 ESG"].map((b) => (
                  <span
                    key={b}
                    className="rounded-full bg-brand-amber-soft px-4 py-1.5 text-sm font-semibold text-brand-amber"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="bg-brand-green py-24 text-brand-green-foreground">
        <div className="container text-center">
          <CheckCircle2 className="mx-auto h-12 w-12" />
          <h2 className="mt-6 font-display text-4xl font-extrabold sm:text-6xl">
            พร้อมเริ่มภารกิจแล้วหรือยัง?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-green-foreground/85">
            Join 80,000+ people turning their cities cleaner — one piece of trash at a time.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to={startHref}>
              <Button variant="amber" size="xl">
                <Camera /> เริ่มรายงานขยะ
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button
                variant="outline"
                size="xl"
                className="border-2 border-brand-green-foreground/30 bg-transparent text-brand-green-foreground hover:bg-brand-green-foreground/10 hover:text-brand-green-foreground"
              >
                <Trophy /> Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/10 py-10">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-ink-soft sm:flex-row">
          <div className="flex items-center gap-2 font-display font-extrabold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-green text-brand-green-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            TrashQuest
          </div>
          <p>© {new Date().getFullYear()} TrashQuest · Mission for cleaner cities.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
