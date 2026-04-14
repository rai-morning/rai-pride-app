import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7a5cff 0%, #27d3ff 50%, #ff4fd8 100%)",
          color: "white",
          fontSize: 210,
          fontWeight: 800,
          letterSpacing: -8,
        }}
      >
        R
      </div>
    ),
    { ...size }
  );
}
