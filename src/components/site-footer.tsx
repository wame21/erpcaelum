export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-ink px-5 py-14 text-center">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-display text-lg tracking-[0.18em] sm:text-2xl">
          Auténtica Plata Sólida .925
        </h2>
        <p className="mt-5 text-[0.65rem] leading-relaxed tracking-[0.24em] text-muted-foreground uppercase sm:text-[0.7rem]">
          Entregas personales en Guasave, Sin.
        </p>
        <div className="mx-auto mt-8 h-px w-16 bg-hairline" />
        <p className="mt-8 font-display text-[0.7rem] tracking-[0.4em] text-muted-foreground uppercase">
          Silentium est potentia
        </p>
        <nav className="mt-8 flex items-center justify-center gap-5 text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
          <Link to="/privacidad" className="transition-colors hover:text-foreground">
            Aviso de Privacidad
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link to="/terminos" className="transition-colors hover:text-foreground">
            Términos de Servicio
          </Link>
        </nav>
        <p className="mt-6 text-[0.6rem] tracking-[0.2em] text-muted-foreground/60 uppercase">
          © {new Date().getFullYear()} Caelum
        </p>

      </div>
    </footer>
  );
}
