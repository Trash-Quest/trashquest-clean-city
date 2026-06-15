import { Link, NavLink, useNavigate } from "react-router-dom";
import { Leaf, LogOut, Trophy, LayoutDashboard, PlusCircle, LogIn, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export const AppHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setPoints(null); return; }
    supabase.from("profiles").select("total_points").eq("id", user.id).maybeSingle()
      .then(({ data }) => setPoints(data?.total_points ?? 0));
  }, [user]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold transition ${isActive ? "text-brand-green" : "text-ink-soft hover:text-ink"}`;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-green text-brand-green-foreground">
            <Leaf className="h-5 w-5" />
          </span>
          TrashQuest
        </Link>

        {user && (
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/report" className={linkClass}>
              <span className="inline-flex items-center gap-1.5"><PlusCircle className="h-4 w-4" />รายงาน</span>
            </NavLink>
            <NavLink to="/map" className={linkClass}>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />แผนที่</span>
            </NavLink>
            <NavLink to="/dashboard" className={linkClass}>
              <span className="inline-flex items-center gap-1.5"><LayoutDashboard className="h-4 w-4" />ของฉัน</span>
            </NavLink>
            <NavLink to="/leaderboard" className={linkClass}>
              <span className="inline-flex items-center gap-1.5"><Trophy className="h-4 w-4" />อันดับ</span>
            </NavLink>
          </nav>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              {points !== null && (
                <span className="hidden rounded-full bg-brand-amber-soft px-3 py-1 text-sm font-bold text-brand-amber sm:inline-flex">
                  ⭐ {points.toLocaleString()}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </Button>
            </>
          ) : (
            <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
              <LogIn className="h-4 w-4" /> เข้าสู่ระบบ
            </Button>
          )}
        </div>
      </div>
      {user && (
        <nav className="container flex items-center justify-around gap-2 border-t border-ink/5 py-2 md:hidden">
          <NavLink to="/report" className={linkClass}>
            <span className="inline-flex flex-col items-center text-xs"><PlusCircle className="h-5 w-5" />รายงาน</span>
          </NavLink>
          <NavLink to="/map" className={linkClass}>
            <span className="inline-flex flex-col items-center text-xs"><MapPin className="h-5 w-5" />แผนที่</span>
          </NavLink>
          <NavLink to="/dashboard" className={linkClass}>
            <span className="inline-flex flex-col items-center text-xs"><LayoutDashboard className="h-5 w-5" />ของฉัน</span>
          </NavLink>
          <NavLink to="/leaderboard" className={linkClass}>
            <span className="inline-flex flex-col items-center text-xs"><Trophy className="h-5 w-5" />อันดับ</span>
          </NavLink>
        </nav>
      )}
    </header>
  );
};
