import { useRef, useState } from "react";

export function usePortalPos<E extends HTMLElement = HTMLDivElement>() {
  const triggerRef = useRef<E>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 8, left: r.left + window.scrollX, width: r.width });
  };

  return { triggerRef, pos, updatePos };
}
