import { useCurrentFrame, interpolate, spring, AbsoluteFill, staticFile, Img } from "remotion";
import { playfair, inter } from "../fonts";

export const Scene3 = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  const leftPhoneX = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 90 } });
  const rightPhoneX = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 90 } });
  const textOpacity = interpolate(frame, [20, 38], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        paddingTop: 120,
      }}
    >
      <div style={{ textAlign: "center", opacity: textOpacity, marginBottom: 60 }}>
        <h2
          style={{
            fontFamily: playfair.fontFamily,
            fontSize: 48,
            fontWeight: 400,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Explora el inventario
        </h2>
        <p
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 20,
            fontWeight: 300,
            letterSpacing: "0.15em",
            marginTop: 16,
            color: "#a0a0a0",
          }}
        >
          Cadenas · Pulsos · Próximamente más
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 320,
            height: 640,
            borderRadius: 40,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.02)",
            padding: 10,
            transform: `translateX(${interpolate(leftPhoneX, [0, 1], [-120, 0])}px)`,
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile("images/cadenas.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 30, filter: "brightness(1.2) contrast(1.05)" }}
          />
        </div>
        <div
          style={{
            width: 320,
            height: 640,
            borderRadius: 40,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.02)",
            padding: 10,
            transform: `translateX(${interpolate(rightPhoneX, [0, 1], [120, 0])}px)`,
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile("images/pulsos.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 30, filter: "brightness(1.2) contrast(1.05)" }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
