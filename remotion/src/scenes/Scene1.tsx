import { useCurrentFrame, interpolate, spring, AbsoluteFill } from "remotion";
import { playfair, inter } from "../fonts";

const Logo = ({ scale = 1, opacity = 1 }: { scale?: number; opacity?: number }) => (
  <svg
    width={180 * scale}
    height={180 * scale}
    viewBox="0 0 100 100"
    style={{ opacity }}
  >
    <circle
      cx="50"
      cy="50"
      r="46"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    />
    <path
      d="M 50 18 A 32 32 0 1 0 50 82 A 32 32 0 1 0 50 18"
      fill="none"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path d="M 50 18 L 50 50" stroke="white" strokeWidth="5" strokeLinecap="round" />
    <path
      d="M 50 32 L 56 42 L 50 50 L 44 42 Z"
      fill="white"
    />
  </svg>
);

export const Scene1 = () => {
  const frame = useCurrentFrame();
  const { fps } = { fps: 30 };

  const logoScale = spring({ frame: frame - 10, fps: 30, config: { damping: 15, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [30, 50], [20, 0], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });

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
