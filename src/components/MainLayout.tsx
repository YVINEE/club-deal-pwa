import { CalendarClock, BriefcaseBusiness, LayoutDashboard, Settings } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

interface MainLayoutProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const liens = [
  { to: "/", label: "Vue", description: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/deals", label: "Deals", description: "Liste des deals", icon: BriefcaseBusiness },
  { to: "/echeances", label: "Échéances", description: "Toutes les échéances", icon: CalendarClock },
  { to: "/parametres", label: "Paramètres", description: "Réglages", icon: Settings },
] as const;

export function MainLayout({ theme, onToggleTheme }: MainLayoutProps) {
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-[440px] items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-8 w-8 rounded-lg" />
            <h1 className="text-base font-semibold">Suivi Club Deals</h1>
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      <main className="mx-auto max-w-[440px]">
        <Outlet />
      </main>

      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-[440px]">
          {liens.map(({ to, label, description, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              aria-label={description}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                  isActive ? "text-emerald-600" : "text-gray-500"
                }`
              }
            >
              {({ isActive }) => <><Icon size={19} aria-hidden="true" strokeWidth={isActive ? 2.5 : 2} /><span>{label}</span></>}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
