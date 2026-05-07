import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const emailSchema = z.string().trim().email("อีเมลไม่ถูกต้อง").max(255);
const passSchema = z.string().min(6, "รหัสอย่างน้อย 6 ตัว").max(72);

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email); passSchema.parse(password);
    } catch (err: any) { toast.error(err.errors?.[0]?.message ?? "ข้อมูลไม่ถูกต้อง"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("ยินดีต้อนรับกลับ! 🎉");
    navigate("/dashboard");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email); passSchema.parse(password);
    } catch (err: any) { toast.error(err.errors?.[0]?.message ?? "ข้อมูลไม่ถูกต้อง"); return; }
    setLoading(true);
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + base + "/dashboard",
        data: { display_name: name || email.split("@")[0] },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("สมัครสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ 📧");
  };

  const handleGoogle = async () => {
    setLoading(true);
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + base + "/dashboard" });
    if (result.error) { toast.error("เข้าสู่ระบบ Google ไม่สำเร็จ"); setLoading(false); return; }
    if (result.redirected) return;
    navigate("/dashboard");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/40 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-ink/10 bg-background p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-green text-brand-green-foreground">
            <Leaf className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold">TrashQuest</h1>
          <p className="mt-1 text-sm text-ink-soft">เปลี่ยนขยะให้เป็นแต้ม เปลี่ยนเมืองให้สะอาด</p>
        </div>

        <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full" size="lg">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          ดำเนินการต่อด้วย Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-soft">
          <span className="h-px flex-1 bg-ink/10" /> หรือ <span className="h-px flex-1 bg-ink/10" />
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">เข้าสู่ระบบ</TabsTrigger>
            <TabsTrigger value="signup">สมัครสมาชิก</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-3">
              <div><Label>อีเมล</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label>รหัสผ่าน</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>เข้าสู่ระบบ</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div><Label>ชื่อแสดง</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="นักล่าขยะ" /></div>
              <div><Label>อีเมล</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label>รหัสผ่าน</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>สมัครสมาชิก</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
