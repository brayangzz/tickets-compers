import React, { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useTheme } from "../../hooks/useTheme";
import {
  clearAuthStoragePreserveTheme,
  getLocalStorageJSON,
} from "../../utils/storage";

// ─── Avatar ───────────────────────────────────────────────────────────────────
const UserAvatar = ({ name }: { name: string }) => {
  const initial = name.charAt(0).toUpperCase() || "U";
  const gradients = [
    "from-blue-500 to-indigo-600",
    "from-violet-500 to-purple-600",
    "from-emerald-400 to-teal-600",
    "from-orange-400 to-rose-500",
    "from-cyan-400 to-blue-600",
    "from-fuchsia-500 to-pink-600",
  ];
  const idx = Math.abs((initial.charCodeAt(0) - 65) % gradients.length);
  const gradient = gradients[idx];

  return (
    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-extrabold text-base shadow-lg ring-2 ring-white/10 shrink-0`}>
      {initial}
    </div>
  );
};

// ─── NavItem ──────────────────────────────────────────────────────────────────
const NavItem = ({
  to, icon, label, onClose, rotateIcon = false, exact = false,
}: {
  to: string; icon: string; label: string; onClose?: () => void; rotateIcon?: boolean; exact?: boolean;
}) => (
  <div className="mx-2">
    <NavLink to={to} onClick={onClose} end={exact}>
      {({ isActive }) => (
        <motion.div
          whileHover={!isActive ? { x: 3 } : {}}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className={cn(
            "relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl cursor-pointer select-none overflow-hidden",
            "transition-colors duration-200",
            isActive
              ? "bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white font-semibold"
          )}
        >
          {/* Brillo interior — solo CSS, sin layoutId para evitar bugs */}
          {isActive && (
            <span className="absolute inset-0 bg-gradient-to-r from-white/15 to-transparent pointer-events-none rounded-2xl" />
          )}

          {/* Ícono */}
          <motion.span
            animate={isActive ? { scale: 1.12, rotate: rotateIcon ? -6 : 0 } : { scale: 1, rotate: 0 }}
            whileHover={!isActive ? { scale: 1.18, rotate: rotateIcon ? -8 : 0 } : {}}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="material-symbols-rounded text-[22px] shrink-0 relative z-10"
          >
            {icon}
          </motion.span>

          {/* Label */}
          <span className="text-[15px] tracking-wide flex-1 relative z-10">{label}</span>

          {/* Chevron hover (solo inactivos) */}
          {!isActive && (
            <span className="material-symbols-rounded text-[15px] opacity-0 group-hover:opacity-40 transition-opacity duration-200 relative z-10">
              chevron_right
            </span>
          )}
        </motion.div>
      )}
    </NavLink>
  </div>
);

// ─── SidebarContent ───────────────────────────────────────────────────────────
type SidebarUser = {
  sUser?: string;
  iIdRol?: number | string;
  ildRol?: number | string;
  idRole?: number | string;
};

const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const user = getLocalStorageJSON<SidebarUser>("user", {});
  const rolesMap = getLocalStorageJSON<Record<string, number>>("rolesMap", {});

  const userName = user.sUser || "Invitado";
  const userRoleId = Number(user.iIdRol || user.ildRol || user.idRole || 0);
  const PRIVILEGED_IDS = [32];
  const isPrivileged = PRIVILEGED_IDS.includes(userRoleId);

  const displayRole = useMemo(() => {
    const foundName = Object.keys(rolesMap).find(key => rolesMap[key] === userRoleId);
    if (foundName) return foundName.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, l => l.toUpperCase());
    return isPrivileged ? "Soporte TI" : "Colaborador";
  }, [rolesMap, userRoleId, isPrivileged]);

  const handleLogout = () => {
    clearAuthStoragePreserveTheme();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d1526] border-r border-slate-200/70 dark:border-slate-800/60 transition-colors duration-300">

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-5 shrink-0">
        <motion.img
          src="/logo.png"
          alt="Logo Compers"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="h-9 w-auto object-contain dark:brightness-0 dark:invert cursor-default"
        />

        {onClose && (
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.88 }}
            onClick={onClose}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-rounded text-[18px]">close</span>
          </motion.button>
        )}
      </div>

      {/* Separador */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700/60 to-transparent mx-5 mb-3" />

      {/* NAVEGACIÓN */}
      <nav className="flex-1 py-2 flex flex-col gap-1 overflow-y-auto">
        <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-6 pb-2 pt-1">
          Menú Principal
        </p>

        {/* Items privilegiados: Dashboard usa exact=true */}
        {isPrivileged && (
          <>
            <NavItem to="/"      icon="grid_view"          label="Dashboard" onClose={onClose} exact />
            <NavItem to="/users" icon="group"               label="Usuarios"  onClose={onClose} />
          </>
        )}

        {!isPrivileged && (
          <>
            <NavItem to="/my-tasks" icon="task_alt"           label="Mis Tareas" onClose={onClose} rotateIcon />
            <NavItem to="/calendar" icon="calendar_today"     label="Agenda"     onClose={onClose} rotateIcon />
          </>
        )}

        <NavItem to="/tickets"    icon="confirmation_number" label="Tickets"   onClose={onClose} rotateIcon />

        {isPrivileged && (
          <>
            <NavItem to="/my-tasks" icon="task_alt"           label="Mis Tareas" onClose={onClose} rotateIcon />
            <NavItem to="/calendar" icon="calendar_today"     label="Agenda"     onClose={onClose} rotateIcon />
          </>
        )}
      </nav>

      {/* FOOTER — card sin animación, solo botones */}
      <div className="p-3 shrink-0">
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-[20px] p-3.5">

          {/* Perfil */}
          <div className="flex items-center gap-3 mb-3.5">
            <UserAvatar name={userName} />
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate capitalize leading-tight">
                {userName}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-medium mt-0.5">
                {displayRole}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors text-xs font-bold shadow-sm"
            >
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="material-symbols-rounded text-[16px]"
              >
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </motion.span>
              {theme === "dark" ? "Claro" : "Oscuro"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50/50 dark:hover:bg-rose-500/5 transition-colors text-xs font-bold shadow-sm"
            >
              <motion.span
                whileHover={{ x: -3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="material-symbols-rounded text-[16px]"
              >
                logout
              </motion.span>
              Salir
            </motion.button>
          </div>
        </div>

        <p className="text-[9px] text-center text-slate-300 dark:text-slate-700 mt-2.5 font-mono tracking-widest">
          v2.4.0 · CompersSys
        </p>
      </div>
    </div>
  );
};

// ─── Sidebar Desktop ──────────────────────────────────────────────────────────
export const Sidebar = () => (
  <aside className="hidden lg:flex w-64 flex-col h-screen sticky top-0 z-30 shrink-0">
    <SidebarContent />
  </aside>
);

// ─── Sidebar Móvil ────────────────────────────────────────────────────────────
export const MobileSidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="drawer"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 36 }}
          className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden shadow-2xl"
        >
          <SidebarContent onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  </>
);
