type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
};

const scheduleIdle = (callback: () => void) => {
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(callback, { timeout: 1200 });
    return;
  }
  window.setTimeout(callback, 350);
};

const canPrefetch = () => {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (nav.connection?.saveData) return false;
  const effectiveType = nav.connection?.effectiveType || "";
  if (effectiveType === "slow-2g" || effectiveType === "2g") return false;
  return true;
};

export const prefetchPostLoginRoutes = (roleId: number) => {
  if (!canPrefetch()) return;

  scheduleIdle(() => {
    const imports: Array<Promise<unknown>> = [
      import("../pages/Tickets"),
      import("../pages/UserDashboard"),
    ];

    // Usuario de soporte (32) abre dashboard admin como inicio.
    if (roleId === 32) {
      imports.push(import("../pages/Dashboard"));
    }

    void Promise.allSettled(imports);
  });
};
