import { loadFont } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const playfair = loadFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

export const inter = loadInter("normal", {
  weights: ["300", "400", "500"],
  subsets: ["latin"],
});
