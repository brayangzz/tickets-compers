import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import { getRoles } from "../services/roleService";
import { motion, AnimatePresence } from "framer-motion";
import { getLocalStorageJSON } from "../utils/storage";
import { prefetchPostLoginRoutes } from "../utils/routePrefetch";

type LoginUser = {
  iIdRol?: number | string;
  ildRol?: number | string;
  idRole?: number | string;
};

export const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getLocalStorageJSON<LoginUser | null>("user", null);
    if (token && user) {
      const roleId = Number(user.iIdRol || user.ildRol || user.idRole || 0);
      prefetchPostLoginRoutes(roleId);
      navigate([32].includes(roleId) ? "/" : "/my-tasks", { replace: true });
    }
  }, [navigate]);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);
  // Errores por campo individuales
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [fieldShake, setFieldShake] = useState<{ email?: number; password?: number }>({});

  const clearFieldError = (name: string) => {
    setFieldErrors(prev => { const next = { ...prev }; delete next[name as keyof typeof prev]; return next; });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
    clearFieldError(name);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validación custom por campo
    const errors: { email?: string; password?: string } = {};
    if (!formData.email.trim()) errors.email = "El usuario es requerido.";
    if (!formData.password.trim()) errors.password = "La contraseña es requerida.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFieldShake(prev => ({
        email: errors.email ? (prev.email ?? 0) + 1 : prev.email,
        password: errors.password ? (prev.password ?? 0) + 1 : prev.password,
      }));
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await loginUser(formData.email, formData.password);
      try {
        const rolesDB = await getRoles();
        const rolesMap: Record<string, number> = {};
        rolesDB.forEach(r => { if (r.sRol) rolesMap[r.sRol.toUpperCase()] = r.iIdRol; });
        localStorage.setItem("rolesMap", JSON.stringify(rolesMap));
      } catch { /* no crítico */ }
      localStorage.setItem("token", result.sToken);
      localStorage.setItem("user", JSON.stringify(result));
      localStorage.setItem("isAuthenticated", "true");
      const roleId = Number(result.iIdRol || result.ildRol || result.idRole || 0);
      prefetchPostLoginRoutes(roleId);
      navigate([32].includes(roleId) ? "/" : "/my-tasks", { replace: true });
    } catch {
      setErrorMessage("Usuario o contraseña incorrectos.");
      setShakeKey(k => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const hasError = !!errorMessage;

  // Clases del campo según su estado (incluye error de campo individual)
  const getFieldClass = (fieldName: string) => {
    const hasFieldErr = !!fieldErrors[fieldName as keyof typeof fieldErrors];
    if (focused === fieldName && !hasFieldErr) return "border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)] bg-white dark:bg-slate-800/80";
    if (hasFieldErr || (hasError && focused !== fieldName)) return "border-rose-400 shadow-[0_0_0_3px_rgba(244,63,94,0.1)] bg-rose-50/40 dark:bg-rose-500/5";
    if (focused === fieldName) return "border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)] bg-white dark:bg-slate-800/80";
    return "border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600";
  };

  return (
    <>
      <style>{`
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%      { transform: translate(70px,-50px) scale(1.1); }
          50%      { transform: translate(40px,60px) scale(0.95); }
          75%      { transform: translate(-50px,25px) scale(1.05); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%      { transform: translate(-60px,70px) scale(0.9); }
          50%      { transform: translate(50px,-40px) scale(1.08); }
          75%      { transform: translate(25px,-60px) scale(1); }
        }
        @keyframes orb3 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(45px,45px) scale(1.06); }
          80%      { transform: translate(-35px,-25px) scale(0.94); }
        }
        .orb-a { animation: orb1 18s ease-in-out infinite; will-change: transform; }
        .orb-b { animation: orb2 22s ease-in-out infinite; will-change: transform; }
        .orb-c { animation: orb3 14s ease-in-out infinite; will-change: transform; }

        @keyframes spin-cw  { to { transform: rotate(360deg);  } }
        @keyframes spin-ccw { to { transform: rotate(-360deg); } }
        .ring-cw  { animation: spin-cw  35s linear infinite; will-change: transform; }
        .ring-ccw { animation: spin-ccw 25s linear infinite; will-change: transform; }

        @keyframes gridBreathe { 0%,100%{opacity:0.05} 50%{opacity:0.12} }
        .grid-breathe { animation: gridBreathe 7s ease-in-out infinite; }

        @keyframes particle {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          5%   { opacity: 0.8; }
          90%  { opacity: 0.3; }
          100% { transform: translateY(-110vh) scale(0.4); opacity: 0; }
        }
        .particle { animation: particle linear infinite; will-change: transform; }

        @keyframes shimmerBtn { 0%{left:-120%} 100%{left:220%} }
        .btn-shine::after {
          content: '';
          position: absolute;
          top: 0; left: -120%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmerBtn 2.4s ease-in-out infinite;
          pointer-events: none;
        }

        /* ── Pulso de brillo en los orbes — el propio blur "respira" ── */
        @keyframes orbPulse {
          0%,100% { filter: blur(45px) brightness(1);   opacity: 1;    }
          50%      { filter: blur(38px) brightness(1.25); opacity: 0.88; }
        }
        @keyframes orbPulse2 {
          0%,100% { filter: blur(45px) brightness(1);   opacity: 1;    }
          50%      { filter: blur(36px) brightness(1.3);  opacity: 0.85; }
        }
        @keyframes orbPulse3 {
          0%,100% { filter: blur(38px) brightness(1);   opacity: 1;    }
          50%      { filter: blur(30px) brightness(1.35); opacity: 0.8;  }
        }
        /* Las clases de traslación ya llevan su movimiento; añadimos el pulso de brillo separado */
        .orb-pulse-a { animation: orb1 18s ease-in-out infinite, orbPulse  6s ease-in-out infinite; will-change: transform, filter; }
        .orb-pulse-b { animation: orb2 22s ease-in-out infinite, orbPulse2 8s ease-in-out infinite; will-change: transform, filter; }
        .orb-pulse-c { animation: orb3 14s ease-in-out infinite, orbPulse3 5s ease-in-out infinite; will-change: transform, filter; }
        @keyframes orb4 {
          0%,100% { transform:translate(0,0) scale(1); }
          33%      { transform:translate(-40px,35px) scale(1.07); }
          66%      { transform:translate(30px,-25px) scale(0.93); }
        }
        @keyframes orb5 {
          0%,100% { transform:translate(0,0) scale(1); }
          40%      { transform:translate(25px,40px) scale(1.1); }
          80%      { transform:translate(-20px,10px) scale(0.95); }
        }
        .orb-d { animation: orb4 16s ease-in-out infinite, orbPulse2 7s ease-in-out infinite 2s; will-change:transform,filter; }
        .orb-e { animation: orb5 20s ease-in-out infinite, orbPulse3 9s ease-in-out infinite 1s; will-change:transform,filter; }

        /* ── Mobile orbs ── */
        @keyframes mobileOrb1 {
          0%,100%{ transform:translate(0,0) scale(1); }
          50%    { transform:translate(30px,20px) scale(1.15); }
        }
        @keyframes mobileOrb2 {
          0%,100%{ transform:translate(0,0) scale(1); }
          50%    { transform:translate(-25px,-20px) scale(1.1); }
        }
        .m-orb-a { animation: mobileOrb1 8s ease-in-out infinite; }
        .m-orb-b { animation: mobileOrb2 10s ease-in-out infinite; }
      `}</style>

      <div className="flex min-h-screen w-full overflow-hidden font-display text-slate-900 dark:text-white">

        {/* ══════ PANEL IZQUIERDO (solo desktop ≥ lg) ══════ */}
        <div className="hidden lg:flex w-[52%] relative flex-col items-center justify-center bg-[#03071a] overflow-hidden select-none">

          {/* Fondo base gradient animado */}
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse at top left, #0d2360 0%, #03071a 55%), radial-gradient(ellipse at bottom right, #1a0a40 0%, #03071a 60%)"
          }} />

          {/* Grid */}
          <div className="grid-breathe absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(120,130,255,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(120,130,255,0.2) 1px,transparent 1px)",
            backgroundSize: "52px 52px"
          }} />

          {/* Orbes — 5 en total con pulso de brillo propio */}
          <div className="orb-pulse-a absolute" style={{
            top: "5%", left: "-6%",
            width: 580, height: 580, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.72) 0%, rgba(37,99,235,0.35) 40%, transparent 68%)",
          }} />
          <div className="orb-pulse-b absolute" style={{
            bottom: "3%", right: "-6%",
            width: 540, height: 540, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.68) 0%, rgba(79,70,229,0.3) 40%, transparent 68%)",
          }} />
          <div className="orb-pulse-c absolute" style={{
            top: "40%", left: "50%",
            width: 340, height: 340, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(167,139,250,0.55) 0%, rgba(139,92,246,0.25) 45%, transparent 68%)",
          }} />
          {/* Orbes extra — dan más riqueza visual */}
          <div className="orb-d absolute" style={{
            top: "25%", left: "-10%",
            width: 320, height: 320, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(14,165,233,0.2) 50%, transparent 72%)",
            filter: "blur(42px)"
          }} />
          <div className="orb-e absolute" style={{
            bottom: "20%", right: "30%",
            width: 280, height: 280, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(129,140,248,0.5) 0%, rgba(99,102,241,0.2) 50%, transparent 72%)",
            filter: "blur(40px)"
          }} />

          {/* Anillos giratorios */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="ring-cw opacity-[0.12]" width="720" height="720" viewBox="0 0 720 720">
              <circle cx="360" cy="360" r="290" fill="none" stroke="url(#g1)" strokeWidth="1.5" strokeDasharray="14 22" />
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="ring-ccw opacity-[0.09]" width="520" height="520" viewBox="0 0 520 520">
              <circle cx="260" cy="260" r="200" fill="none" stroke="rgba(139,92,246,1)" strokeWidth="1" strokeDasharray="7 16" />
            </svg>
          </div>

          {/* Partículas flotantes */}
          {[...Array(14)].map((_, i) => (
            <div key={i} className="particle absolute bottom-0 rounded-full" style={{
              left: `${(i * 7.1) % 100}%`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              background: i % 3 === 0 ? "rgba(139,92,246,0.8)" : i % 3 === 1 ? "rgba(99,102,241,0.8)" : "rgba(59,130,246,0.8)",
              animationDuration: `${9 + i * 1.2}s`,
              animationDelay: `${i * 0.85}s`,
            }} />
          ))}

          {/* Contenido central — logo predomina */}
          <div className="relative z-10 flex flex-col items-center text-center gap-6 max-w-[460px] px-10">
            <motion.img
              src="/logo.png"
              alt="Logo Compers"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[380px] object-contain brightness-0 invert drop-shadow-[0_0_60px_rgba(99,102,241,0.65)]"
            />

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.35 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-slate-400 text-sm font-medium leading-relaxed tracking-wide">
                Gestiona tickets y reportes con<br />eficiencia, seguridad y velocidad.
              </p>
              {/* Línea decorativa — más ancha y visible */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.55, ease: "easeOut" }}
                className="w-36 h-[2px] rounded-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
                style={{ boxShadow: "0 0 6px 1px rgba(99,102,241,0.22)" }}
              />
            </motion.div>
          </div>

          {/* Línea divisoria lateral */}
          <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-indigo-500/50 to-transparent" />
        </div>

        {/* ══════ PANEL DERECHO ══════ */}
        <div className="w-full lg:w-[48%] flex flex-col bg-white dark:bg-[#070d20] relative overflow-hidden">

          {/* Fondo oscuro con orbes en modo dark (y en móvil también) */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Modo claro: gradiente sutil */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 dark:opacity-0" />
            {/* Modo oscuro: orbes tenues en el fondo del panel derecho */}
            <div className="absolute inset-0 opacity-0 dark:opacity-100">
              <div style={{
                position: "absolute", top: "-10%", right: "-15%",
                width: 400, height: 400, borderRadius: "50%",
                background: "radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)",
                filter: "blur(60px)"
              }} />
              <div style={{
                position: "absolute", bottom: "-10%", left: "-10%",
                width: 350, height: 350, borderRadius: "50%",
                background: "radial-gradient(circle,rgba(59,130,246,0.15) 0%,transparent 70%)",
                filter: "blur(55px)"
              }} />
            </div>
          </div>

          {/* ── FORMULARIO ── */}
          <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[390px] flex flex-col gap-7"
            >
              {/* Encabezado */}
              <div className="flex flex-col gap-2">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-0.5"
                >
                  <span className="material-symbols-rounded text-white text-xl">login</span>
                </motion.div>
                <h1 className="text-3xl md:text-[2.1rem] font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  Iniciar Sesión
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-[14px] font-medium">
                  Ingresa tus credenciales para acceder al sistema.
                </p>
              </div>

              {/* Error */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold">
                      <span className="material-symbols-rounded text-[18px] shrink-0">error_outline</span>
                      {errorMessage}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* FORM */}
              <form onSubmit={handleLogin} className="flex flex-col gap-4" autoComplete="off" noValidate>

                {/* ── CAMPO USUARIO ── */}
                <motion.div
                  key={`su-${shakeKey}-${fieldShake.email ?? 0}`}
                  animate={hasError || fieldErrors.email ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="flex flex-col gap-1"
                >
                  <label className="text-[10.5px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 ml-0.5">
                    Usuario
                  </label>
                  <motion.div
                    animate={focused === "email"
                      ? { scale: 1.01, transition: { duration: 0.18 } }
                      : { scale: 1, transition: { duration: 0.18 } }
                    }
                    className={`relative rounded-2xl border transition-colors duration-200 ${getFieldClass("email")}`}
                  >
                    <motion.span
                      animate={{
                        color: focused === "email" ? "#3b82f6" : hasError ? "#f43f5e" : "#94a3b8",
                        scale: focused === "email" ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                      className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-[20px] pointer-events-none z-10 origin-center"
                    >
                      person
                    </motion.span>
                    <input
                      type="text"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      autoComplete="off"
                      placeholder="Ej: Juan.Perez"
                      className="w-full pl-11 pr-4 py-[15px] bg-transparent text-[15px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none"
                    />
                    {/* Glow animado al focus */}
                    <AnimatePresence>
                      {focused === "email" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 rounded-2xl pointer-events-none"
                          style={{ boxShadow: "inset 0 0 0 2px rgba(59,130,246,0)", background: "transparent" }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* ── Alerta custom campo usuario ── */}
                  <AnimatePresence>
                    {fieldErrors.email && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -4, height: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-1.5 px-1 pt-1">
                          <span className="material-symbols-rounded text-rose-500 dark:text-rose-400 text-[15px] shrink-0">error</span>
                          <p className="text-rose-500 dark:text-rose-400 text-[12px] font-semibold">{fieldErrors.email}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* ── CAMPO CONTRASEÑA ── */}
                <motion.div
                  key={`sp-${shakeKey}-${fieldShake.password ?? 0}`}
                  animate={hasError || fieldErrors.password ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut", delay: 0.05 }}
                  className="flex flex-col gap-1"
                >
                  <label className="text-[10.5px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 ml-0.5">
                    Contraseña
                  </label>
                  <motion.div
                    animate={focused === "password"
                      ? { scale: 1.01, transition: { duration: 0.18 } }
                      : { scale: 1, transition: { duration: 0.18 } }
                    }
                    className={`relative rounded-2xl border transition-colors duration-200 ${getFieldClass("password")}`}
                  >
                    <motion.span
                      animate={{
                        color: focused === "password" ? "#3b82f6" : hasError ? "#f43f5e" : "#94a3b8",
                        scale: focused === "password" ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                      className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-[20px] pointer-events-none z-10 origin-center"
                    >
                      lock
                    </motion.span>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-[15px] bg-transparent text-[15px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none"
                    />
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.78, rotate: 15 }}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-150 z-10"
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={showPassword ? "off" : "on"}
                          initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
                          transition={{ duration: 0.18 }}
                          className="material-symbols-rounded text-[20px] block"
                        >
                          {showPassword ? "visibility_off" : "visibility"}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>

                  {/* ── Alerta custom campo contraseña ── */}
                  <AnimatePresence>
                    {fieldErrors.password && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -4, height: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-1.5 px-1 pt-1">
                          <span className="material-symbols-rounded text-rose-500 dark:text-rose-400 text-[15px] shrink-0">error</span>
                          <p className="text-rose-500 dark:text-rose-400 text-[12px] font-semibold">{fieldErrors.password}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* ── BOTÓN ── */}
                <motion.button
                  type="submit"
                  whileHover={!isLoading ? { scale: 1.02, y: -1.5 } : {}}
                  whileTap={!isLoading ? { scale: 0.97 } : {}}
                  disabled={isLoading}
                  className={`relative mt-1 w-full h-[54px] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 overflow-hidden transition-all duration-300
                    ${isLoading
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 btn-shine"
                    }`}
                >
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div key="loading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2">
                        <span className="material-symbols-rounded animate-spin text-xl">progress_activity</span>
                        <span>Validando acceso...</span>
                      </motion.div>
                    ) : (
                      <motion.div key="idle"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="flex items-center gap-2">
                        <span>Ingresar al Sistema</span>
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ repeat: Infinity, duration: 1.7, ease: "easeInOut" }}
                          className="material-symbols-rounded text-xl"
                        >
                          arrow_forward
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 font-medium">
                © {new Date().getFullYear()} Compers · Aluminio, Vidrio y Herrajes
              </p>
            </motion.div>
          </div>
        </div>

      </div>
    </>
  );
};
