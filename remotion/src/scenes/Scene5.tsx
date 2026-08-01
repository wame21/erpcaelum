import { useCurrentFrame, interpolate, spring, AbsoluteFill, staticFile, Img } from "remotion";
import { playfair, inter } from "../fonts";

const WhatsAppIcon = ({ opacity = 1 }: { opacity?: number }) => (
  <svg
    width={64}
    height={64}
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity }}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.5-5.6A8.38 8.38 0 0 1 4.5 11.5 8.5 8.5 0 0 1 11 3a8.38 8.38 0 0 1 3.8.9l.9.4" />
    <path d="M15 9a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
  </svg>
);

export const Scene5 = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  const logoScale = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });
  const ctaY = interpolate(frame, [35, 50], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
      }}
    >
      <div style={{ transform: `scale(${logoScale})` }}>
        <svg width={120} height={120} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="1.5" />
          <path d="M 50 18 A 32 32 0 1 0 50 82 A 32 32 0 1 0 50 18" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" />
          <path d="M 50 18 L 50 50" stroke="white" strokeWidth="5" strokeLinecap="round" />
          <path d="M 50 32 L 56 42 L 50 50 L 44 42 Z" fill="white" />
        </svg>
      </div>

      <h1
        style={{
          fontFamily: playfair.fontFamily,
          fontSize: 56,
          letterSpacing: "0.35em",
          marginTop: 28,
          opacity: titleOpacity,
          fontWeight: 400,
        }}
      >
        CAELUM
      </h1>

      <div
        style={{
          marginTop: 60,
          textAlign: "center",
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <WhatsAppIcon />
          <span
            style={{
              fontFamily: inter.fontFamily,
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: "0.1em",
            }}
          >
            687 152 6276
          </span>
        </div>
        <p
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 20,
            fontWeight: 300,
            letterSpacing: "0.15em",
            marginTop: 28,
            color: "#a0a0a0",
            textTransform: "uppercase",
          }}
        >
          Guasave, Sinaloa
        </p>
        <p
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 18,
            fontWeight: 300,
            letterSpacing: "0.12em",
            marginTop: 12,
            color: "#707070",
          }}
        >
          Link en bio · Envíanos mensaje directo
        </p>
      </div>
    </AbsoluteFill>
  );
};
