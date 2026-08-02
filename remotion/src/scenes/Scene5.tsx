import { useCurrentFrame, interpolate, spring, AbsoluteFill, staticFile, Img } from "remotion";
import { playfair, inter } from "../fonts";

export const Scene5 = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  const logoScale = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [35, 50], [20, 0], { extrapolateRight: "clamp" });

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
    </AbsoluteFill>
  );
};
