import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShoppingBag, User } from "lucide-react";

import logo from "@/assets/caelum-logo.png.asset.json";
import { useCarrito } from "@/lib/carrito";
import { useSesion } from "@/hooks/use-sesion";
import { supabase } from "@/integrations/supabase/client";

const categoryLink =
  "text-foreground/90 font-medium tracking-[0.22em] uppercase transition-colors duration-300 hover:text-primary relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full";
const iconButton =
  "text-muted-foreground transition-colors duration-300 hover:text-foreground p-1";

export function SiteHeader() {
  const { cantidadTotal, vaciar } = useCarrito();
  const { user } = useSesion();
  const navigate = useNavigate();

  async function salir() {
    await supabase.auth.signOut();
    vaciar();
    navigate({ to: "/", replace: true });
  }

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
        <nav className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.65rem] tracking-[0.24em] uppercase sm:gap-x-6 sm:text-xs sm:tracking-[0.28em]">
          <Link to="/catalogo/$categoria" params={{ categoria: "cadenas" }} className={categoryLink}>
            Cadenas
          </Link>
          <Link to="/catalogo/$categoria" params={{ categoria: "pulsos" }} className={categoryLink}>
            Pulsos
          </Link>
          {user ? (
            <button type="button" onClick={salir} className={iconButton} aria-label="Salir">
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          ) : (
            <Link to="/acceso" className={iconButton} aria-label="Iniciar sesión">
              <LogIn size={18} strokeWidth={1.5} />
            </Link>
          )}
          <Link to="/carrito" className={iconButton} aria-label="Carrito">
            <div className="relative">
              <ShoppingBag size={18} strokeWidth={1.5} />
              {cantidadTotal > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[0.55rem] font-medium text-primary-foreground">
                  {cantidadTotal}
                </span>
              )}
            </div>
          </Link>
        </nav>
      </div>
    </header>
  );
}
