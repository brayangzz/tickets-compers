import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { getPersonalTasks, type PersonalTask } from "../services/taskService";
import { getTaskTypes, getStatuses, type TaskType, type Status } from "../services/catalogService";
import { getInitials, getAvatarGradient } from "../utils/user";
import { fetchCached } from "../utils/cache";
import { getLocalStorageJSON } from "../utils/storage";
import { useCountUp } from "../hooks/useCountUp";
import { motion, AnimatePresence } from "framer-motion";
import { toApiUrl } from "../config/api";

interface ApiAssignedTask {
    iIdTask: number;
    sName?: string;
    iIdTaskType: number;
    iIdStatus: number;
    taskTypeName: string;
    statusName: string;
    userCreateName: string;
    userAssignedName: string;
    sDescription: string;
    dTaskStartDate: string | null;
    dDateUserCreate: string | null;
}

interface TableSectionProps {
    title: string;
    isLoading: boolean;
    columns: string[];
    children: React.ReactNode;
    onViewAll?: () => void;
    icon?: string;
    count?: number;
    accentColor?: string;
    emptyMessage?: string;
}

// ── KPI Widget ────────────────────────────────────────────────────────────────
const KpiCard = ({
    label, value, icon, colorClass, bgClass, borderClass, shadowClass, delay
}: {
    label: string; value: number; icon: string;
    colorClass: string; bgClass: string; borderClass: string; shadowClass: string; delay: number;
}) => {
    const count = useCountUp(value);
    const display = count.toString().padStart(2, "0");

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`relative p-6 rounded-3xl border ${bgClass} ${borderClass} shadow-lg ${shadowClass} overflow-hidden group cursor-default transition-shadow duration-300`}
        >
            {/* Fondo decorativo */}
            <div className={`absolute -right-5 -bottom-5 text-[110px] opacity-[0.04] dark:opacity-[0.06] group-hover:opacity-[0.09] transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 ${colorClass} pointer-events-none select-none`}>
                <span className="material-symbols-rounded">{icon}</span>
            </div>

            <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <span className="text-[10px] uppercase font-black tracking-[0.14em] text-slate-500 dark:text-slate-400 leading-tight">
                        {label}
                    </span>
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${bgClass} border ${borderClass}`}>
                        <span className={`material-symbols-rounded text-[20px] ${colorClass}`}>{icon}</span>
                    </div>
                </div>
                <span className={`text-[2.8rem] font-black leading-none tracking-tighter ${colorClass} tabular-nums`}>
                    {display}
                </span>
            </div>
        </motion.div>
    );
};

// ── TableSection ──────────────────────────────────────────────────────────────
const TableSection = ({ title, icon, isLoading, columns, children, onViewAll, count, accentColor = "blue", emptyMessage = "No se encontraron tareas." }: TableSectionProps) => {
    const accentMap: Record<string, string> = {
        blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        violet: "text-violet-500 bg-violet-500/10 border-violet-500/20",
        emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    };
    const accent = accentMap[accentColor] ?? accentMap.blue;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <Card className="flex flex-col bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-md">
                {/* Header de sección */}
                <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        {icon && (
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${accent}`}>
                                <span className={`material-symbols-rounded text-[18px]`}>{icon}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                            <h3 className="font-extrabold text-slate-800 dark:text-white text-base sm:text-lg tracking-tight truncate">
                                {title}
                            </h3>
                            {!isLoading && count !== undefined && (
                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${accent}`}>
                                    {count}
                                </span>
                            )}
                        </div>
                    </div>
                    {onViewAll && (
                        <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={onViewAll}
                            className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-200"
                        >
                            Ver todo
                            <span className="material-symbols-rounded text-[15px]">chevron_right</span>
                        </motion.button>
                    )}
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto" style={{ scrollbarGutter: "stable" }}>
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-800/30">
                                {columns.map((col, i) => (
                                    <th key={i} className={`px-4 sm:px-6 py-3.5 ${i === 0 ? "pl-6 sm:pl-8" : ""}`}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#1e293b]">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        {columns.map((_, j) => (
                                            <td key={j} className={`px-4 sm:px-6 py-5 ${j === 0 ? "pl-6 sm:pl-8" : ""}`}>
                                                <Skeleton className="h-5 w-full rounded-lg" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : children}
                        </tbody>
                    </table>

                    {/* Estado vacío */}
                    <AnimatePresence>
                        {!isLoading && (
                            <EmptyState message={emptyMessage} accentColor={accentColor} />
                        )}
                    </AnimatePresence>
                </div>
            </Card>
        </motion.div>
    );
};

// Se renderiza el empty via los children, así que lo hacemos un componente separado
// para que los children lo usen a través de los <tr> empty. Usamos un wrapper:
const EmptyRow = ({ colSpan, message }: { colSpan: number; message: string }) => (
    <tr>
        <td colSpan={colSpan} className="px-6 py-14 text-center">
            <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700">inbox</span>
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">{message}</p>
            </div>
        </td>
    </tr>
);

// Eliminar EmptyState del render de TableSection (lo renderizamos como EmptyRow dentro del tbody)
const EmptyState = ({ message, accentColor }: { message: string; accentColor: string }) => null;

// ── Componente de fila de tarea ───────────────────────────────────────────────
const TaskRow = ({
    task, onClick, personName, personField
}: {
    task: ApiAssignedTask; onClick: () => void; personName: string; personField?: string;
}) => {
    const iIdStatus = task.iIdStatus;
    const statusConfig = (() => {
        switch (iIdStatus) {
            case 1: return { label: "Pendiente",   cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" };
            case 2: return { label: "En Proceso",  cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" };
            case 3: return { label: "En Revisión", cls: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" };
            case 4: return { label: "Completada",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" };
            case 5: return { label: "Cerrada",     cls: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800" };
            case 6: return { label: "Cancelada",   cls: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800" };
            default: return { label: "Desconocido", cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400" };
        }
    })();

    const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <tr
            onClick={onClick}
            className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors duration-150 cursor-pointer group"
        >
            <td className="px-4 sm:px-6 py-4 pl-6 sm:pl-8 w-[80px]">
                <span className="text-[11px] font-black text-slate-400 group-hover:text-blue-500 transition-colors font-mono">
                    #{task.iIdTask}
                </span>
            </td>
            <td className="px-4 sm:px-6 py-4 max-w-[260px]">
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[13px] text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {task.sName || task.sDescription}
                    </span>
                    {task.sName && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-medium">
                            {task.sDescription}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-4 sm:px-6 py-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {task.taskTypeName}
                </span>
            </td>
            <td className="px-4 sm:px-6 py-4">
                <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide border px-2.5 py-1 rounded-full ${statusConfig.cls}`}>
                    {statusConfig.label}
                </span>
            </td>
            <td className="px-4 sm:px-6 py-4">
                <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                    {fmt(task.dDateUserCreate || task.dTaskStartDate)}
                </span>
            </td>
            <td className="px-4 sm:px-6 py-4">
                <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 shrink-0 rounded-full bg-gradient-to-br ${getAvatarGradient(task.iIdTask)} text-white flex items-center justify-center text-[9px] font-bold shadow-sm`}>
                        {getInitials(personName)}
                    </div>
                    <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 hidden xl:block truncate max-w-[120px]">
                        {personName}
                    </span>
                </div>
            </td>
        </tr>
    );
};

// ── UserDashboard Principal ───────────────────────────────────────────────────
export const UserDashboard = () => {
    const navigate = useNavigate();

    const [apiPersonalTasks, setApiPersonalTasks]     = useState<PersonalTask[]>([]);
    const [assignedToMeTasks, setAssignedToMeTasks]   = useState<ApiAssignedTask[]>([]);
    const [delegatedTasks, setDelegatedTasks]         = useState<ApiAssignedTask[]>([]);
    const [taskTypes, setTaskTypes]                   = useState<TaskType[]>([]);
    const [statuses, setStatuses]                     = useState<Status[]>([]);
    const [isLoading, setIsLoading]                   = useState(true);
    const [searchTerm, setSearchTerm]                 = useState("");
    const [dateOrder, setDateOrder]                   = useState<"desc" | "asc">("desc");

   
    const currentUser = getLocalStorageJSON<{
        sUser?: string;
        employeeName?: string;
    }>("user", {});
    const userName    = currentUser.sUser || currentUser.employeeName || "Usuario";
    const firstName   = userName.split(" ")[0];

    // Saludo dinámico
    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return "Buenos días";
        if (h < 18) return "Buenas tardes";
        return "Buenas noches";
    })();

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };
                const pTypes    = fetchCached("app_task_types", () => getTaskTypes());
                const pStatuses = fetchCached("app_statuses",   () => getStatuses());
                const [tasksData, typesData, statusData, assignedRes, delegatedRes] = await Promise.all([
                    getPersonalTasks(), pTypes, pStatuses,
                    fetch(toApiUrl("/tasks/assigned/assigned-to-me"), { headers }),
                    fetch(toApiUrl("/tasks/assigned/assigned-by-me"), { headers }),
                ]);
                const assignedData  = assignedRes.ok  ? await assignedRes.json()  : [];
                const delegatedData = delegatedRes.ok ? await delegatedRes.json() : [];
                setApiPersonalTasks(Array.isArray(tasksData)     ? tasksData     : []);
                setAssignedToMeTasks(Array.isArray(assignedData) ? assignedData  : []);
                setDelegatedTasks(Array.isArray(delegatedData)   ? delegatedData : []);
                setTaskTypes(Array.isArray(typesData)   ? typesData   : []);
                setStatuses(Array.isArray(statusData)   ? statusData  : []);
            } catch (err) {
                console.error("Error cargando dashboard:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const processTasks = (list: any[]) =>
        list
            .filter(t =>
                t.sDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t as any).sName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.iIdTask.toString().includes(searchTerm)
            )
            .sort((a, b) => {
                const dA = new Date(a.dDateUserCreate || a.dTaskStartDate || 0).getTime();
                const dB = new Date(b.dDateUserCreate || b.dTaskStartDate || 0).getTime();
                return dateOrder === "desc" ? dB - dA : dA - dB;
            });

    const sortedAssigned  = useMemo(() => processTasks(assignedToMeTasks),  [assignedToMeTasks,  searchTerm, dateOrder]);
    const sortedDelegated = useMemo(() => processTasks(delegatedTasks),      [delegatedTasks,     searchTerm, dateOrder]);
    const sortedPersonal  = useMemo(() => processTasks(apiPersonalTasks),    [apiPersonalTasks,   searchTerm, dateOrder]);

    const kpis = useMemo(() => {
        const all = [...apiPersonalTasks, ...assignedToMeTasks, ...delegatedTasks];
        const map = new Map<number, any>();
        all.forEach(t => map.set(t.iIdTask, t));
        const u = Array.from(map.values());
        return {
            pendientes:   u.filter(t => t.iIdStatus === 1).length,
            enProceso:    u.filter(t => t.iIdStatus === 2 || t.iIdStatus === 3).length,
            completadas:  u.filter(t => t.iIdStatus === 4 || t.iIdStatus === 5).length,
            canceladas:   u.filter(t => t.iIdStatus === 6).length,
        };
    }, [apiPersonalTasks, assignedToMeTasks, delegatedTasks]);

    const getTaskTypeName = (id: number) => taskTypes.find(t => t.iIdTaskType === id)?.sTaskType ?? "General";

    const fmtDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    // ── Renderizado ─────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-14 font-display text-slate-900 dark:text-white"
            style={{ scrollbarGutter: "stable" }}
        >
            {/* ── ENCABEZADO ── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                        {greeting},{" "}
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
                        Visión general de tus actividades y rendimiento.
                    </motion.p>
                </div>

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

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <KpiCard label="Pendientes"  value={kpis.pendientes}  icon="pending_actions" delay={0.05}
                    colorClass="text-amber-500"
                    bgClass="bg-white dark:bg-[#1e293b]"
                    borderClass="border-amber-400/25 dark:border-amber-500/20"
                    shadowClass="shadow-amber-100 dark:shadow-none"
                />
                <KpiCard label="En Proceso"  value={kpis.enProceso}   icon="sync"            delay={0.1}
                    colorClass="text-blue-500"
                    bgClass="bg-white dark:bg-[#1e293b]"
                    borderClass="border-blue-400/25 dark:border-blue-500/20"
                    shadowClass="shadow-blue-100 dark:shadow-none"
                />
                <KpiCard label="Completadas" value={kpis.completadas} icon="task_alt"        delay={0.15}
                    colorClass="text-emerald-500"
                    bgClass="bg-white dark:bg-[#1e293b]"
                    borderClass="border-emerald-400/25 dark:border-emerald-500/20"
                    shadowClass="shadow-emerald-100 dark:shadow-none"
                />
                <KpiCard label="Canceladas"  value={kpis.canceladas}  icon="cancel"          delay={0.2}
                    colorClass="text-rose-500"
                    bgClass="bg-white dark:bg-[#1e293b]"
                    borderClass="border-rose-400/25 dark:border-rose-500/20"
                    shadowClass="shadow-rose-100 dark:shadow-none"
                />
            </div>

            {/* ── BARRA DE BÚSQUEDA ── */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.35 }}
                className="p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-md rounded-[22px] lg:rounded-full flex flex-col lg:flex-row gap-2.5 items-center justify-between sticky top-4 z-30"
            >
                <div className="flex flex-col sm:flex-row w-full lg:w-auto items-center gap-2.5">
                    {/* Buscador — borde visible para que parezca input */}
                    <div className="relative group w-full sm:w-80 shrink-0">
                        <motion.span
                            animate={{ color: searchTerm ? "#3b82f6" : undefined }}
                            className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors text-xl pointer-events-none z-10"
                        >
                            search
                        </motion.span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar tarea rápida..."
                            className="w-full h-11 pl-12 pr-10 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 dark:focus:border-blue-500 transition-all text-slate-800 dark:text-slate-200 font-medium placeholder:text-slate-400 placeholder:font-normal"
                        />
                        {/* X para borrar */}
                        <AnimatePresence>
                            {searchTerm && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.6 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.6 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
                                >
                                    <span className="material-symbols-rounded text-[13px] text-slate-600 dark:text-white">close</span>
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Ordenamiento */}
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setDateOrder(d => d === "desc" ? "asc" : "desc")}
                        className="flex items-center justify-center gap-2 h-11 px-5 bg-slate-50 dark:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 transition-all w-full sm:w-auto shrink-0"
                    >
                        <span className="material-symbols-rounded text-[18px] text-slate-400">
                            {dateOrder === "desc" ? "arrow_downward" : "arrow_upward"}
                        </span>
                        {dateOrder === "desc" ? "Más recientes" : "Más antiguos"}
                    </motion.button>
                </div>

                <div className="w-full lg:w-auto shrink-0">
                    <motion.button
                        whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(59,130,246,0.35)" }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => navigate("/my-tasks/new")}
                        className="w-full lg:w-auto h-11 px-7 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/25 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        <motion.span
                            animate={{ rotate: [0, 0] }}
                            whileHover={{ rotate: 90 }}
                            transition={{ duration: 0.2 }}
                            className="material-symbols-rounded text-[18px]"
                        >add</motion.span>
                        <span>Nueva Tarea</span>
                    </motion.button>
                </div>
            </motion.div>

            {/* ── TABLAS ── */}
            <div className="flex flex-col gap-8">

                {/* TAREAS ASIGNADAS A MÍ */}
                <TableSection
                    title="Tareas Asignadas a Mí" icon="inbox"
                    isLoading={isLoading}
                    onViewAll={() => navigate("/my-tasks/assigned")}
                    columns={["ID", "Título / Descripción", "Tipo", "Estatus", "Fecha", "Asignado por"]}
                    count={sortedAssigned.length}
                    accentColor="blue"
                    emptyMessage="No tienes tareas asignadas."
                >
                    {sortedAssigned.length === 0 && !isLoading ? (
                        <EmptyRow colSpan={6} message="No tienes tareas asignadas." />
                    ) : (
                        sortedAssigned.slice(0, 5).map(task => (
                            <TaskRow
                                key={task.iIdTask}
                                task={task}
                                onClick={() => navigate(`/my-tasks/${task.iIdTask}`)}
                                personName={task.userCreateName}
                            />
                        ))
                    )}
                </TableSection>

                {/* TAREAS DELEGADAS */}
                <TableSection
                    title="Tareas que he Delegado" icon="send"
                    isLoading={isLoading}
                    onViewAll={() => navigate("/my-tasks/delegated")}
                    columns={["ID", "Título / Descripción", "Tipo", "Estatus", "Fecha", "Asignado a"]}
                    count={sortedDelegated.length}
                    accentColor="violet"
                    emptyMessage="No has delegado ninguna tarea."
                >
                    {sortedDelegated.length === 0 && !isLoading ? (
                        <EmptyRow colSpan={6} message="No has delegado ninguna tarea." />
                    ) : (
                        sortedDelegated.slice(0, 5).map(task => (
                            <TaskRow
                                key={task.iIdTask}
                                task={task}
                                onClick={() => navigate(`/my-tasks/${task.iIdTask}`)}
                                personName={task.userAssignedName}
                            />
                        ))
                    )}
                </TableSection>

                {/* TAREAS PERSONALES */}
                <TableSection
                    title="Mis Tareas Personales" icon="person"
                    isLoading={isLoading}
                    onViewAll={() => navigate("/my-tasks/personal")}
                    columns={["ID", "Título / Descripción", "Tipo", "Estatus", "Creado", "Inicio"]}
                    count={sortedPersonal.length}
                    accentColor="emerald"
                    emptyMessage="No tienes tareas personales."
                >
                    {sortedPersonal.length === 0 && !isLoading ? (
                        <EmptyRow colSpan={6} message="No tienes tareas personales." />
                    ) : (
                        sortedPersonal.slice(0, 5).map(task => {
                            const typeName = getTaskTypeName(task.iIdTaskType);
                            const taskAny  = task as any;
                            const personal: ApiAssignedTask = {
                                ...taskAny,
                                taskTypeName:     typeName,
                                statusName:       "",
                                userCreateName:   taskAny.sName || task.sDescription || "—",
                                userAssignedName: "",
                            };
                            return (
                                <tr
                                    key={task.iIdTask}
                                    onClick={() => navigate(`/my-tasks/${task.iIdTask}`)}
                                    className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors duration-150 cursor-pointer group"
                                >
                                    <td className="px-4 sm:px-6 py-4 pl-6 sm:pl-8 w-[80px]">
                                        <span className="text-[11px] font-black text-slate-400 group-hover:text-blue-500 transition-colors font-mono">
                                            #{task.iIdTask}
                                        </span>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 max-w-[260px]">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-[13px] text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {taskAny.sName || task.sDescription}
                                            </span>
                                            {taskAny.sName && (
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-medium">
                                                    {task.sDescription}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                            {typeName}
                                        </span>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4">
                                        {(() => {
                                            const s = task.iIdStatus;
                                            const cfg = s === 1 ? { l: "Pendiente",   c: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" }
                                                       : s === 2 ? { l: "En Proceso",  c: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" }
                                                       : s === 3 ? { l: "En Revisión", c: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" }
                                                       : s === 4 ? { l: "Completada",  c: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" }
                                                       : s === 5 ? { l: "Cerrada",     c: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800" }
                                                       : s === 6 ? { l: "Cancelada",   c: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800" }
                                                       : { l: "—", c: "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700" };
                                            return <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide border px-2.5 py-1 rounded-full ${cfg.c}`}>{cfg.l}</span>;
                                        })()}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4">
                                        <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{fmtDate(task.dDateUserCreate)}</span>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4">
                                        <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{fmtDate(task.dTaskStartDate)}</span>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </TableSection>

            </div>
        </motion.div>
    );
};
