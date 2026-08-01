import { useCurrentFrame, interpolate, spring, AbsoluteFill } from "remotion";
import { playfair, inter } from "../fonts";

const GoogleLogo = ({
  opacity = 1,
  scale = 1,
}: {
  opacity?: number;
  scale?: number;
}) => (
  <div
    style={{
      opacity,
      transform: `scale(${scale})`,
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
  const typingDuration = 38;
  const charsToShow = Math.max(
    0,
    Math.min(
      question.length,
      Math.floor(((frame - typingStart) / typingDuration) * question.length)
    )
  );
  const typedText = question.slice(0, charsToShow);

  const cursorOpacity = frame % 20 < 10 ? 1 : 0;

  const suggestionOpacity = interpolate(frame, [52, 62], [0, 1], {
    extrapolateRight: "clamp",
  });
  const suggestionY = interpolate(frame, [52, 62], [15, 0], {
    extrapolateRight: "clamp",
  });

  const answerOpacity = interpolate(frame, [60, 70], [0, 1], {
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
        padding: "0 80px",
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(logoScale, [0, 1], [0.92, 1])})`,
          opacity: logoOpacity,
          marginBottom: 56,
        }}
      >
        <GoogleLogo />
      </div>

      <div
        style={{
          width: 820,
          maxWidth: "100%",
          opacity: barOpacity,
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
              style={{ opacity: cursorOpacity, color: "#4285F4", marginLeft: 2 }}
            >
              |
            </span>
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          opacity: suggestionOpacity,
          transform: `translateY(${suggestionY}px)`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: inter.fontFamily,
          fontSize: 20,
          color: "#a0a0a0",
        }}
      >
        <span style={{ color: "#4285F4", fontWeight: 500 }}>↳</span>
        <span>CAELUM · Joyería de plata .925</span>
      </div>

      <div
        style={{
          marginTop: 70,
          textAlign: "center",
          opacity: answerOpacity,
        }}
      >
        <p
          style={{
            fontFamily: playfair.fontFamily,
            fontSize: 32,
            fontStyle: "italic",
            color: "#d0d0d0",
            letterSpacing: "0.04em",
            lineHeight: 1.4,
          }}
        >
          La respuesta no necesita gritar...
        </p>
      </div>
    </AbsoluteFill>
  );
};
