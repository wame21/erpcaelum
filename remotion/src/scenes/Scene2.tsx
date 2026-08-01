import { useCurrentFrame, interpolate, spring, AbsoluteFill, staticFile, Img } from "remotion";
import { playfair, inter } from "../fonts";

export const Scene2 = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  const phoneScale = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 100 } });
  const phoneY = interpolate(frame, [10, 30], [120, 0], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(frame, [25, 45], [30, 0], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [40, 60], [0, 120], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 180,
        color: "white",
      }}
    >
      <div
        style={{
          width: 420,
          height: 840,
          borderRadius: 48,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.02)",
          padding: 12,
          transform: `scale(${phoneScale}) translateY(${phoneY}px)`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile("images/home.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 36,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 60,
          textAlign: "center",
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        <div
          style={{
            height: 1,
            width: lineWidth,
            background: "linear-gradient(90deg, transparent, white, transparent)",
            margin: "0 auto 24px",
          }}
        />
        <h2
          style={{
            fontFamily: playfair.fontFamily,
            fontSize: 42,
            fontWeight: 400,
            letterSpacing: "0.08em",
            lineHeight: 1.3,
            maxWidth: 800,
          }}
        >
          El lujo real se lleva en silencio
        </h2>
        <p
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 22,
            fontWeight: 300,
            letterSpacing: "0.12em",
            marginTop: 16,
            color: "#a0a0a0",
            textTransform: "uppercase",
          }}
        >
          Plata sólida .925
        </p>
      </div>
    </AbsoluteFill>
  );
};
