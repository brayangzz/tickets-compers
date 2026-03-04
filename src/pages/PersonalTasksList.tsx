import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";

// IMPORTAMOS SERVICIOS
import { getPersonalTasks, deletePersonalTask, type PersonalTask } from "../services/taskService";
import { getTaskTypes, type TaskType } from "../services/catalogService";

// --- INTERFACES LOCALES PARA ESTATUS ---
interface ApiStatus {
    iIdStatus: number;
    sStatus: string;
    bActive?: boolean;
}

// ─── UTILIDAD DE PORTAL PARA SELECT ──────────────────────────────────────────
const usePortalPos = () => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const updatePos = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 8, left: r.left + window.scrollX, width: r.width });
  };
  return { triggerRef, pos, updatePos };
};

// ─── DROPDOWN PREMIUM (SIN SALTOS Y RESPONSIVO) ──────────────────────────────
const CustomDropdown = ({ value, onChange, options, placeholder }: { value: string, onChange: (v: string) => void, options: { id: string | number, label: string }[], placeholder: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { triggerRef, pos, updatePos } = usePortalPos();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (!triggerRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
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

    const selectedLabel = value === "all" ? placeholder : options.find(o => String(o.id) === String(value))?.label || placeholder;

    return (
        <>
            <motion.button
                ref={triggerRef}
                type="button"
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    updatePos(); 
                    setIsOpen(!isOpen); 
                }}
                className={`flex items-center justify-between gap-1.5 sm:gap-2 h-11 w-full px-4 sm:px-5 bg-slate-50 dark:bg-slate-900/50 border hover:border-slate-200 dark:hover:border-slate-700 rounded-full text-[13px] sm:text-sm font-bold transition-all shrink-0 ${isOpen ? "border-blue-500 ring-2 ring-blue-500/20 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-600 dark:text-slate-300"}`}
            >
                <span className="truncate">{selectedLabel}</span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="material-symbols-rounded text-[18px] sm:text-xl text-slate-400 shrink-0">expand_more</motion.span>
            </motion.button>

            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            ref={dropdownRef} 
                            style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 200), zIndex: 99999 }}
                            initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: -10, scale: 0.95 }} 
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-2"
                        >
                            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto comments-scroll">
                                <button 
                                    type="button"
                                    onClick={() => { onChange("all"); setIsOpen(false); }} 
                                    className={`px-4 py-2.5 rounded-xl text-left text-[13px] sm:text-sm font-bold transition-all ${value === "all" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                                >
                                    Todos los estatus
                                </button>
                                
                                {options.length === 0 && (
                                    <div className="px-4 py-3 text-xs text-slate-400 text-center font-medium">Buscando opciones...</div>
                                )}

                                {options.map(opt => (
                                    <button 
                                        type="button"
                                        key={opt.id} 
                                        onClick={() => { onChange(String(opt.id)); setIsOpen(false); }} 
                                        className={`px-4 py-2.5 rounded-xl text-left text-[13px] sm:text-sm font-bold transition-all flex justify-between items-center ${String(value) === String(opt.id) ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {String(value) === String(opt.id) && <span className="material-symbols-rounded text-[18px] shrink-0">check</span>}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export const PersonalTasksList = () => {
  const navigate = useNavigate();
  
  // --- ESTADOS DE DATOS ---
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [statuses, setStatuses] = useState<ApiStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ESTADOS DE FILTROS Y PAGINACIÓN ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateOrder, setDateOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Paginación activa para 8 ítems

  // CARGAR DATOS
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { "Authorization": `Bearer ${token}` };

        // Solicitamos Tareas y Tipos
        const [tasksData, typesData] = await Promise.all([
          getPersonalTasks(),
          getTaskTypes()
        ]);

        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setTaskTypes(Array.isArray(typesData) ? typesData : []);

        // Solicitamos Estatus Seguro
        let validStatuses: ApiStatus[] = [];
        try {
            const statusRes = await fetch("https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/general/status", { headers });
            if (statusRes.ok) {
                const statusData = await statusRes.json();
                validStatuses = Array.isArray(statusData) ? statusData : (statusData?.data || statusData?.result || []);
            }
        } catch (error) {
            console.error("Error cargando estatus:", error);
        }

        // Respaldo
        if (!Array.isArray(validStatuses) || validStatuses.length === 0) {
            validStatuses = [
                { iIdStatus: 1, sStatus: "Pendiente" }, { iIdStatus: 2, sStatus: "Abierto" },
                { iIdStatus: 3, sStatus: "En Proceso" }, { iIdStatus: 4, sStatus: "Completada" },
                { iIdStatus: 5, sStatus: "Solucionado" }, { iIdStatus: 6, sStatus: "Cancelada" }
            ];
        }

        setStatuses(validStatuses);

      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // --- LÓGICA DE ELIMINAR ---
  const handleDelete = async (e: React.MouseEvent, id: number) => {
      e.stopPropagation(); 
      if (!window.confirm("¿Estás seguro de eliminar esta tarea?")) return;

      const success = await deletePersonalTask(id);
      if (success) {
          setTasks(prev => prev.filter(t => t.iIdTask !== id));
      } else {
          alert("No se pudo eliminar la tarea");
      }
  };

  // --- HELPERS ---
  const formatApiDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getTaskTypeName = (id: number) => {
    const type = taskTypes.find(t => t.iIdTaskType === id);
    return type ? type.sTaskType : "General";
  };

  const getStatusInfo = (id: number) => {
    const statusObj = statuses.find(s => s.iIdStatus === id);                                                                                                                                                                                                                                                                                                                                                                                                                            
    const label = statusObj ? statusObj.sStatus.toUpperCase() : "DESCONOCIDO";
    let variant = 'neutral';
    let className = "";

    switch (id) {
        case 1: className = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"; variant = "warning"; break;
        case 2: className = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"; variant = "info"; break;
        case 3: className = "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800"; variant = "info"; break;
        case 4: className = "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"; variant = "success"; break;
        case 5: className = "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800"; variant = "success"; break;
        case 6: className = "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800"; variant = "danger"; break;
        default: className = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"; variant = "neutral";
    }
    return { label, className, variant };
  };

  // --- FILTRADO Y ORDENAMIENTO ---
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
        const typeName = getTaskTypeName(task.iIdTaskType).toLowerCase();
        const description = task.sDescription?.toLowerCase() || "";
        const title = (task as any).sName?.toLowerCase() || "";
        const search = searchTerm.toLowerCase();
        
        const matchesSearch = description.includes(search) || typeName.includes(search) || title.includes(search) || task.iIdTask.toString().includes(search);
        const matchesStatus = statusFilter === "all" || task.iIdStatus === Number(statusFilter);

        return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
        const dateA = new Date(a.dDateUserCreate).getTime();
        const dateB = new Date(b.dDateUserCreate).getTime();
        return dateOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, dateOrder, taskTypes]);

  // --- PAGINACIÓN CÁLCULOS ---
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const currentTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reiniciar página si cambian los filtros
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, dateOrder]);

  const handleReset = () => {
      setSearchTerm("");
      setStatusFilter("all");
      setDateOrder("desc");
  };

  // Status map (Excluyendo "Solucionado")
  const statusOptions = statuses
    .filter(s => s && s.iIdStatus !== 5 && s.sStatus && !s.sStatus.toLowerCase().includes("solucionado"))
    .map(s => ({ id: s.iIdStatus, label: s.sStatus }));

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || dateOrder !== "desc";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 font-display text-slate-900 dark:text-white"
    >
      
      {/* HEADER */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)}
              className="w-12 h-12 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm group"
            >
              <span className="material-symbols-rounded text-2xl group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            </motion.button>

            <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/my-tasks/new')}
                className="px-5 sm:px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[13px] sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
            >
                <span className="material-symbols-rounded text-[18px] sm:text-xl">add</span> Nueva Tarea
            </motion.button>
        </div>

        <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Mis Tareas Personales</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-base sm:text-lg">Administra tus pendientes privados y recordatorios.</p>
        </div>
      </div>

      {/* CARD PRINCIPAL */}
      <Card className="flex flex-col shadow-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 p-0 overflow-hidden rounded-[24px]">
          
          {/* BARRA DE FILTROS PREMIUM */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              
              {/* Buscador */}
              <div className="w-full xl:w-96 relative group shrink-0">
                  <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors text-xl">search</span>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por Título, Descripción o ID..." 
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0f172a]/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                  />
              </div>

              {/* Controles: Ordenamiento, Estatus, Limpiar */}
              <div className="flex flex-row w-full xl:w-auto gap-2 sm:gap-3 items-center justify-end">
                  
                  {/* Botón de Ordenamiento Dinámico */}
                  <motion.button 
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setDateOrder(dateOrder === "desc" ? "asc" : "desc")}
                      className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 sm:gap-2 h-11 px-3 sm:px-5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-full text-[13px] sm:text-sm font-bold text-slate-600 dark:text-slate-300 transition-all shadow-sm whitespace-nowrap overflow-hidden"
                  >
                      <span className={`material-symbols-rounded text-[18px] sm:text-[20px] transition-transform duration-300 shrink-0 ${dateOrder === "desc" ? "text-blue-500" : "text-slate-400 rotate-180"}`}>
                          sort
                      </span>
                      <span className="truncate">{dateOrder === "desc" ? "Recientes" : "Antiguos"}</span>
                  </motion.button>

                  {/* Selector de Estatus */}
                  <div className="flex-1 xl:flex-none relative z-50 min-w-[120px] max-w-[160px] sm:max-w-none">
                      <CustomDropdown 
                          value={statusFilter} 
                          onChange={setStatusFilter} 
                          options={statusOptions} 
                          placeholder="Estatus" 
                      />
                  </div>
                  
                  {/* Contenedor Fijo para evitar Layout Shift */}
                  <div className="w-11 h-11 shrink-0 relative">
                      <AnimatePresence>
                          {hasActiveFilters && (
                              <motion.button 
                                  initial={{ opacity: 0, scale: 0.5, rotate: -90 }} 
                                  animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                                  exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                  onClick={handleReset} 
                                  whileHover={{ scale: 1.1, rotate: 180 }} 
                                  whileTap={{ scale: 0.9 }} 
                                  className="absolute inset-0 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-full border border-rose-200 dark:border-rose-500/30 text-rose-500 dark:text-rose-400 transition-colors shadow-sm" 
                                  title="Limpiar filtros"
                              >
                                  <span className="material-symbols-rounded text-[20px]">filter_alt_off</span>
                              </motion.button>
                          )}
                      </AnimatePresence>
                  </div>

              </div>
          </div>

          {/* TABLA */}
          <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/30">
                          <th className="px-8 py-5 pl-8">#ID</th>
                          <th className="px-6 py-5">Título / Descripción</th>
                          <th className="px-6 py-5">Tipo</th>
                          <th className="px-6 py-5">Estatus</th>
                          <th className="px-6 py-5">Fecha Inicio</th>
                          <th className="px-6 py-5 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="text-sm">
                      <AnimatePresence mode="popLayout">
                          {isLoading ? (
                              [...Array(5)].map((_, i) => (
                                  <motion.tr key={`skel-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-slate-100 dark:border-slate-800/50">
                                      <td className="px-8 py-5 pl-8"><Skeleton className="h-4 w-8 rounded" /></td>
                                      <td className="px-6 py-5">
                                          <div className="flex flex-col gap-2">
                                              <Skeleton className="h-4 w-48 rounded" />
                                              <Skeleton className="h-3 w-32 rounded" />
                                          </div>
                                      </td>
                                      <td className="px-6 py-5"><Skeleton className="h-6 w-24 rounded-md" /></td>
                                      <td className="px-6 py-5"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                      <td className="px-6 py-5"><Skeleton className="h-4 w-24 rounded" /></td>
                                      <td className="px-6 py-5"><Skeleton className="h-8 w-16 ml-auto rounded" /></td>
                                  </motion.tr>
                              ))
                          ) : currentTasks.length === 0 ? (
                              <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                  <td colSpan={6} className="px-8 py-20 text-center text-slate-500">
                                      <div className="flex flex-col items-center gap-4 opacity-50">
                                          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                                              <span className="material-symbols-rounded text-4xl">inbox</span>
                                          </div>
                                          <p className="font-medium text-slate-500">No se encontraron tareas personales con estos filtros.</p>
                                      </div>
                                  </td>
                              </motion.tr>
                          ) : (
                              currentTasks.map((task, index) => {
                                  const config = getStatusInfo(task.iIdStatus);
                                  const typeName = getTaskTypeName(task.iIdTaskType);
                                  const taskName = (task as any).sName;

                                  return (
                                    <motion.tr 
                                        layout
                                        key={task.iIdTask} 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, delay: index * 0.03, ease: "easeOut" }}
                                        onClick={() => navigate(`/my-tasks/${task.iIdTask}`)} 
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 group cursor-pointer"
                                    >
                                        <td className="px-8 py-5 pl-8 text-slate-400 font-bold text-xs group-hover:text-blue-500 transition-colors">#{task.iIdTask}</td>
                                        
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col justify-center">
                                                <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate max-w-[300px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {taskName || task.sDescription}
                                                </span>
                                                {taskName && <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium truncate max-w-[300px] mt-0.5 tracking-tight">{task.sDescription}</span>}
                                            </div>
                                        </td>

                                        <td className="px-6 py-5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
                                                {typeName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <Badge variant={config.variant as any} className={`${config.className} border uppercase text-[10px] tracking-wide font-bold`}>
                                                {config.label}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 text-slate-500 font-medium text-xs">
                                            {formatApiDate(task.dTaskStartDate)}
                                        </td>
                                        
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 transition-colors" title="Ver detalle">
                                                    <span className="material-symbols-rounded text-lg">visibility</span>
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDelete(e, task.iIdTask)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
                                                    title="Eliminar tarea"
                                                >
                                                    <span className="material-symbols-rounded text-lg">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                  );
                              })
                          )}
                      </AnimatePresence>
                  </tbody>
              </table>
          </div>
          
          {/* PAGINACIÓN */}
          {!isLoading && filteredTasks.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-transparent">
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <span>
                  {filteredTasks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, filteredTasks.length)} de{" "}
                  <b className="text-slate-800 dark:text-slate-200">{filteredTasks.length}</b> tareas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                >
                  <span className="material-symbols-rounded text-[20px]">chevron_left</span>
                </motion.button>

                <div className="flex items-center gap-1 hidden sm:flex">
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (totalPages > 5 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) return null;
                    return (
                      <motion.button
                        key={page}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full text-xs font-bold transition-all ${currentPage === page ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                      >
                        {page}
                      </motion.button>
                    );
                  })}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                >
                  <span className="material-symbols-rounded text-[20px]">chevron_right</span>
                </motion.button>
              </div>
            </div>
          )}
      </Card>
    </motion.div>
  );
};