import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { getPersonalTasks, type PersonalTask } from "../services/taskService";
import { getTaskTypes, getStatuses, type TaskType, type Status } from "../services/catalogService";
import { motion } from "framer-motion";

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
}

const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getAvatarGradient = (id: number) => {
    const gradients = ['from-blue-500 to-indigo-600', 'from-emerald-400 to-teal-600', 'from-orange-400 to-rose-500', 'from-purple-500 to-fuchsia-600', 'from-cyan-400 to-blue-600'];
    return gradients[id % gradients.length];
};

export const UserDashboard = () => {
    const navigate = useNavigate();

    const [apiPersonalTasks, setApiPersonalTasks] = useState<PersonalTask[]>([]);
    const [assignedToMeTasks, setAssignedToMeTasks] = useState<ApiAssignedTask[]>([]);
    const [delegatedTasks, setDelegatedTasks] = useState<ApiAssignedTask[]>([]);

    const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- NUEVOS ESTADOS PARA FILTROS ---
    const [searchTerm, setSearchTerm] = useState("");
    const [dateOrder, setDateOrder] = useState<"desc" | "asc">("desc");

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { "Authorization": `Bearer ${token}` };

                // Helper de caché para catálogos estáticos
                const fetchCached = async (key: string, fetcher: () => Promise<any>) => {
                    const cached = sessionStorage.getItem(key);
                    if (cached) return JSON.parse(cached);
                    const data = await fetcher();
                    sessionStorage.setItem(key, JSON.stringify(data));
                    return data;
                };

                const pTypes = fetchCached('app_task_types', () => getTaskTypes());
                const pStatuses = fetchCached('app_statuses', () => getStatuses());

                const [tasksData, typesData, statusData, assignedRes, delegatedRes] = await Promise.all([
                    getPersonalTasks(),
                    pTypes,
                    pStatuses,
                    fetch("https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/tasks/assigned/assigned-to-me", { headers }),
                    fetch("https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/tasks/assigned/assigned-by-me", { headers })
                ]);

                const assignedData = assignedRes.ok ? await assignedRes.json() : [];
                const delegatedData = delegatedRes.ok ? await delegatedRes.json() : [];

                setApiPersonalTasks(Array.isArray(tasksData) ? tasksData : []);
                setAssignedToMeTasks(Array.isArray(assignedData) ? assignedData : []);
                setDelegatedTasks(Array.isArray(delegatedData) ? delegatedData : []);

                setTaskTypes(Array.isArray(typesData) ? typesData : []);
                setStatuses(Array.isArray(statusData) ? statusData : []);

            } catch (error) {
                console.error("Error cargando dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // --- LÓGICA DE FILTRADO Y ORDENAMIENTO REUTILIZABLE ---
    const processTasks = (taskList: any[]) => {
        return taskList
            .filter(t => 
                t.sDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t as any).sName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.iIdTask.toString().includes(searchTerm)
            )
            .sort((a, b) => {
                const dateA = new Date(a.dDateUserCreate || a.dTaskStartDate || 0).getTime();
                const dateB = new Date(b.dDateUserCreate || b.dTaskStartDate || 0).getTime();
                return dateOrder === "desc" ? dateB - dateA : dateA - dateB;
            });
    };

    const sortedAssigned = useMemo(() => processTasks(assignedToMeTasks), [assignedToMeTasks, searchTerm, dateOrder]);
    const sortedDelegated = useMemo(() => processTasks(delegatedTasks), [delegatedTasks, searchTerm, dateOrder]);
    const sortedPersonal = useMemo(() => processTasks(apiPersonalTasks), [apiPersonalTasks, searchTerm, dateOrder]);

    const kpisStats = useMemo(() => {
        const allTasks = [...apiPersonalTasks, ...assignedToMeTasks, ...delegatedTasks];
        const uniqueTasksMap = new Map();
        allTasks.forEach(t => uniqueTasksMap.set(t.iIdTask, t));
        const uniqueTasks = Array.from(uniqueTasksMap.values());

        return {
            pendientes: uniqueTasks.filter(t => t.iIdStatus === 1).length.toString().padStart(2, '0'),
            abiertas: uniqueTasks.filter(t => t.iIdStatus === 2 || t.iIdStatus === 3).length.toString().padStart(2, '0'),
            completadas: uniqueTasks.filter(t => t.iIdStatus === 4 || t.iIdStatus === 5).length.toString().padStart(2, '0'),
            canceladas: uniqueTasks.filter(t => t.iIdStatus === 6).length.toString().padStart(2, '0'),
        };
    }, [apiPersonalTasks, assignedToMeTasks, delegatedTasks]);

    const formatApiDate = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getTaskTypeName = (id: number) => {
        const type = taskTypes.find(t => t.iIdTaskType === id);
        return type ? type.sTaskType : "General";
    };

    const getStatusConfig = (id: number) => {
        const statusObj = statuses.find(s => s.iIdStatus === id);
        const label = statusObj ? statusObj.sStatus.toUpperCase() : "DESCONOCIDO";
        let className = ""; let variant = "neutral";
        switch (id) {
            case 1: className = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"; variant = "warning"; break;
            case 2: className = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"; variant = "info"; break;
            case 3: className = "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800"; variant = "info"; break;
            case 4: className = "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"; variant = "success"; break;
            case 5: className = "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800"; variant = "success"; break;
            case 6: className = "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800"; variant = "danger"; break;
            default: className = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400";
        }
        return { label, className, variant };
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 font-display text-txt-main">
            
            {/* ENCABEZADO Y FECHA */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Mi Dashboard</h1>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Visión general de tus actividades y rendimiento.</p>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm font-bold text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-rounded text-blue-500 text-lg">calendar_today</span>
                    <span className="capitalize">{new Date().toLocaleDateString("es-MX", { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
            </div>

            {/* KPIS CON DISEÑO PREMIUM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Pendientes", val: kpisStats.pendientes, color: "text-amber-500", icon: "pending_actions", bg: "bg-white dark:bg-[#1e293b] border-amber-500/20 shadow-amber-500/5" },
                    { label: "En Proceso", val: kpisStats.abiertas, color: "text-blue-500", icon: "sync", bg: "bg-white dark:bg-[#1e293b] border-blue-500/20 shadow-blue-500/5" },
                    { label: "Completadas", val: kpisStats.completadas, color: "text-emerald-500", icon: "task_alt", bg: "bg-white dark:bg-[#1e293b] border-emerald-500/20 shadow-emerald-500/5" },
                    { label: "Canceladas", val: kpisStats.canceladas, color: "text-rose-500", icon: "cancel", bg: "bg-white dark:bg-[#1e293b] border-rose-500/20 shadow-rose-500/5" },
                ].map((kpi, idx) => (
                    <motion.div 
                        key={idx} 
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`relative p-6 rounded-[24px] border ${kpi.bg} shadow-lg transition-colors duration-300 group overflow-hidden flex flex-col justify-between h-[140px]`}
                    >
                        <div className="flex justify-between items-start relative z-10">
                            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400">{kpi.label}</span>
                            <span className={`material-symbols-rounded text-2xl ${kpi.color} opacity-80 group-hover:opacity-100 transition-opacity`}>{kpi.icon}</span>
                        </div>
                        <h3 className={`text-5xl font-black ${kpi.color} relative z-10 drop-shadow-sm tracking-tighter`}>{kpi.val}</h3>
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.08] transition-all transform group-hover:scale-110 duration-500 group-hover:rotate-12">
                            <span className="material-symbols-rounded text-[120px]">{kpi.icon}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* BARRA DE BÚSQUEDA Y ACCIONES "PÍLDORA" (Responsiva) */}
            <div className="p-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-md rounded-[24px] lg:rounded-full flex flex-col lg:flex-row gap-3 items-center justify-between sticky top-4 z-30">
                <div className="flex flex-col md:flex-row w-full lg:w-auto items-center gap-3">
                    {/* Buscador */}
                    <div className="relative group w-full md:w-80 h-11 shrink-0">
                        <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors text-xl">search</span>
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar tarea rápida..." 
                            className="w-full h-full pl-12 pr-4 bg-slate-50 dark:bg-slate-900/50 border border-transparent rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-slate-200 font-medium placeholder:font-normal placeholder:text-slate-400" 
                        />
                    </div>

                    {/* Ordenamiento */}
                    <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => setDateOrder(dateOrder === "desc" ? "asc" : "desc")}
                        className="flex items-center justify-center gap-2 h-11 px-6 bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 transition-all w-full md:w-auto shrink-0"
                    >
                        <span className="material-symbols-rounded text-[20px] text-slate-400">
                            {dateOrder === "desc" ? "sort" : "filter_list"}
                        </span>
                        {dateOrder === "desc" ? "Recientes" : "Antiguos"}
                    </motion.button>
                </div>
                
                <div className="w-full lg:w-auto shrink-0">
                    <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/my-tasks/new')} 
                        className="w-full lg:w-auto h-11 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-rounded text-[20px]">add</span> 
                        <span>Nueva Tarea</span>
                    </motion.button>
                </div>
            </div>

            {/* TABLAS */}
            <div className="flex flex-col gap-10">
                
                {/* TAREAS ASIGNADAS A MÍ */}
                <TableSection title="Tareas Asignadas a Mí" icon="inbox" isLoading={isLoading} onViewAll={() => navigate('/my-tasks/assigned')} columns={["ID", "Título / Descripción", "Tipo", "Estatus", "Fecha", "Asignado por"]}>
                    {sortedAssigned.length === 0 && !isLoading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">No se encontraron tareas.</td></tr>
                    ) : (
                        sortedAssigned.slice(0, 5).map((task) => {
                            const config = getStatusConfig(task.iIdStatus);
                            return (
                                <tr key={task.iIdTask} onClick={() => navigate(`/my-tasks/${task.iIdTask}`)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 cursor-pointer group">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors w-20 pl-8">#{task.iIdTask}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col justify-center">
                                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate max-w-[300px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.sName || task.sDescription}</span>
                                            {task.sName && <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium truncate max-w-[300px] mt-0.5 tracking-tight">{task.sDescription}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">{task.taskTypeName}</span></td>
                                    <td className="px-6 py-4"><Badge variant={config.variant as any} className={`${config.className} border uppercase text-[10px] tracking-wide font-bold`}>{config.label}</Badge></td>
                                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{formatApiDate(task.dDateUserCreate || task.dTaskStartDate)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(task.iIdTask)} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}>{getInitials(task.userCreateName)}</div>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden xl:block">{task.userCreateName}</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </TableSection>

                {/* TAREAS DELEGADAS */}
                <TableSection title="Tareas que he Delegado" icon="send" isLoading={isLoading} onViewAll={() => navigate('/my-tasks/delegated')} columns={["ID", "Título / Descripción", "Tipo", "Estatus", "Fecha", "Asignado a"]}>
                    {sortedDelegated.length === 0 && !isLoading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">No se encontraron tareas delegadas.</td></tr>
                    ) : (
                        sortedDelegated.slice(0, 5).map((task) => {
                            const config = getStatusConfig(task.iIdStatus);
                            return (
                                <tr key={task.iIdTask} onClick={() => navigate(`/my-tasks/${task.iIdTask}`)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 cursor-pointer group">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors w-20 pl-8">#{task.iIdTask}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col justify-center">
                                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate max-w-[300px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.sName || task.sDescription}</span>
                                            {task.sName && <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium truncate max-w-[300px] mt-0.5 tracking-tight">{task.sDescription}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">{task.taskTypeName}</span></td>
                                    <td className="px-6 py-4"><Badge variant={config.variant as any} className={`${config.className} border uppercase text-[10px] tracking-wide font-bold`}>{config.label}</Badge></td>
                                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{formatApiDate(task.dDateUserCreate || task.dTaskStartDate)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(task.iIdTask + 1)} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}>{getInitials(task.userAssignedName)}</div>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden xl:block">{task.userAssignedName}</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </TableSection>

                {/* TAREAS PERSONALES */}
                <TableSection title="Mis Tareas Personales" icon="person" isLoading={isLoading} onViewAll={() => navigate('/my-tasks/personal')} columns={["ID", "Título / Descripción", "Tipo", "Estatus", "Creado", "Inicio"]}>
                    {sortedPersonal.length === 0 && !isLoading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">No se encontraron tareas personales.</td></tr>
                    ) : (
                        sortedPersonal.slice(0, 5).map((task) => {
                            const config = getStatusConfig(task.iIdStatus);
                            const typeName = getTaskTypeName(task.iIdTaskType);
                            const taskName = (task as any).sName;
                            return (
                                <tr key={task.iIdTask} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 cursor-pointer group" onClick={() => navigate(`/my-tasks/${task.iIdTask}`)}>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors w-20 pl-8">#{task.iIdTask}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col justify-center">
                                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate max-w-[300px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{taskName || task.sDescription}</span>
                                            {taskName && <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium truncate max-w-[300px] mt-0.5 tracking-tight">{task.sDescription}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">{typeName}</span></td>
                                    <td className="px-6 py-4"><Badge variant={config.variant as any} className={`${config.className} border uppercase text-[10px] tracking-wide font-bold`}>{config.label}</Badge></td>
                                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{formatApiDate(task.dDateUserCreate)}</td>
                                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{formatApiDate(task.dTaskStartDate)}</td>
                                </tr>
                            );
                        })
                    )}
                </TableSection>
            </div>
        </motion.div>
    );
};

const TableSection = ({ title, icon, isLoading, columns, children, onViewAll }: TableSectionProps) => {
    return (
        <Card className="flex flex-col shadow-lg bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-[24px] overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-transparent">
                <div className="flex items-center gap-3">
                    {icon && <span className="material-symbols-rounded text-slate-400 text-[22px]">{icon}</span>}
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight">{title}</h3>
                </div>
                {onViewAll && (
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onViewAll} 
                        className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        Ver todo
                    </motion.button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-slate-50/50 dark:bg-[#0f172a]/30">
                            {columns.map((col, i) => <th key={i} className={`px-6 py-4 ${i === 0 ? 'pl-8' : ''}`}>{col}</th>)}
                        </tr>
                    </thead>
                    <tbody className="text-sm bg-white dark:bg-[#1e293b]">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50">
                                    {columns.map((_, j) => <td key={j} className={`px-6 py-5 ${j === 0 ? 'pl-8' : ''}`}><Skeleton className="h-6 w-full rounded-md" /></td>)}
                                </tr>
                            ))
                        ) : children}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};