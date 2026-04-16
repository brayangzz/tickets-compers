import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { getTickets, type Ticket } from "../services/ticketService";
import { isSupportUser } from "../config/roles";
import { getInitials, getAvatarGradient } from "../utils/user";
import { getStatusConfig } from "../utils/status";
import { useCountUp } from "../hooks/useCountUp";
import { motion, AnimatePresence } from "framer-motion";
import { getLocalStorageJSON } from "../utils/storage";

// ─── HELPERS ────────────────────────────────────────────────────────────────

const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString("es-MX", { month: "short" });
    let hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "p. m." : "a. m.";
    hours = hours % 12 || 12;
    return `${day} ${month}, ${hours.toString().padStart(2, "0")}:${mins} ${ampm}`;
};

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
};

// ─── COMPONENTE WIDGET KPI ──────────────────────────────────────────────────
interface WidgetKPIProps {
    title: string;
    value: number;
    icon: string;
    accentClass: string;  // color de acento (border, glow, text)
    gradientFrom: string;
    gradientTo: string;
    delay: number;
    index: number;
}

const WidgetKPI = ({ title, value, icon, accentClass, gradientFrom, gradientTo, delay, index }: WidgetKPIProps) => {
    // Arranca en 00 y anima suavemente al valor real cuando llegan los datos
    const displayValue = useCountUp(value, 800);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: delay, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -5, transition: { duration: 0.2, ease: "easeOut" } }}
            className={`relative rounded-[24px] border bg-white dark:bg-[#1e293b]/90 backdrop-blur-xl overflow-hidden cursor-default group shadow-lg hover:shadow-2xl transition-shadow duration-500 ${accentClass}`}
        >
            {/* Gradiente de fondo decorativo al hover */}
            <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradientFrom} ${gradientTo} pointer-events-none`}
                aria-hidden="true"
            />

            {/* CONTENIDO */}
            <div className="relative z-10 flex flex-col gap-4 p-6 md:p-7">
                {/* Fila superior: título + ícono */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] md:text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors leading-tight">
                        {title}
                    </span>
                    <motion.div
                        animate={{ rotate: [0, -8, 8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: index * 0.8 + 2.5, ease: "easeInOut" }}
                        className="p-2 bg-slate-100/80 dark:bg-slate-800 rounded-xl group-hover:bg-white/25 dark:group-hover:bg-white/10 transition-colors duration-300 shrink-0"
                    >
                        <span className="material-symbols-rounded leading-none" style={{ fontSize: '22px' }}>
                            {icon}
                        </span>
                    </motion.div>
                </div>

                {/* Número: siempre visible. Empieza en 00, sube al real cuando carga la API */}
                <div className="flex items-end justify-between">
                    <span className="text-5xl md:text-6xl font-black tracking-tighter leading-none drop-shadow-sm tabular-nums">
                        {displayValue.toString().padStart(2, "0")}
                    </span>
                    <motion.div
                        className="h-1.5 rounded-full bg-current opacity-20 mb-1 shrink-0"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(Math.min((value / 10) * 40 + 16, 72), 16)}px` }}
                        transition={{ duration: 0.8, delay: delay + 0.3, ease: "easeOut" }}
                    />
                </div>
            </div>

            {/* Icono fantasma de fondo */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.055] group-hover:opacity-[0.07] transition-all duration-700 group-hover:scale-110 group-hover:-rotate-12 pointer-events-none select-none">
                <span className="material-symbols-rounded" style={{ fontSize: "130px", lineHeight: 1 }}>{icon}</span>
            </div>
        </motion.div>
    );
};

// ─── COMPONENTE FILA SKELETON ───────────────────────────────────────────────
const SkeletonRow = ({ i }: { i: number }) => (
    <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.06 }}
        className="border-b border-slate-100 dark:border-slate-800/50"
    >
        <td className="px-8 py-6"><Skeleton className="h-4 w-10 rounded" /></td>
        <td className="px-6 py-6">
            <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-52 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
            </div>
        </td>
        <td className="px-6 py-6"><Skeleton className="h-6 w-20 rounded-lg" /></td>
        <td className="px-6 py-6"><Skeleton className="h-6 w-24 rounded-full" /></td>
        <td className="px-6 py-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-24 rounded" />
            </div>
        </td>
        <td className="px-6 py-6"><Skeleton className="h-4 w-28 rounded ml-auto" /></td>
    </motion.tr>
);

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
export const Dashboard = () => {
    const navigate = useNavigate();

    type DashboardUser = {
        iIdRol?: number | string;
        ildRol?: number | string;
        idRole?: number | string;
        iIdUser?: number | string;
        ildUser?: number | string;
        idUser?: number | string;
        sUser?: string;
        employeeName?: string;
    };

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const currentUser = getLocalStorageJSON<DashboardUser>("user", {});
    const currentRoleId = Number(currentUser.iIdRol || currentUser.ildRol || currentUser.idRole || 0);
    const currentUserId = Number(currentUser.iIdUser || currentUser.ildUser || currentUser.idUser || 0);
    const userName = currentUser.sUser || currentUser.employeeName || "Usuario";
    const firstName = userName.split(" ")[0];

    const isSupport = isSupportUser(currentRoleId);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const ticketsData = await getTickets();
                let all = Array.isArray(ticketsData) ? ticketsData : [];
                if (!isSupport) all = all.filter((t) => t.iIdUserRaisedTask === currentUserId);
                all.sort((a, b) => new Date(b.dDateUserCreate).getTime() - new Date(a.dDateUserCreate).getTime());
                setTickets(all);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentUserId, isSupport]);

    const kpis = useMemo(() => ({
        total:     tickets.length,
        pending:   tickets.filter((t) => t.iIdStatus === 1).length,
        inProcess: tickets.filter((t) => t.iIdStatus === 2 || t.iIdStatus === 3).length,
        solved:    tickets.filter((t) => t.iIdStatus === 5 || t.iIdStatus === 4).length,
    }), [tickets]);

    const recentTickets = tickets.slice(0, 6);

    const kpiConfig = [
        {
            title: "Total Tickets",
            value: kpis.total,
            icon: "inbox",
            accentClass: "border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-white",
            gradientFrom: "from-slate-100/60",
            gradientTo: "to-slate-50/20 dark:from-slate-800/30 dark:to-slate-700/10",
            delay: 0,
        },
        {
            title: "Pendientes",
            value: kpis.pending,
            icon: "pending_actions",
            accentClass: "border-amber-200 dark:border-amber-800/50 text-amber-500",
            gradientFrom: "from-amber-50/80",
            gradientTo: "to-orange-50/30 dark:from-amber-900/20 dark:to-orange-900/10",
            delay: 0.08,
        },
        {
            title: "En Proceso",
            value: kpis.inProcess,
            icon: "sync",
            accentClass: "border-blue-200 dark:border-blue-800/50 text-blue-500",
            gradientFrom: "from-blue-50/80",
            gradientTo: "to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10",
            delay: 0.16,
        },
        {
            title: "Resueltos",
            value: kpis.solved,
            icon: "check_circle",
            accentClass: "border-emerald-200 dark:border-emerald-800/50 text-emerald-500",
            gradientFrom: "from-emerald-50/80",
            gradientTo: "to-teal-50/30 dark:from-emerald-900/20 dark:to-teal-900/10",
            delay: 0.24,
        },
    ];

    // Animación de filas: SOLO opacidad, sin y ni x, para evitar layout shift
    // cuando la scrollbar aparece/desaparece y el contenido se redimensiona
    const rowVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    } as const;

    return (
        <>
        <style>{`
            /* FIX SCROLLBAR JITTER: reservar espacio para la scrollbar siempre,
               evita el layout shift de 17px cuando la scrollbar aparece/desaparece */
            html { scrollbar-gutter: stable; overflow-y: scroll; }
            @keyframes shimmerLine { 0%{opacity:0.4} 50%{opacity:1} 100%{opacity:0.4} }
            .shimmer-dot { animation: shimmerLine 2s ease-in-out infinite; }
        `}</style>
        <div className="flex flex-col gap-10 w-full max-w-[1600px] mx-auto pb-12 font-display text-txt-main">

            {/* ── HEADER ── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                        {getGreeting()},{" "}
                        <motion.span
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25, duration: 0.4 }}
                            className="text-blue-500 inline-block"
                        >
                            {firstName}
                        </motion.span>
                        <span className="text-blue-500">.</span>
                    </h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35, duration: 0.4 }}
                        className="text-slate-500 dark:text-slate-400 mt-2 text-base md:text-lg font-medium"
                    >
                        {isSupport
                            ? "Aquí está el resumen global de los tickets del sistema."
                            : "Aquí tienes el estado de tus solicitudes recientes."}
                    </motion.p>
                </div>

                {/* Indicador de fecha */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.35 }}
                    className="hidden md:flex items-center gap-3 bg-white dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/60 rounded-2xl px-5 py-3 shadow-sm"
                >
                    <span className="material-symbols-rounded text-blue-500 text-xl">calendar_today</span>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hoy</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
                            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                        </span>
                    </div>
                </motion.div>
            </motion.div>

            {/* ── KPI GRID ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {kpiConfig.map((kpi, i) => (
                    <WidgetKPI key={kpi.title} index={i} {...kpi} />
                ))}
            </div>

            {/* ── ACTIVIDAD RECIENTE ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-5"
            >
                {/* Header sección */}
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl shadow-inner">
                            <span className="material-symbols-rounded text-xl">history</span>
                        </div>
                        Actividad Reciente
                        {!isLoading && tickets.length > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.6 }}
                                className="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800/50"
                            >
                                {tickets.length} total
                            </motion.span>
                        )}
                    </h2>
                    <motion.button
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate("/tickets")}
                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                        Ver todos
                        <span className="material-symbols-rounded text-lg">arrow_forward</span>
                    </motion.button>
                </div>

                {/* Tabla */}
                <Card className="flex flex-col shadow-xl bg-white dark:bg-[#1e293b]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/60 rounded-[24px] overflow-hidden p-0 transition-all duration-300 hover:shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700/60 text-[10px] uppercase tracking-widest text-slate-500 font-extrabold bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/30">
                                    <th className="px-8 py-5">#ID</th>
                                    <th className="px-6 py-5 w-1/3">Asunto / Descripción</th>
                                    <th className="px-6 py-5">Tipo</th>
                                    <th className="px-6 py-5">Estado</th>
                                    <th className="px-6 py-5">Creado por</th>
                                    <th className="px-6 py-5 text-right">Fecha</th>
                                </tr>
                            </thead>

                            {/* tbody normal – sin AnimatePresence/motion.tbody para evitar remounting que causa el shift */}
                            <tbody className="text-sm bg-white dark:bg-[#1e293b]/90">
                                    {isLoading ? (
                                        [...Array(5)].map((_, i) => <SkeletonRow key={i} i={i} />)
                                    ) : recentTickets.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-24 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-50">
                                                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                                                        <span className="material-symbols-rounded text-4xl">inventory_2</span>
                                                    </div>
                                                    <p className="font-semibold text-slate-500">Todo está tranquilo por aquí.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        recentTickets.map((t, index) => {
                                            const status = getStatusConfig(t.iIdStatus);
                                            const taskName = (t as any).sName;
                                            return (
                                                <motion.tr
                                                    key={t.iIdTask}
                                                    variants={rowVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.05 }}
                                                    onClick={() => navigate(`/tickets/${t.iIdTask}`)}
                                                    className="group cursor-pointer hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-all duration-200 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                                                >
                                                    {/* #ID */}
                                                    <td className="px-8 py-5">
                                                        <span className="font-mono font-extrabold text-[12px] text-slate-400 group-hover:text-blue-500 transition-colors duration-200">
                                                            #{t.iIdTask}
                                                        </span>
                                                    </td>

                                                    {/* TÍTULO + DESCRIPCIÓN */}
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate max-w-[380px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                                                {taskName || t.sDescription}
                                                            </span>
                                                            {taskName && (
                                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-semibold truncate max-w-[380px] tracking-wide">
                                                                    {t.sDescription}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* TIPO */}
                                                    <td className="px-6 py-5">
                                                        <span className="inline-flex text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg">
                                                            {t.taskTypeName || "TICKET"}
                                                        </span>
                                                    </td>

                                                    {/* ESTADO */}
                                                    <td className="px-6 py-5">
                                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${status.className} shadow-sm`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                                                            <span className="text-[10px] font-extrabold uppercase tracking-widest">
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* CREADO POR */}
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 shrink-0 rounded-full bg-gradient-to-br ${getAvatarGradient(t.iIdTask)} text-white flex items-center justify-center text-[10px] font-bold shadow-sm transition-transform duration-300 group-hover:scale-105`}>
                                                                {getInitials(t.userRaisedName || "Us")}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                {t.userRaisedName || "Desconocido"}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* FECHA */}
                                                    <td className="px-6 py-5 text-right">
                                                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors duration-200">
                                                            {formatDateTime(t.dDateUserCreate)}
                                                        </span>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer de la tabla */}
                    {!isLoading && recentTickets.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="flex items-center justify-between px-8 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/20"
                        >
                            <span className="text-[11px] text-slate-400 font-medium">
                                Mostrando <span className="font-bold text-slate-600 dark:text-slate-300">{recentTickets.length}</span> de <span className="font-bold text-slate-600 dark:text-slate-300">{tickets.length}</span> tickets
                            </span>
                            <motion.button
                                whileHover={{ x: 3 }}
                                onClick={() => navigate("/tickets")}
                                className="text-[11px] font-bold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                            >
                                Ver todos <span className="material-symbols-rounded text-base">chevron_right</span>
                            </motion.button>
                        </motion.div>
                    )}
                </Card>
            </motion.div>
        </div>
        </>
    );
};
