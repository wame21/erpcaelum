import { Link } from "@tanstack/react-router";
import logo from "@/assets/caelum-logo.png.asset.json";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-6 sm:py-8">
        <Link to="/" className="group flex flex-col items-center gap-3">
          <img
            src={logo.url}
            alt="CAELUM"
            width={733}
            height={808}
            className="h-16 w-auto transition-opacity duration-500 group-hover:opacity-80 sm:h-20"
          />
          <span className="font-display text-[0.65rem] tracking-[0.42em] text-muted-foreground uppercase sm:text-xs">
            Silentium est potentia
          </span>
        </Link>
        <nav className="mt-1 flex items-center gap-6 text-[0.7rem] tracking-[0.28em] uppercase sm:gap-10 sm:text-xs">
          <Link
            to="/catalogo/$categoria"
            params={{ categoria: "cadenas" }}
            className="text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            Cadenas
          </Link>
          <Link
            to="/catalogo/$categoria"
            params={{ categoria: "pulsos" }}
            className="text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            Pulsos
          </Link>
        </nav>
      </div>
    </header>
  );
}
