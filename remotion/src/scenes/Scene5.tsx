import { useCurrentFrame, interpolate, spring, AbsoluteFill, staticFile, Img } from "remotion";
import { playfair, inter } from "../fonts";

export const Scene5 = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  const logoScale = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [35, 50], [20, 0], { extrapolateRight: "clamp" });

  const ctaSpring = spring({ frame: frame - 62, fps, config: { damping: 18, stiffness: 120 } });
  const ctaOpacity = interpolate(frame, [62, 78], [0, 1], { extrapolateRight: "clamp" });
  const ctaY = interpolate(ctaSpring, [0, 1], [26, 0]);
  const pulse = 1 + Math.sin((frame - 62) / 9) * 0.012;
  const urlOpacity = interpolate(frame, [86, 102], [0, 1], { extrapolateRight: "clamp" });

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
      <div style={{ transform: `scale(${interpolate(logoScale, [0, 1], [0.85, 1])})` }}>
        <Img
          src={staticFile("images/caelum-logo.png")}
          style={{ width: 160, height: 160, objectFit: "contain" }}
        />
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

      <p
        style={{
          fontFamily: inter.fontFamily,
          fontSize: 22,
          letterSpacing: "0.25em",
          marginTop: 20,
          textTransform: "uppercase",
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontWeight: 300,
          color: "#a0a0a0",
        }}
      >
        Silentium est potentia
      </p>

      <div
        style={{
          marginTop: 72,
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px) scale(${pulse})`,
          border: "1px solid rgba(255,255,255,0.55)",
          borderRadius: 999,
          padding: "22px 54px",
          fontFamily: inter.fontFamily,
          fontSize: 24,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontWeight: 400,
          backgroundColor: "rgba(255,255,255,0.04)",
        }}
      >
        Ver colección
      </div>

      <p
        style={{
          fontFamily: inter.fontFamily,
          fontSize: 20,
          letterSpacing: "0.18em",
          marginTop: 26,
          opacity: urlOpacity,
          color: "#8a8a8a",
          fontWeight: 300,
        }}
      >
        caelumjoyeria.lovable.app/#categorias
      </p>
    </AbsoluteFill>
  );
};
