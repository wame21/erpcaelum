import { useCurrentFrame, interpolate, spring, AbsoluteFill, staticFile, Img } from "remotion";
import { playfair, inter } from "../fonts";

const Logo = ({ scale = 1, opacity = 1 }: { scale?: number; opacity?: number }) => (
  <Img
    src={staticFile("images/caelum-logo.png")}
    style={{
      width: 180 * scale,
      height: 180 * scale,
      objectFit: "contain",
      opacity,
    }}
  />
);

export const Scene1 = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [10, 30], [20, 0], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });

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
        <Logo />
      </div>
      <h1
        style={{
          fontFamily: playfair.fontFamily,
          fontSize: 72,
          letterSpacing: "0.35em",
          marginTop: 40,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
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
          fontWeight: 300,
          color: "#a0a0a0",
        }}
      >
        Silentium est potentia
      </p>
    </AbsoluteFill>
  );
};
