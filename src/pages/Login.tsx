import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import { getRoles } from "../services/roleService";
import { motion, AnimatePresence } from "framer-motion";

export const Login = () => {
  const navigate = useNavigate();

  // 1. VERIFICACIÓN DE SESIÓN (Redirigir si ya está logueado)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");

    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        const userRoleId = Number(user.iIdRol || user.ildRol || user.idRole || 0);
        const PRIVILEGED_IDS = [32];
        const isPrivileged = PRIVILEGED_IDS.includes(userRoleId);

        // Redirección inteligente basada en rol
        if (isPrivileged) {
          navigate("/", { replace: true });
        } else {
          navigate("/my-tasks", { replace: true });
        }
      } catch (e) {
        navigate("/", { replace: true });
      }
    }
  }, [navigate]);

  // Estados del Formulario
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0); // Trigger para el shake de iOS/Android

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,  
      [name]: value,
    }));
    if (errorMessage) setErrorMessage(null); // Limpiar error al escribir
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // A) Llamada a la API de Login
      const result = await loginUser(formData.email, formData.password);

      // B) Cargar Roles extra (Intento no crítico)
      try {
        const rolesDB = await getRoles();
        const rolesMap: Record<string, number> = {};
        rolesDB.forEach((role) => {
          if (role.sRol) rolesMap[role.sRol.toUpperCase()] = role.iIdRol;
        });
        localStorage.setItem("rolesMap", JSON.stringify(rolesMap));
      } catch (err) {
        console.warn("No se cargaron roles extra (no crítico)");
      }

      // --- C) GUARDADO DE SESIÓN ESTANDARIZADO ---
      localStorage.setItem("token", result.sToken);
      localStorage.setItem("user", JSON.stringify(result));
      localStorage.setItem("isAuthenticated", "true");
      // ---------------------------------------------

      // D) Redirección Inteligente basada en Rol
      const userRoleId = Number(result.iIdRol || result.ildRol || result.idRole || 0);
      const PRIVILEGED_IDS = [32];
      const isPrivileged = PRIVILEGED_IDS.includes(userRoleId);

      if (isPrivileged) {
          navigate("/", { replace: true }); // Admin y Soporte al Dashboard
      } else {
          navigate("/my-tasks", { replace: true }); // Colaboradores y Dirección a Tareas
      }

    } catch (error) {
      console.error("Error de login:", error);
      setErrorMessage("Usuario o contraseña incorrectos.");
      setShakeKey((prev) => prev + 1); // Dispara la micro-animación de error
    } finally {
      setIsLoading(false);
    }
  };

  // --- HELPER DE ESTILOS DE INPUT PREMIUM ---
  const inputStyle = `w-full pl-[52px] pr-5 py-4 bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/80 rounded-[20px] text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-all duration-300 focus:bg-white dark:focus:bg-[#131c2f] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 font-medium shadow-inner relative z-10`;

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white font-display overflow-hidden">
      {/* SECCIÓN IZQUIERDA (Estética & Logo) */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center bg-[#0f172a] overflow-hidden border-r border-slate-800">
        {/* Globos de luz de fondo */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>

        <div className="relative z-10 p-12 flex flex-col items-center text-center gap-6 max-w-lg">
          {/* LOGO EN BLANCO */}
          <motion.img
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            src="/logo.png"
            alt="Logo Compers"
            className="w-full max-w-[320px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] brightness-0 invert"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-slate-400 text-lg font-medium leading-relaxed mt-4"
          >
            Gestiona tickets y reportes con eficiencia, seguridad y velocidad.
          </motion.p>
        </div>
      </div>

      {/* SECCIÓN DERECHA (Formulario MODERNO SIN MARCO) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative bg-slate-50/50 dark:bg-[#0f172a]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[420px] flex flex-col gap-8 z-10"
        >
          <div className="flex flex-col gap-2">
            <div className="w-14 h-14 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-[20px] flex items-center justify-center mb-2 border border-blue-500/20 shadow-sm">
              <span className="material-symbols-rounded text-3xl">login</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          {/* ALERTA DE ERROR */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center gap-3 shadow-sm">
                  <span className="material-symbols-rounded text-xl">
                    error_outline
                  </span>
                  {errorMessage}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FORMULARIO PREMIUM (Autocomplete bloqueado) */}
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-6"
            autoComplete="off"
          >
            {/* INPUT USUARIO */}
            <div className="flex flex-col group space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1 group-focus-within:text-blue-500 transition-colors">
                Usuario
              </label>
              <motion.div
                key={`shake-email-${shakeKey}`}
                animate={errorMessage ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="relative w-full"
              >
                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 z-20 text-[22px] transition-colors duration-300 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 pointer-events-none">
                  person
                </span>
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="off" // Prevenir autocompletado del navegador
                  placeholder="Ej: Juan.Perez"
                  className={`${inputStyle} ${errorMessage ? "border-rose-500 ring-2 ring-rose-500/20" : ""}`}
                />
              </motion.div>
            </div>

            {/* INPUT CONTRASEÑA */}
            <div className="flex flex-col group space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1 group-focus-within:text-blue-500 transition-colors">
                Contraseña
              </label>
              <motion.div
                key={`shake-pass-${shakeKey}`}
                animate={errorMessage ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut", delay: 0.05 }}
                className="relative w-full"
              >
                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 z-20 text-[22px] transition-colors duration-300 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 pointer-events-none">
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password" // Prevenir autocompletado del navegador
                  placeholder="••••••••"
                  className={`${inputStyle} pr-14 ${errorMessage ? "border-rose-500 ring-2 ring-rose-500/20" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 z-20 rounded-xl transition-all duration-200"
                >
                  <span className="material-symbols-rounded text-[22px] block select-none">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </motion.div>
            </div>

            {/* BOTÓN DE LOGIN PREMIUM (Micro-animaciones fluidas) */}
            <motion.button
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
              disabled={isLoading}
              className={`mt-4 w-full h-[60px] rounded-full font-bold text-[16px] flex items-center justify-center gap-2 transition-all duration-300 ${
                isLoading
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_25px_rgba(37,99,235,0.4)] border border-blue-500/50"
              }`}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-rounded animate-spin text-[24px]">
                    progress_activity
                  </span>
                  Validando Acceso...
                </>
              ) : (
                <>
                  Ingresar al Sistema
                  <span className="material-symbols-rounded text-[24px]">
                    arrow_forward
                  </span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};