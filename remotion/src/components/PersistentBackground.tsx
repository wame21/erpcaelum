import { useCurrentFrame, interpolate } from "remotion";

export const PersistentBackground = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 50% 0%, #1a1a1a 0%, #050505 60%, #000000 100%)",
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(192, 192, 192, 0.03) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(192, 192, 192, 0.03) 0%, transparent 40%)",
        }}
      />
    </div>
  );
};
