import { useCurrentFrame, interpolate, spring, AbsoluteFill, staticFile, Img } from "remotion";
import { playfair, inter } from "../fonts";

export const Scene4 = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  const phoneScale = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 100 } });
  const textOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const textX = interpolate(frame, [20, 40], [50, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        color: "white",
        padding: "0 80px",
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
          transform: `scale(${phoneScale})`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Img
          src={staticFile("images/carrito.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 36 }}
        />
      </div>

      <div
        style={{
          opacity: textOpacity,
          transform: `translateX(${textX}px)`,
          maxWidth: 420,
        }}
      >
        <h2
          style={{
            fontFamily: playfair.fontFamily,
            fontSize: 46,
            fontWeight: 400,
            letterSpacing: "0.08em",
            lineHeight: 1.2,
          }}
        >
          Aparta tu pieza
        </h2>
        <p
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 22,
            fontWeight: 300,
            letterSpacing: "0.06em",
            marginTop: 24,
            lineHeight: 1.6,
            color: "#c0c0c0",
          }}
        >
          50% para apartar
          <br />
          Pago a contra entrega
          <br />
          Entrega personal en Guasave, Sinaloa
        </p>
        <div
          style={{
            marginTop: 32,
            height: 1,
            width: 80,
            background: "white",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
