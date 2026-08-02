import { useCurrentFrame, interpolate, spring, AbsoluteFill } from "remotion";
import { playfair, inter } from "../fonts";

export const Scene1 = () => {
  const frame = useCurrentFrame();

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
      <h1
        style={{
          fontFamily: playfair.fontFamily,
          fontSize: 72,
          letterSpacing: "0.35em",
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
