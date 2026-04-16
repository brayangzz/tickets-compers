import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clearAuthStoragePreserveTheme } from "../../utils/storage";

// ─── Tiempo antes de la redirección automática ────────────────────────────────
const COUNTDOWN_SECONDS = 5;

// ─── Helper global ────────────────────────────────────────────────────────────
export const triggerSessionExpired = () => {
  window.dispatchEvent(new Event("session-expired"));
};

// ─── Limpieza y redirección (preserva tema) ───────────────────────────────────
const redirectToLogin = () => {
  clearAuthStoragePreserveTheme();
  window.location.href = "/login";
};

// ─── Anillo SVG de progreso ───────────────────────────────────────────────────
const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CountdownRing = ({ seconds, total }: { seconds: number; total: number }) => {
  const progress = seconds / total; // 1=lleno → 0=vacío
  const offset   = CIRCUMFERENCE * (1 - progress);

  return (
    <svg
      width="80" height="80" viewBox="0 0 80 80"
      className="absolute inset-0"
      style={{ transform: "rotate(-90deg)" }}
    >
      {/* Track tenue */}
      <circle
        cx="40" cy="40" r={RADIUS}
        fill="none" stroke="rgba(99,102,241,0.15)"
        strokeWidth="4"
      />
      {/* Arco de progreso — azul-índigo del sistema */}
      <circle
        cx="40" cy="40" r={RADIUS}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// ─── Modal principal ──────────────────────────────────────────────────────────
export const SessionExpiredModal = () => {
  const [isOpen,  setIsOpen]  = useState(false);
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRedirected         = useRef(false);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    hasRedirected.current = false;
    setSeconds(COUNTDOWN_SECONDS);
    clearCountdown();

    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearCountdown();
          if (!hasRedirected.current) {
            hasRedirected.current = true;
            redirectToLogin();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown]);

  // Escucha el evento global
  useEffect(() => {
    const onExpired = () => { setIsOpen(true); startCountdown(); };
    window.addEventListener("session-expired", onExpired);
    return () => {
      window.removeEventListener("session-expired", onExpired);
      clearCountdown();
    };
  }, [startCountdown, clearCountdown]);

  // Si el modal se cierra, detiene el contador
  useEffect(() => {
    if (!isOpen) clearCountdown();
  }, [isOpen, clearCountdown]);

  const handleLoginRedirect = () => {
    clearCountdown();
    hasRedirected.current = true;
    setIsOpen(false);
    redirectToLogin();
  };

  const pct = (seconds / COUNTDOWN_SECONDS) * 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="se-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
        >
          <motion.div
            key="se-card"
            initial={{ scale: 0.88, opacity: 0, y: 28 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit   ={{ scale: 0.93, opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-[28px] shadow-2xl overflow-hidden"
          >
            {/* Franja azul-índigo — mismo estilo que los otros modales */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

            <div className="p-8 flex flex-col items-center text-center gap-5">

              {/* Ícono con anillo de progreso */}
              <div className="relative w-[80px] h-[80px] flex items-center justify-center">
                <CountdownRing seconds={seconds} total={COUNTDOWN_SECONDS} />
                <motion.div
                  initial={{ rotate: -15, scale: 0.7, opacity: 0 }}
                  animate={{ rotate: 0,   scale: 1,   opacity: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.08 }}
                  className="w-[58px] h-[58px] rounded-[18px] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center shadow-inner"
                >
                  <span className="material-symbols-rounded text-[28px] text-indigo-500">lock_clock</span>
                </motion.div>
              </div>

              {/* Título y descripción */}
              <div className="flex flex-col gap-1.5">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Sesión Caducada
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-2">
                  Por tu seguridad, la sesión se ha cerrado por inactividad.
                </p>
              </div>

              {/* Contador */}
              <div className="flex flex-col items-center gap-2 w-full">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Redirigiendo en
                </p>

                {/* Número animado */}
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={seconds}
                    initial={{ y: -14, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0,   opacity: 1, scale: 1   }}
                    exit   ={{ y:  14, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="text-5xl font-black tabular-nums text-indigo-500 dark:text-indigo-400 leading-none"
                  >
                    {seconds}
                  </motion.span>
                </AnimatePresence>

                {/* Barra de progreso */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/70 rounded-full overflow-hidden mt-1">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400"
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
              </div>

              {/* Botón */}
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 12px 30px rgba(99,102,241,0.4)" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLoginRedirect}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] font-bold text-[15px] shadow-lg shadow-indigo-500/25 border border-indigo-500/40 transition-all flex items-center justify-center gap-2"
              >
                Iniciar Sesión
                <span className="material-symbols-rounded text-[20px]">login</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
