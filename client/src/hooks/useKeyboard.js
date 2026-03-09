import { useEffect, useState } from "react";

export default function useKeyboard() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const initialHeight = window.innerHeight;

    const handleResize = () => {
      const heightDiff = initialHeight - window.innerHeight;

      if (heightDiff > 150) {
        setKeyboardOpen(true);
      } else {
        setKeyboardOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return keyboardOpen;
}