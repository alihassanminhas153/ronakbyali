import { useCallback, useEffect, useRef, useState } from "react";

/* Copy text to the clipboard (with an old-browser fallback). */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* const { copied, copy } = useCopied();
   copy("email", "me@x.com")  ->  copied === "email" for about 2 seconds, so you can show "Copied" */
export default function useCopied() {
  const [copied, setCopied] = useState("");
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async (key, text) => {
    if (await copyText(text)) {
      setCopied(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(""), 1800);
    }
  }, []);
  return { copied, copy };
}