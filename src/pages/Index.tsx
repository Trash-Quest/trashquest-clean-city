import { Button } from "@/components/ui/button";
import {
  Trash2, Wind, Frown, MapPin, Trophy, ScanLine, Camera, CheckCircle2,
  Gift, Users, Building2, Play, Download, ArrowRight, Map as MapIcon,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { HeroMap } from "@/components/HeroMap";
import { useAuth } from "@/contexts/AuthContext";
import { useHeroStats } from "@/hooks/useHeroStats";
import solMap from "@/assets/sol-map.png";
import solGame from "@/assets/sol-game.png";
import solAi from "@/assets/sol-ai.png";
import heroImpact from "@/assets/hero-impact.jpg";

const Index = () => {
  const { user } = useAuth();
  const startHref = user ? "/report" : "/auth";
  const { pointsToday, reportsToday } = useHeroStats();
  return (
    <div className="min-h-screen bg-background text-ink">
      <AppHeader />


      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-trash-pattern opacity-70" aria-hidden />
        <div className="animate-blob absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-green-soft blur-3xl" aria-hidden />
        <div className="animate-blob absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand-amber-soft blur-3xl" style={{ animationDelay: "-4s" }} aria-hidden />
        <div className="container relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green-soft px-4 py-1.5 text-sm font-semibold text-brand-green">
              <span className="h-2 w-2 rounded-full bg-brand-green" /> Civic Tech for Cleaner Cities
            </span>
            <h1 className="animate-fade-in-up mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl" style={{ animationDelay: "80ms" }}>
              เปลี่ยน<span className="relative inline-block">
                <span className="relative z-10">ขยะ</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-4 bg-brand-amber/60" aria-hidden />
              </span>
              <br />ให้เป็น<span className="text-brand-green">แต้ม</span>
            </h1>
            <p className="animate-fade-in-up mt-6 max-w-xl text-lg text-ink-soft sm:text-xl" style={{ animationDelay: "160ms" }}>
              Turn trash into rewards. Clean your city.{" "}
              <span className="font-semibold text-ink">Breathe better air.</span>
            </p>
            <div className="animate-fade-in-up mt-8 flex flex-wrap gap-4" style={{ animationDelay: "240ms" }}>
              <Link to={startHref}>
                <Button variant="hero" size="xl" className="group">
                  เริ่มภารกิจ <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="ghostInk" size="xl">
                  <Trophy /> ดูอันดับ
                </Button>
              </Link>
            </div>
            <div className="animate-fade-in-up mt-10 flex items-center gap-6 text-sm text-ink-soft" style={{ animationDelay: "320ms" }}>
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

          <div className="animate-fade-in relative" style={{ animationDelay: "300ms" }}>
            <div className="absolute inset-8 -z-0 rounded-[3rem] bg-brand-green/10" aria-hidden />
            <div className="animate-float">
              <HeroMap />
            </div>
            <div className="animate-float-slow absolute -left-2 top-12 z-20 hidden rounded-2xl border border-ink/10 bg-background px-4 py-3 shadow-xl sm:block">
              <div className="text-xs font-medium text-ink-soft">จุดที่เก็บวันนี้</div>
              <CountUp value={reportsToday} className="text-2xl font-extrabold text-brand-green" />
            </div>
            <div className="animate-float-slow absolute -right-2 bottom-16 z-20 hidden rounded-2xl border border-ink/10 bg-background px-4 py-3 shadow-xl sm:block" style={{ animationDelay: "-2.5s" }}>
              <div className="text-xs font-medium text-ink-soft">แต้มวันนี้</div>
              <CountUp value={pointsToday} prefix="+ " className="text-2xl font-extrabold text-brand-amber" />
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT BANNER */}
      <section className="relative overflow-hidden bg-background">
        <div className="relative h-[60vh] min-h-[460px] w-full">
          <img
            src={heroImpact}
            alt="ถังขยะล้นและถุงขยะกองอยู่หน้าบ้านในชุมชน"
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover opacity-95 dark:opacity-55 dark:saturate-50"
          />
          {/* Dark-mode grayish veil to blend with background */}
          <div className="absolute inset-0 hidden dark:block bg-background/50" aria-hidden />
          {/* Horizontal scrim for left-aligned text legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/20 dark:from-background/80 dark:via-background/50 dark:to-background/20" aria-hidden />
          {/* Subtle bottom scrim so descender text stays readable */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/60 to-transparent dark:from-background/60" aria-hidden />
          {/* Edge fades into page background (top & bottom) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background to-transparent" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" aria-hidden />


          <div className="container relative z-10 flex h-full flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/40 bg-black/40 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-white backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-amber" /> Our Mission
            </span>
            <h2 className="mt-6 max-w-4xl font-display text-[clamp(2.75rem,8vw,6.5rem)] font-black uppercase leading-[0.95] tracking-tight text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.55)]">
              Transform
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">Waste</span>
                <span className="absolute -inset-x-2 bottom-1 z-0 h-3 bg-brand-amber sm:h-4" aria-hidden />
              </span>{" "}
              Into
              <br />
              <span className="text-emerald-300 [text-shadow:0_2px_18px_rgba(0,0,0,0.7)]">Impact.</span>
            </h2>
            <p className="mt-6 max-w-xl text-base font-medium text-white sm:text-lg [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
              ทุกชิ้นที่คุณเก็บ คือก้าวเล็กๆ ที่เปลี่ยนเมือง — รวมพลังคน เทคโนโลยี และเกม ให้กลายเป็นพลังจริง
            </p>
          </div>

        </div>
      </section>


      {/* PROBLEM */}
      <section id="problem" className="border-y border-ink/10 bg-secondary/40 py-20">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-amber">The Problem</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">เมืองของเรากำลังป่วย</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Trash2, title: "ขยะล้นเมือง", desc: "ส่งกลิ่นเหม็น สะสมตามตรอกซอกซอย ไม่มีใครเก็บ" },
              { icon: Wind, title: "อากาศเสีย", desc: "ฝุ่น PM 2.5 เกินค่ามาตรฐาน ทำลายสุขภาพทุกวัน" },
              { icon: Frown, title: "แอปเดิมๆ น่าเบื่อ", desc: "รายงานแล้วเงียบ ไม่มีแรงจูงใจ ไม่เห็นผล" },
            ].map((card, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="group h-full rounded-3xl border border-ink/10 bg-background p-8 transition duration-300 hover:-translate-y-1.5 hover:border-brand-amber/40 hover:shadow-xl">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-amber-soft text-brand-amber transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <card.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-6 text-2xl font-bold">{card.title}</h3>
                  <p className="mt-2 text-ink-soft">{card.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section id="solution" className="py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-green">Our Solution</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
              เกม + แผนที่ + AI = เมืองสะอาด
            </h2>
          </Reveal>

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
                desc: "AI ของเราตรวจสอบรูปก่อน-หลังทำความสะอาด ยืนยันด้วย GPS โปร่งใส น่าเชื่อถือ",
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
                <Reveal variant={i % 2 ? "right" : "left"}>
                  <span className="text-sm font-bold tracking-widest text-brand-amber">{s.tag}</span>
                  <h3 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">{s.title}</h3>
                  <p className="mt-4 text-lg text-ink-soft">{s.desc}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {s.bullets.map((b, bi) => (
                      <li
                        key={b}
                        className="rounded-full bg-brand-green-soft px-4 py-1.5 text-sm font-semibold text-brand-green transition-transform duration-200 hover:scale-105"
                        style={{ transitionDelay: `${bi * 30}ms` }}
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal variant={i % 2 ? "left" : "right"} delay={120} className="relative mx-auto w-full max-w-lg">
                  <div className="absolute inset-4 -z-0 rounded-[2.5rem] bg-secondary/60" aria-hidden />
                  <div className="group relative z-10 rounded-[2.5rem] border-2 border-ink/15 bg-background/40 p-4 shadow-sm transition-shadow duration-300 hover:shadow-2xl dark:border-foreground/25 dark:bg-foreground/[0.04]">
                    <img
                      src={s.img}
                      alt={s.title}
                      width={900}
                      height={700}
                      loading="lazy"
                      className="mx-auto w-full rounded-[1.75rem] transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-ink/10 bg-ink py-24 text-background">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-amber">How it works</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">4 ขั้นตอน เริ่มเก็บแต้ม</h2>
          </Reveal>

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
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 130} variant="scale" className="group relative text-center">
                  <div className="relative mx-auto grid h-[72px] w-[72px] place-items-center rounded-2xl bg-brand-amber text-ink shadow-[0_8px_0_0_hsl(var(--brand-amber)/0.4)] transition-transform duration-300 group-hover:-translate-y-1">
                    <s.icon className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
                    <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-green text-xs font-extrabold text-brand-green-foreground">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-background/70">{s.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impact" className="py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-green">Real Impact</span>
            <span className="mt-1 block text-sm font-normal text-ink">(ที่คาดหวังไว้)</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">ตัวเลขที่เปลี่ยนเมือง</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: 5000, suffix: "+", l: "จุดขยะถูกเก็บ" },
              { v: 120, suffix: " ตัน", l: "CO₂ ลดลง" },
              { v: 80000, suffix: "", l: "ผู้ใช้งาน" },
              { v: 200, suffix: "+", l: "แบรนด์พาร์ตเนอร์" },
            ].map((s, i) => (
              <Reveal
                key={i}
                delay={i * 100}
                variant="scale"
                className={`rounded-3xl p-8 text-center transition-transform duration-300 hover:-translate-y-1.5 ${
                  i % 2 ? "bg-brand-amber-soft" : "bg-brand-green-soft"
                }`}
              >
                <CountUp
                  value={s.v}
                  suffix={s.suffix}
                  className={`font-display text-5xl font-extrabold ${
                    i % 2 ? "text-brand-amber" : "text-brand-green"
                  }`}
                />
                <div className="mt-2 font-semibold text-ink">{s.l}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="border-t border-ink/10 bg-secondary/40 py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-amber">For Everyone</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">ใครเหมาะกับ TrashQuest?</h2>
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <Reveal variant="left" className="rounded-3xl border-2 border-brand-green/20 bg-background p-10 transition-shadow duration-300 hover:shadow-xl">
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
            </Reveal>

            <Reveal variant="right" delay={120} className="rounded-3xl border-2 border-brand-amber/30 bg-background p-10 transition-shadow duration-300 hover:shadow-xl">
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
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="bg-brand-green py-24 text-brand-green-foreground">
        <Reveal variant="scale" className="container text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 animate-float" />
          <h2 className="mt-6 font-display text-4xl font-extrabold sm:text-6xl">
            พร้อมเริ่มภารกิจแล้วหรือยัง?
          </h2>
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
        </Reveal>
      </section>

      <footer className="border-t border-ink/10 py-10">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-ink-soft sm:flex-row">
          <div className="flex items-center gap-2 font-display font-extrabold text-ink">
            <img src={logo} alt="TrashQuest" className="h-7 w-7 rounded-md" />
            TrashQuest
          </div>
          <p>© {new Date().getFullYear()} TrashQuest · Mission for cleaner cities.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
