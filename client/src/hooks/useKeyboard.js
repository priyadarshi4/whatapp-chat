import { useEffect, useState } from "react";

export default function useKeyboard() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) return;

    const handleResize = () => {
      const heightDiff = window.innerHeight - viewport.height;

      // keyboard usually reduces viewport by >120px
      setKeyboardOpen(heightDiff > 120);
    };

    viewport.addEventListener("resize", handleResize);

    return () => {
      viewport.removeEventListener("resize", handleResize);
    };
  }, []);

  return keyboardOpen;
}