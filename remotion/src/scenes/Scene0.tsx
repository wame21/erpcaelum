import { useCurrentFrame, interpolate, spring, AbsoluteFill } from "remotion";
import { playfair, inter } from "../fonts";

const GoogleLogo = () => (
  <div
    style={{
      fontFamily: playfair.fontFamily,
      fontSize: 52,
      fontWeight: 600,
      letterSpacing: "-0.03em",
      display: "flex",
      justifyContent: "center",
    }}
  >
    <span style={{ color: "#4285F4" }}>G</span>
    <span style={{ color: "#EA4335" }}>o</span>
    <span style={{ color: "#FBBC05" }}>o</span>
    <span style={{ color: "#4285F4" }}>g</span>
    <span style={{ color: "#34A853" }}>l</span>
    <span style={{ color: "#EA4335" }}>e</span>
  </div>
);

type ResultProps = {
  frame: number;
  from: number;
  domain: string;
  title: string;
  desc: string;
  highlight?: boolean;
  clickProgress?: number;
};

const Result = ({
  frame,
  from,
  domain,
  title,
  desc,
  highlight = false,
  clickProgress = 0,
}: ResultProps) => {
  const opacity = interpolate(frame, [from, from + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [from, from + 12], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const press = highlight ? clickProgress : 0;

  return (
    <div
      style={{
        opacity: opacity * (highlight ? 1 : 1 - press * 0.75),
        transform: `translateY(${y}px) scale(${1 - press * 0.02})`,
        background: highlight
          ? `rgba(255,255,255,${0.03 + press * 0.06})`
          : "transparent",
        borderRadius: 16,
        padding: "18px 22px",
        marginBottom: 6,
      }}
    >
      <div
        style={{
          fontFamily: inter.fontFamily,
          fontSize: 17,
          color: "#8a8a8a",
          letterSpacing: "0.02em",
          marginBottom: 6,
        }}
      >
        {domain}
      </div>
      <div
        style={{
          fontFamily: inter.fontFamily,
          fontSize: 26,
          color: highlight ? "#8ab4f8" : "#7f9fd4",
          marginBottom: 8,
          letterSpacing: "0.01em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: inter.fontFamily,
          fontSize: 19,
          color: "#9a9a9a",
          lineHeight: 1.45,
        }}
      >
        {desc}
      </div>
    </div>
  );
};

export const Scene0 = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  const logoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const logoScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 20, stiffness: 120 },
  });
  const barOpacity = interpolate(frame, [8, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const barY = interpolate(frame, [8, 20], [25, 0], {
    extrapolateRight: "clamp",
  });

  const question = "¿Cómo puedo imponer presencia a donde vaya?";
  const typingStart = 22;
  const typingDuration = 42;
  const typingEnd = typingStart + typingDuration;
  const charsToShow = Math.max(
    0,
    Math.min(
      question.length,
      Math.floor(((frame - typingStart) / typingDuration) * question.length)
    )
  );
  const typedText = question.slice(0, charsToShow);
  const typingDone = frame >= typingEnd;
  const cursorOpacity = frame % 20 < 10 ? 1 : 0;

  // pausa después de escribir: 64 -> 82. Resultados desde 84.
  const resultsStart = 84;
  const listOpacity = interpolate(frame, [resultsStart - 4, resultsStart + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // puntero del mouse
  const pointerAppear = 118;
  const pointerOpacity = interpolate(frame, [pointerAppear, pointerAppear + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pointerX = interpolate(frame, [pointerAppear, 138], [220, 40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const pointerY = interpolate(frame, [pointerAppear, 138], [260, 40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  // click en el resultado de CAELUM
  const clickFrame = 140;
  const clickProgress = interpolate(frame, [clickFrame, clickFrame + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ripple = interpolate(frame, [clickFrame, clickFrame + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // salida: todo se desvanece tras el click
  const exit = interpolate(frame, [clickFrame + 8, clickFrame + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "0 60px",
      }}
    >
      <div
        style={{
          opacity: (1 - exit) * logoOpacity,
          transform: `scale(${interpolate(logoScale, [0, 1], [0.92, 1])})`,
          marginBottom: 48,
        }}
      >
        <GoogleLogo />
      </div>

      <div
        style={{
          width: 880,
          maxWidth: "100%",
          opacity: barOpacity * (1 - exit),
          transform: `translateY(${barY}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 999,
            padding: "22px 28px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <svg
            width={26}
            height={26}
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx={11} cy={11} r={8} />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span
            style={{
              fontFamily: inter.fontFamily,
              fontSize: 22,
              color: "white",
              marginLeft: 18,
              whiteSpace: "nowrap",
              overflow: "hidden",
              letterSpacing: "0.01em",
            }}
          >
            {typedText}
            <span
              style={{
                opacity: typingDone ? cursorOpacity : 1,
                color: "#4285F4",
                marginLeft: 2,
              }}
            >
              |
            </span>
          </span>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: 880,
          maxWidth: "100%",
          marginTop: 54,
          opacity: listOpacity * (1 - exit),
        }}
      >
        <Result
          frame={frame}
          from={resultsStart}
          domain="joyeriasgenericas.mx"
          title="Accesorios de moda al mayoreo"
          desc="Catálogo masivo de bisutería. Envíos a todo el país."
        />
        <div style={{ position: "relative" }}>
          <Result
            frame={frame}
            from={resultsStart + 12}
            domain="caelum.joyeria"
            title="CAELUM · Joyería de plata .925"
            desc="Silentium est potentia. El poder no necesita volumen: las piezas hablan por ti."
            highlight
            clickProgress={clickProgress}
          />
          {frame >= clickFrame && (
            <div
              style={{
                position: "absolute",
                left: 60,
                top: 58,
                width: 20,
                height: 20,
                borderRadius: 999,
                border: "2px solid rgba(138,180,248,0.7)",
                transform: `translate(-50%, -50%) scale(${1 + ripple * 6})`,
                opacity: 1 - ripple,
              }}
            />
          )}
        </div>
        <Result
          frame={frame}
          from={resultsStart + 24}
          domain="tiendaonline.example"
          title="Cadenas y pulsos económicos"
          desc="Acero inoxidable. Descuentos por volumen y promociones."
          clickProgress={clickProgress}
        />

        {/* puntero del mouse */}
        <div
          style={{
            position: "absolute",
            left: pointerX,
            top: pointerY,
            opacity: pointerOpacity * (1 - exit),
            transform: `scale(${1 - clickProgress * 0.18})`,
          }}
        >
          <svg width={34} height={34} viewBox="0 0 24 24">
            <path
              d="M5 3l14 8.5-6.2 1.3L9.8 20 5 3z"
              fill="#ffffff"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={1}
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
