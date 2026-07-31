import { useState } from "react";

import { Reveal } from "./reveal";

const BENEFICIARIO = "WILVER ADRIAN MERAZ";
const CLABE = "PENDIENTE_DE_ACTUALIZAR";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value || value === "PENDIENTE_DE_ACTUALIZAR") return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase">
        {label}
      </label>
      <div className="flex items-center gap-3 border-b border-hairline pb-2">
        <span className="flex-1 text-sm tracking-wide text-foreground">{value}</span>
        <button
          type="button"
          onClick={handleCopy}
          disabled={value === "PENDIENTE_DE_ACTUALIZAR"}
          className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground disabled:opacity-40"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export function DatosBancarios() {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 sm:pb-16">
      <Reveal>
        <div className="flex items-center gap-5">
          <span className="h-px flex-1 bg-hairline" />
          <h2 className="font-display text-xl tracking-[0.24em] uppercase sm:text-3xl">
            Datos Bancarios
          </h2>
          <span className="h-px flex-1 bg-hairline" />
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="mt-8 border border-hairline bg-surface p-6 sm:p-10">
          <p className="text-center text-[0.65rem] leading-[2] tracking-[0.16em] text-muted-foreground uppercase sm:text-xs">
            Si lo prefieres, puedes apartar tu pieza con el 50% de su valor mediante transferencia
            bancaria y liquidar el restante al momento de la entrega. Esta opción se ofrece como un
            convenio de confianza; una vez confirmada tu transferencia, tu pieza queda apartada y
            coordinamos la entrega personal o el envío seguro.
          </p>

          <div className="mx-auto mt-8 max-w-md space-y-6">
            <CopyRow label="Beneficiario" value={BENEFICIARIO} />
            <CopyRow label="CLABE" value={CLABE} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
