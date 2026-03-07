import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";

interface Role { iIdRol: number; sRol: string; }
interface Department { iIdDepartment: number; sDepartment: string; }
interface Branch { iIdBranch: number; sBranch: string; }

const CURRENT_USER_ID = 33;

const LETTER_COLORS: Record<string, { from: string; to: string; shadow: string }> = {
  A: { from: "#3b82f6", to: "#6366f1", shadow: "rgba(99,102,241,0.4)" },
  B: { from: "#06b6d4", to: "#0ea5e9", shadow: "rgba(14,165,233,0.4)" },
  C: { from: "#10b981", to: "#059669", shadow: "rgba(16,185,129,0.4)" },
  D: { from: "#f59e0b", to: "#f97316", shadow: "rgba(249,115,22,0.4)" },
  E: { from: "#8b5cf6", to: "#a855f7", shadow: "rgba(168,85,247,0.4)" },
  F: { from: "#ec4899", to: "#f43f5e", shadow: "rgba(244,63,94,0.4)" },
  G: { from: "#14b8a6", to: "#0d9488", shadow: "rgba(20,184,166,0.4)" },
  H: { from: "#6366f1", to: "#4f46e5", shadow: "rgba(79,70,229,0.4)" },
  I: { from: "#0ea5e9", to: "#2563eb", shadow: "rgba(37,99,235,0.4)" },
  J: { from: "#f97316", to: "#ef4444", shadow: "rgba(239,68,68,0.4)" },
  K: { from: "#a855f7", to: "#7c3aed", shadow: "rgba(124,58,237,0.4)" },
  L: { from: "#22c55e", to: "#16a34a", shadow: "rgba(34,197,94,0.4)" },
  M: { from: "#3b82f6", to: "#1d4ed8", shadow: "rgba(59,130,246,0.4)" },
  N: { from: "#f43f5e", to: "#db2777", shadow: "rgba(219,39,119,0.4)" },
  O: { from: "#fb923c", to: "#f97316", shadow: "rgba(251,146,60,0.4)" },
  P: { from: "#c084fc", to: "#a855f7", shadow: "rgba(192,132,252,0.4)" },
  Q: { from: "#2dd4bf", to: "#14b8a6", shadow: "rgba(45,212,191,0.4)" },
  R: { from: "#f87171", to: "#ef4444", shadow: "rgba(248,113,113,0.4)" },
  S: { from: "#34d399", to: "#10b981", shadow: "rgba(52,211,153,0.4)" },
  T: { from: "#60a5fa", to: "#3b82f6", shadow: "rgba(96,165,250,0.4)" },
  U: { from: "#f472b6", to: "#ec4899", shadow: "rgba(236,72,153,0.4)" },
  V: { from: "#4ade80", to: "#22c55e", shadow: "rgba(74,222,128,0.4)" },
  W: { from: "#38bdf8", to: "#0ea5e9", shadow: "rgba(56,189,248,0.4)" },
  X: { from: "#fb7185", to: "#f43f5e", shadow: "rgba(251,113,133,0.4)" },
  Y: { from: "#fbbf24", to: "#f59e0b", shadow: "rgba(251,191,36,0.4)" },
  Z: { from: "#a78bfa", to: "#8b5cf6", shadow: "rgba(167,139,250,0.4)" },
};
const DEFAULT_COLOR = { from: "#3b82f6", to: "#6366f1", shadow: "rgba(99,102,241,0.4)" };

const getColorByLetter = (name: string) => {
  const letter = name.trim().charAt(0).toUpperCase();
  return LETTER_COLORS[letter] || DEFAULT_COLOR;
};

const getInitials = (name: string, lastName: string) => {
  const a = name.trim().charAt(0) || '';
  const b = lastName.trim().charAt(0) || '';
  return (a + b).toUpperCase() || 'U';
};

const ROLE_ICONS: Record<string, string> = {
  default: "shield_person",
  admin: "manage_accounts", administrador: "manage_accounts",
  gerente: "supervisor_account", manager: "supervisor_account",
  vendedor: "storefront", ventas: "storefront",
  almacen: "warehouse", almacén: "warehouse",
  contabilidad: "calculate", contador: "calculate",
  rrhh: "diversity_3", recursos: "diversity_3",
  soporte: "support_agent", técnico: "build",
  director: "stars", supervisor: "person_check",
};

const DEPT_ICONS: Record<string, string> = {
  default: "domain",
  ventas: "storefront", comercial: "shopping_bag",
  finanzas: "account_balance", contabilidad: "calculate",
  ti: "computer", tecnología: "computer", sistemas: "computer",
  rrhh: "diversity_3", "recursos humanos": "diversity_3",
  operaciones: "settings", logística: "local_shipping",
  marketing: "campaign", legal: "gavel",
  producción: "precision_manufacturing", calidad: "verified",
};

const BRANCH_ICONS: Record<string, string> = {
  default: "store",
  matriz: "corporate_fare", principal: "corporate_fare",
  norte: "north", sur: "south", este: "east", oeste: "west",
  cdmx: "location_city", monterrey: "location_city",
  guadalajara: "location_city", puebla: "location_city",
};

const getIconForOption = (label: string, map: Record<string, string>): string => {
  const key = label.toLowerCase();
  for (const [k, icon] of Object.entries(map)) {
    if (k !== "default" && key.includes(k)) return icon;
  }
  return map.default;
};

// ─── Portal pos ────────────────────────────────────────────────────────────
const usePortalPos = () => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const updatePos = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 8, left: r.left + window.scrollX, width: r.width });
  };
  return { triggerRef, pos, updatePos };
};

// ─── CustomSelect ──────────────────────────────────────────────────────────
const CustomSelect = ({ name, value, onChange, options, placeholder, icon, hasError = false, iconMap }: {
  name: string; value: number;
  onChange: (name: string, v: number) => void;
  options: { value: number; label: string }[];
  placeholder: string; icon: string; hasError?: boolean;
  iconMap?: Record<string, string>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, pos, updatePos } = usePortalPos();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // SOLUCIÓN A TS(2503): Tipar correctamente el ref del temporizador
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Ordenar opciones alfabéticamente
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  // SOLUCIÓN A TS(7006): Tipar explícitamente 'o'
  const selected = sortedOptions.find((o: { value: number; label: string }) => o.value === value);

  // FIX: reservar espacio del scrollbar permanentemente para evitar layout shift
  useEffect(() => {
    document.documentElement.style.scrollbarGutter = "stable";
    return () => {
      document.documentElement.style.scrollbarGutter = "";
    };
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node))
        setIsOpen(false);
    };
    const handleScroll = () => { if (isOpen) updatePos(); };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [isOpen, updatePos]);

  // Búsqueda por teclado (Type-to-Select)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar teclas especiales
      if (e.key === 'Escape') {
          setIsOpen(false);
          return;
      }
      
      // Permitir la navegación rápida con teclado
      if (e.key.length === 1 && /[a-zA-Z0-9\s]/i.test(e.key)) {
        const newQuery = searchQuery + e.key.toLowerCase();
        setSearchQuery(newQuery);

        // SOLUCIÓN A TS(7006): Tipar explícitamente 'opt'
        const match = sortedOptions.find((opt: { value: number; label: string }) => opt.label.toLowerCase().startsWith(newQuery));
        
        if (match) {
            // Desplazar la lista hasta el elemento encontrado
            const element = document.getElementById(`option-${name}-${match.value}`);
            if (element && dropdownRef.current) {
                const list = dropdownRef.current.querySelector('ul');
                if (list) {
                     // Calcular la posición para hacer scroll suave
                     const elementTop = element.offsetTop;
                     list.scrollTo({ top: elementTop - 10, behavior: 'smooth' });
                }
            }
        }

        // Limpiar el string de búsqueda después de 1 segundo de inactividad
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
          setSearchQuery("");
        }, 1000);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchQuery, sortedOptions, name]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => { updatePos(); setIsOpen(!isOpen); }}
        // Agregado tabIndex para que el div pueda recibir el foco y capturar eventos de teclado
        tabIndex={0} 
        className={`w-full flex items-center gap-3 px-5 py-4 bg-slate-50 dark:bg-[#0f172a] border rounded-[20px] cursor-pointer transition-all duration-200 select-none shadow-inner group focus:outline-none ${
          hasError
            ? "border-rose-500 ring-2 ring-rose-500/20"
            : isOpen
            ? "bg-white dark:bg-[#131c2f] border-blue-500 ring-4 ring-blue-500/15"
            : "border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
        }`}
      >
        <motion.span
          animate={{ rotate: isOpen ? 10 : 0, scale: isOpen ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
          className={`material-symbols-rounded text-[22px] shrink-0 transition-colors ${
            isOpen || value !== 0 ? "text-blue-500 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-200"
          }`}
        >
          {icon}
        </motion.span>
        <span className={`flex-1 text-[15px] font-medium truncate ${value === 0 ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-white"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={`material-symbols-rounded text-[20px] shrink-0 ${isOpen ? "text-blue-500 dark:text-blue-400" : "text-slate-400"}`}
        >
          expand_more
        </motion.span>
      </div>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 260), zIndex: 9999 }}>
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)] overflow-hidden p-2"
          >
            <ul className="max-h-64 overflow-y-auto flex flex-col gap-0.5 pr-1 comments-scroll">
              {sortedOptions.length === 0
                ? <li className="px-4 py-4 text-sm text-slate-500 text-center font-medium">No hay opciones disponibles</li>
                // SOLUCIÓN A TS(7006): Tipar explícitamente 'opt' e 'i'
                : sortedOptions.map((opt: { value: number; label: string }, i: number) => {
                  const optIcon = iconMap ? getIconForOption(opt.label, iconMap) : "circle";
                  const isSelected = value === opt.value;
                  const isHighlighted = searchQuery && opt.label.toLowerCase().startsWith(searchQuery);

                  return (
                    <motion.li
                      key={opt.value}
                      id={`option-${name}-${opt.value}`} // Añadido ID para el scroll
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.028, duration: 0.15, ease: "easeOut" }}
                      onClick={() => { onChange(name, opt.value); setIsOpen(false); }}
                      whileHover={{ x: 3 }}
                      className={`px-4 py-3 text-[14px] cursor-pointer rounded-xl transition-colors duration-150 flex items-center gap-3 font-semibold ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30"
                          : isHighlighted 
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-transparent"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0f172a]/80 border border-transparent"
                      }`}
                    >
                      <motion.span
                        animate={{ scale: isSelected ? 1 : 0.85, opacity: isSelected ? 1 : 0.55 }}
                        transition={{ duration: 0.2 }}
                        className={`material-symbols-rounded text-[18px] shrink-0 ${isSelected ? "text-blue-500 dark:text-blue-400" : "text-slate-400 dark:text-slate-300"}`}
                      >
                        {optIcon}
                      </motion.span>
                      <span className="truncate tracking-wide">{opt.label}</span>
                      <AnimatePresence>
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.18, type: "spring", stiffness: 300 }}
                            className="material-symbols-rounded text-[16px] text-blue-500 dark:text-blue-400 ml-auto shrink-0"
                          >
                            check_circle
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })
              }
            </ul>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─── ShakeField ────────────────────────────────────────────────────────────
const ShakeField = ({ shake, children }: { shake: boolean; children: React.ReactNode }) => (
  <motion.div
    animate={shake ? { x: [0, -9, 9, -6, 6, -3, 3, 0] } : { x: 0 }}
    transition={{ duration: 0.42, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

// ─── InputField — icono cambia con hover, focus y error ───────────────────
const InputField = ({
  name, type = "text", value, onChange, icon, hasAt, error, placeholder, autoFocus, suffix,
}: {
  name: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: string; hasAt?: boolean;
  error?: boolean | string; placeholder?: string; autoFocus?: boolean;
  suffix?: React.ReactNode;
}) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isError = !!error;

  // Prioridad: error > focus > hover > default
  const iconColor = isError
    ? "text-rose-500"
    : focused
    ? "text-blue-500 dark:text-blue-400"
    : hovered
    ? "text-slate-500 dark:text-slate-200"
    : "text-slate-400";

  const borderClass = isError
    ? "border-rose-500 ring-2 ring-rose-500/20"
    : focused
    ? "bg-white dark:bg-[#131c2f] border-blue-500 ring-4 ring-blue-500/15"
    : "border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600";

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hasAt ? (
        <span className={`absolute left-5 font-black text-[20px] z-20 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none ${iconColor}`}>
          @
        </span>
      ) : icon ? (
        <span className={`material-symbols-rounded absolute left-5 text-[22px] z-20 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none ${iconColor}`}>
          {icon}
        </span>
      ) : null}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        // FIX AUTOCOMPLETE: desactiva sugerencias del navegador
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`w-full ${(hasAt || icon) ? "pl-14" : "pl-5"} ${suffix ? "pr-14" : "pr-5"} py-4 bg-slate-50 dark:bg-[#0f172a] border rounded-[20px] text-[15px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 font-medium shadow-inner relative z-10 ${borderClass}`}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
          {suffix}
        </div>
      )}
    </div>
  );
};

// ─── Toast Alert ───────────────────────────────────────────────────────────
const EmptyFieldsToast = ({ visible, count, onClose }: { visible: boolean; count: number; onClose: () => void }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="fixed bottom-8 left-1/2 z-[9999] -translate-x-1/2 pointer-events-auto"
      >
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white dark:bg-[#1e293b] border border-rose-200 dark:border-rose-500/30 shadow-[0_8px_32px_-8px_rgba(244,63,94,0.4)] backdrop-blur-md min-w-[300px]">
          <motion.div
            animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-rounded text-[18px] text-rose-500 dark:text-rose-400">warning</span>
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
              {count === 1 ? "Falta 1 campo requerido" : `Faltan ${count} campos requeridos`}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Completa los campos marcados para continuar</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors shrink-0"
          >
            <span className="material-symbols-rounded text-[16px]">close</span>
          </motion.button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Pantalla de Éxito — flecha verde animada ─────────────────────────────
const SuccessScreen = ({ username }: { username: string }) => (
  <div className="min-h-[520px] flex flex-col items-center justify-center px-8 py-16 relative overflow-hidden">
    {/* Glow fondo */}
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div className="w-80 h-80 rounded-full bg-emerald-500/6 blur-3xl" />
    </motion.div>

    {/* Icono principal */}
    <div className="relative mb-10 z-10">
      {/* Anillos pulsantes */}
      {[0, 0.55, 1.1].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute rounded-[32px] border border-emerald-400/30 dark:border-emerald-400/20"
          style={{ inset: -(i + 1) * 12 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0], scale: [0.85, 1.15, 1.35] }}
          transition={{ duration: 2, delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Cuadrado redondeado con gradiente — igual que el avatar */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.05 }}
        className="w-28 h-28 rounded-[28px] relative z-10 flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #34d399, #059669)",
          boxShadow: "0 0 56px rgba(52,211,153,0.38), 0 8px 28px rgba(52,211,153,0.22)",
        }}
      >
        {/* Brillo superior igual que el avatar */}
        <div className="absolute inset-0 rounded-[28px] pointer-events-none" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 55%)" }} />

        {/* Flecha animada — entra desde abajo con spring */}
        <motion.span
          initial={{ scale: 0, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.28, type: "spring", stiffness: 260, damping: 18 }}
          className="material-symbols-rounded text-white text-[56px] relative z-10 select-none"
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
        >
          arrow_upward
        </motion.span>
      </motion.div>
    </div>

    {/* Textos */}
    <motion.h2
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.36, duration: 0.4 }}
      className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3 text-center z-10"
    >
      ¡Perfil Creado!
    </motion.h2>

    <motion.p
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.46, duration: 0.38 }}
      className="text-slate-600 dark:text-slate-400 text-[16px] text-center max-w-sm leading-relaxed z-10"
    >
      El usuario{" "}
      <motion.span
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
        className="font-bold text-blue-600 dark:text-blue-400"
      >
        @{username}
      </motion.span>{" "}
      está listo para operar en el sistema.
    </motion.p>

    {/* Chip */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.68, duration: 0.35 }}
      className="flex items-center gap-2 mt-8 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 z-10"
    >
      <span className="material-symbols-rounded text-[14px] text-emerald-500 dark:text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
      <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">Cuenta activa</span>
    </motion.div>

    {/* Redirect */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.0 }}
      className="flex items-center gap-2 mt-4 z-10"
    >
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        className="material-symbols-rounded text-[15px] text-slate-400 dark:text-slate-500"
      >
        progress_activity
      </motion.span>
      <span className="text-[12px] text-slate-500 font-medium">Redirigiendo al directorio...</span>
    </motion.div>
  </div>
);

// ─── Main ──────────────────────────────────────────────────────────────────
export const CreateUser = () => {
  const navigate = useNavigate();
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: boolean | string }>({});
  const [shakeFields, setShakeFields] = useState<{ [key: string]: boolean }>({});
  const [showToast, setShowToast] = useState(false);
  const [emptyCount, setEmptyCount] = useState(0);

  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [deptsList, setDeptsList] = useState<Department[]>([]);
  const [branchesList, setBranchesList] = useState<Branch[]>([]);
  const [formData, setFormData] = useState({
    sName: "", sLastName: "", sUser: "", sPass: "",
    iIdRol: 0, iIdDepartment: 0, iIdBranch: 0,
    iIdUserCreate: CURRENT_USER_ID
  });

  const initials = getInitials(formData.sName, formData.sLastName);
  const avatarColor = getColorByLetter(formData.sName || formData.sLastName);

  useEffect(() => {
    // Forzamos el scroll al principio de la página al montarse
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    if (showToast) {
      const t = setTimeout(() => setShowToast(false), 3500);
      return () => clearTimeout(t);
    }
  }, [showToast]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const fetchCached = async (key: string, url: string) => {
            const cached = sessionStorage.getItem(key);
            if (cached) return JSON.parse(cached);
            const res = await fetch(url);
            const data = await res.json();
            sessionStorage.setItem(key, JSON.stringify(data));
            return data;
        };

        const [r, d, b] = await Promise.all([
          fetchCached('app_roles', "https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/general/roles"),
          fetchCached('app_departments', "https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/general/departments"),
          fetchCached('app_branches', "https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/general/branches")
        ]);
        
        setRolesList(r);
        setDeptsList(d);
        setBranchesList(b);
      } catch {
        setStatusMessage({ type: 'error', text: 'Error de conexión con el servidor de catálogos.' });
      } finally {
        setIsLoadingLists(false);
      }
    };
    if (CURRENT_USER_ID === 33) fetchOptions();
  }, []);

  const triggerShake = (fields: string[]) => {
    const map: { [k: string]: boolean } = {};
    fields.forEach(f => { map[f] = true; });
    setShakeFields(map);
    setTimeout(() => setShakeFields({}), 500);
  };

  const handleClear = () => {
    setFormData({ sName: "", sLastName: "", sUser: "", sPass: "", iIdRol: 0, iIdDepartment: 0, iIdBranch: 0, iIdUserCreate: CURRENT_USER_ID });
    setErrors({});
    setStatusMessage(null);
    setShowToast(false);
  };

  const hasAnyData = formData.sName || formData.sLastName || formData.sUser || formData.sPass || formData.iIdRol || formData.iIdDepartment || formData.iIdBranch;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleSelectChange = (name: string, value: number) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    const newErrors: { [key: string]: boolean | string } = {};
    if (!formData.sName) newErrors.sName = true;
    if (!formData.sLastName) newErrors.sLastName = true;
    if (!formData.sUser) newErrors.sUser = true;
    else if (/\s/.test(formData.sUser)) newErrors.sUser = "El usuario no puede contener espacios.";
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!formData.sPass) newErrors.sPass = true;
    else if (!passwordRegex.test(formData.sPass)) newErrors.sPass = "Mínimo 6 caracteres, 1 mayúscula y 1 número.";
    if (formData.iIdRol === 0) newErrors.iIdRol = true;
    if (formData.iIdDepartment === 0) newErrors.iIdDepartment = true;
    if (formData.iIdBranch === 0) newErrors.iIdBranch = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      triggerShake(Object.keys(newErrors));
      setEmptyCount(Object.keys(newErrors).length);
      setShowToast(true);
      const specificError = Object.values(newErrors).find(err => typeof err === 'string');
      if (specificError) setStatusMessage({ type: 'error', text: specificError as string });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch("https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/users/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      let data;
      const ct = response.headers.get("content-type");
      if (ct && ct.includes("application/json")) data = await response.json();
      else { const text = await response.text(); throw new Error(text || `Error: ${response.status}`); }
      if (response.ok) { setIsSuccess(true); setTimeout(() => navigate('/users'), 3000); }
      else throw new Error(data.message || "Error al crear el usuario");
    } catch (error: any) {
      setStatusMessage({ type: 'error', text: error.message || 'Error al intentar registrar al usuario.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = (fieldName: string) => {
    const error = errors[fieldName];
    if (typeof error === 'string') {
      return (
        <motion.p
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          className="text-rose-500 text-[11px] mt-2 ml-2 font-bold uppercase tracking-wider flex items-center gap-1"
        >
          <span className="material-symbols-rounded text-[14px]">error</span>{error}
        </motion.p>
      );
    }
    return null;
  };

  if (CURRENT_USER_ID !== 33) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-900 dark:text-slate-500">
        <span className="material-symbols-rounded text-6xl mb-4 text-rose-500 opacity-80">lock</span>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Acceso Restringido</h2>
      </div>
    );
  }

  const labelStyle = "text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2 group-focus-within:text-blue-500 transition-colors";

  return (
    <>
      <EmptyFieldsToast visible={showToast} count={emptyCount} onClose={() => setShowToast(false)} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col gap-8 w-full max-w-[1100px] mx-auto pb-16 font-display"
      >
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex items-center gap-5 px-2">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigate('/users')}
            className="w-12 h-12 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0f172a] hover:text-slate-900 dark:hover:text-white transition-all shadow-md">
            <span className="material-symbols-rounded text-[22px]">arrow_back</span>
          </motion.button>
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">Nuevo Usuario</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[15px] mt-1.5 font-medium">Registra un nuevo colaborador en el ecosistema.</p>
          </div>
          <AnimatePresence>
            {hasAnyData && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8, x: 12 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 12 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/5 transition-all text-[13px] font-bold tracking-wide shadow-sm"
              >
                <motion.span
                  className="material-symbols-rounded text-[18px]"
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.35 }}
                >
                  restart_alt
                </motion.span>
                Limpiar
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="relative">
          {isLoadingLists && (
            <div className="absolute inset-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md z-50 flex items-center justify-center rounded-[32px]">
              <div className="flex flex-col items-center gap-4">
                <span className="material-symbols-rounded animate-spin text-4xl text-blue-500">progress_activity</span>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">Sincronizando...</p>
              </div>
            </div>
          )}

          {isSuccess ? (
            <Card className="shadow-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden">
              <SuccessScreen username={formData.sUser} />
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className={`flex flex-col gap-8 transition-opacity duration-300 ${isSubmitting ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

              <AnimatePresence>
                {statusMessage && statusMessage.type === 'error' && (
                  <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
                    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-center gap-3 shadow-sm dark:shadow-lg">
                      <span className="material-symbols-rounded shrink-0">error</span>
                      <p className="font-medium text-sm">{statusMessage.text}</p>
                      <button type="button" onClick={() => setStatusMessage(null)} className="ml-auto hover:text-rose-800 dark:hover:text-rose-300 transition-colors">
                        <span className="material-symbols-rounded text-[18px]">close</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SECCIÓN 1 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                <Card className="p-8 md:p-10 shadow-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-visible">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3 flex flex-col items-center md:items-start text-center md:text-left pt-2">
                      <div className="relative w-24 h-24 mb-6">
                        <motion.div
                          className="absolute inset-0 rounded-[24px]"
                          animate={{
                            background: `linear-gradient(135deg, ${avatarColor.from}, ${avatarColor.to})`,
                            boxShadow: `0 10px 36px -8px ${avatarColor.shadow}, 0 0 0 4px var(--tw-prose-body, transparent), 0 0 0 5px ${avatarColor.from}30`,
                          }}
                          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                        />
                        <div className="absolute inset-0 rounded-[24px] pointer-events-none" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.15) 0%, transparent 55%)" }} />
                        <div className="absolute inset-0 flex items-center justify-center rounded-[24px] overflow-hidden">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={initials}
                              initial={{ scale: 0.4, opacity: 0, y: 6 }}
                              animate={{ scale: 1, opacity: 1, y: 0 }}
                              exit={{ scale: 0.4, opacity: 0, y: -6 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="text-white text-3xl font-black tracking-widest select-none relative z-10"
                            >
                              {initials}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Cuenta de Usuario</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">Configura la identidad y credenciales de acceso para el nuevo colaborador.</p>
                    </div>

                    <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                      <div className="relative">
                        <label className={labelStyle}>Nombre(s) <span className="text-rose-500">*</span></label>
                        <ShakeField shake={!!shakeFields.sName}>
                          <div className="mt-2">
                            {/* ELIMINADO autoFocus */}
                            <InputField name="sName" value={formData.sName} onChange={handleChange}
                              icon="person" error={errors.sName} placeholder="Ej. Daniel" />
                          </div>
                        </ShakeField>
                        {renderError('sName')}
                      </div>

                      <div className="relative">
                        <label className={labelStyle}>Apellidos <span className="text-rose-500">*</span></label>
                        <ShakeField shake={!!shakeFields.sLastName}>
                          <div className="mt-2">
                            <InputField name="sLastName" value={formData.sLastName} onChange={handleChange}
                              icon="group" error={errors.sLastName} placeholder="Ej. Ortiz" />
                          </div>
                        </ShakeField>
                        {renderError('sLastName')}
                      </div>

                      <div className="relative">
                        <label className={labelStyle}>Nombre de Usuario <span className="text-rose-500">*</span></label>
                        <ShakeField shake={!!shakeFields.sUser}>
                          <div className="mt-2">
                            <InputField name="sUser" value={formData.sUser} onChange={handleChange}
                              hasAt error={errors.sUser} placeholder="dani.ortiz" />
                          </div>
                        </ShakeField>
                        {renderError('sUser')}
                      </div>

                      <div className="relative">
                        <label className={labelStyle}>Contraseña <span className="text-rose-500">*</span></label>
                        <ShakeField shake={!!shakeFields.sPass}>
                          <div className="mt-2">
                            <InputField
                              name="sPass"
                              type={showPassword ? "text" : "password"}
                              value={formData.sPass}
                              onChange={handleChange}
                              icon="lock"
                              error={errors.sPass}
                              placeholder="••••••••"
                              suffix={
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.12 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="p-1.5 text-slate-400 hover:text-blue-500 rounded-xl transition-all duration-200"
                                >
                                  <span className="material-symbols-rounded text-[22px] block">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                  </span>
                                </motion.button>
                              }
                            />
                          </div>
                        </ShakeField>
                        {renderError('sPass')}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* SECCIÓN 2 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                <Card className="p-8 md:p-10 shadow-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-visible">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3 flex flex-col items-center md:items-start text-center md:text-left pt-2">
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-500 flex items-center justify-center shadow-inner mb-6">
                        <span className="material-symbols-rounded text-3xl">work_outline</span>
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Rol y Ubicación</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">Define los permisos del usuario y asígnale un área de trabajo.</p>
                    </div>

                    <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                      <div className="relative md:col-span-2">
                        <label className={labelStyle}>Rol del Sistema <span className="text-rose-500">*</span></label>
                        <ShakeField shake={!!shakeFields.iIdRol}>
                          <div className="mt-2">
                            <CustomSelect name="iIdRol" value={formData.iIdRol} onChange={handleSelectChange}
                              hasError={!!errors.iIdRol} placeholder="Seleccionar Nivel de Acceso..." icon="admin_panel_settings"
                              iconMap={ROLE_ICONS}
                              options={rolesList.map(r => ({ value: r.iIdRol, label: r.sRol }))} />
                          </div>
                        </ShakeField>
                      </div>

                      <div className="relative">
                        <label className={labelStyle}>Departamento <span className="text-rose-500">*</span></label>
                        <ShakeField shake={!!shakeFields.iIdDepartment}>
                          <div className="mt-2">
                            <CustomSelect name="iIdDepartment" value={formData.iIdDepartment} onChange={handleSelectChange}
                              hasError={!!errors.iIdDepartment} placeholder="Elegir Depto..." icon="domain"
                              iconMap={DEPT_ICONS}
                              options={deptsList.map(d => ({ value: d.iIdDepartment, label: d.sDepartment }))} />
                          </div>
                        </ShakeField>
                      </div>

                      <div className="relative">
                        <label className={labelStyle}>Sucursal <span className="text-rose-500">*</span></label>
                        <ShakeField shake={!!shakeFields.iIdBranch}>
                          <div className="mt-2">
                            <CustomSelect name="iIdBranch" value={formData.iIdBranch} onChange={handleSelectChange}
                              hasError={!!errors.iIdBranch} placeholder="Elegir Sucursal..." icon="store"
                              iconMap={BRANCH_ICONS}
                              options={branchesList.map(b => ({ value: b.iIdBranch, label: b.sBranch }))} />
                          </div>
                        </ShakeField>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* FOOTER */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 mt-2">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/users')}
                  className="w-full sm:w-auto px-8 py-4 rounded-full border border-slate-300 dark:border-slate-700 text-[15px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-sm">
                  Cancelar
                </motion.button>
                <motion.button type="submit" whileHover={!isSubmitting ? { scale: 1.02 } : {}} whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                  disabled={isSubmitting || isLoadingLists}
                  className={`w-full sm:w-auto px-10 py-4 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition-all ${
                    isSubmitting || isLoadingLists
                      ? "bg-slate-100 dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent dark:border-slate-800 shadow-none"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] dark:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_10px_25px_rgba(37,99,235,0.3)] dark:shadow-[0_0_30px_rgba(59,130,246,0.5)] border border-blue-500/50"
                  }`}>
                  {isSubmitting
                    ? <><span className="material-symbols-rounded animate-spin text-[22px]">progress_activity</span><span>Creando Perfil...</span></>
                    : <><span className="material-symbols-rounded text-[22px]">person_add</span><span>Guardar Usuario</span></>}
                </motion.button>
              </motion.div>

            </form>
          )}
        </div>
      </motion.div>
    </>
  );
};