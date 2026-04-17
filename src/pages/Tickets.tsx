import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";

// Servicios
import { getTickets, type Ticket } from "../services/ticketService";
import {
  getBranches,
  getDepartments,
  getStatuses,
  type Branch,
  type Department,
  type Status,
} from "../services/catalogService";
import { getLocalStorageJSON } from "../utils/storage";

// Modal Exportar
import { ExportTicketModal } from "../components/modals/ExportTicketModal";
import { getInitials, getAvatarGradient } from "../utils/user";
import { getStatusConfig } from "../utils/status";
import { fetchCached } from "../utils/cache";

export const Tickets = () => {
  const navigate = useNavigate();

  // Estados de Datos
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Filtros
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");

  // Controles Dropdown
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modales
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // --- USUARIO Y ROLES ---
  const userObj = getLocalStorageJSON<{
    iIdRol?: number | string;
    roleId?: number | string;
    iIdUser?: number | string;
    idUser?: number | string;
  }>("user", {});
  const isDani = Number(userObj.iIdRol || userObj.roleId || 0) === 32;
  const currentUserId = Number(userObj.iIdUser || userObj.idUser || 0);

  const pageTitle = isDani ? "Gestión de Tickets" : "Mis Reportes";
  const pageSubtitle = isDani
    ? "Administra, asigna y resuelve las incidencias de toda la organización."
    : "Consulta el estado y seguimiento de las solicitudes que has creado.";

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        // Disparamos tickets de inmediato
        const pTickets = getTickets();

        const pBranches = fetchCached('app_branches', () => getBranches());
        const pDepts = fetchCached('app_departments', () => getDepartments());
        const pStatuses = fetchCached('app_statuses', () => getStatuses());

        const [ticketsData, branchesData, deptsData, statusData] = await Promise.all([
          pTickets, pBranches, pDepts, pStatuses
        ]);

        let allTickets = Array.isArray(ticketsData) ? ticketsData : [];
        if (!isDani) allTickets = allTickets.filter((t) => t.iIdUserRaisedTask === currentUserId);

        setTickets(allTickets);
        setBranches(Array.isArray(branchesData) ? branchesData : []);
        setDepartments(Array.isArray(deptsData) ? deptsData : []);
        setStatuses(Array.isArray(statusData) ? statusData : []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    if (userObj) loadAllData();
  }, [isDani, currentUserId]);

  // Click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) setIsStatusOpen(false);
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) setIsBranchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- FILTRADO Y ORDENAMIENTO ---
  const filteredData = useMemo(() => {
    return tickets
      .filter((t) => {
        const matchBranch = filterBranch === "all" || t.branchId === Number(filterBranch);
        const matchStatus = filterStatus === "all" || t.iIdStatus === Number(filterStatus);
        const searchLower = searchTerm.toLowerCase();
        const matchSearch =
          (t.sName && t.sName.toLowerCase().includes(searchLower)) ||
          (t.sDescription && t.sDescription.toLowerCase().includes(searchLower)) ||
          t.iIdTask.toString().includes(searchLower) ||
          (t.userRaisedName && t.userRaisedName.toLowerCase().includes(searchLower)) ||
          (t.branchName && t.branchName.toLowerCase().includes(searchLower));
        return matchBranch && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dDateUserCreate).getTime();
        const dateB = new Date(b.dDateUserCreate).getTime();
        return filterDate === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [tickets, filterBranch, filterStatus, filterDate, searchTerm]);

  // --- PAGINACIÓN ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedTickets = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [filterBranch, filterStatus, searchTerm]);

  // --- HELPERS DE ESTILOS ---

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <>
      <style>{`
        /* Evita layout shift en Gestión de Tickets:
           1) reserva espacio de scrollbar siempre
           2) oculta visualmente la barra vertical */
        html { overflow-y: scroll; scrollbar-gutter: stable; }
        html, body { -ms-overflow-style: none; scrollbar-width: none; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0; height: 0; display: none; }
      `}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 font-display text-txt-main"
      >
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">{pageTitle}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">{pageSubtitle}</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {isDani && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
              onClick={() => setIsExportModalOpen(true)}
              className="w-full md:w-auto px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white rounded-full text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-[20px]">ios_share</span> Exportar
            </motion.button>
          )}
          {!isDani && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/tickets/new")}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-[20px]">add</span> Nuevo Ticket
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* TOOLBAR PÍLDORA (Responsivo) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-sm rounded-[24px] lg:rounded-full flex flex-col lg:flex-row gap-2 items-center justify-between sticky top-4 z-30"
      >
        <div className="flex flex-col md:flex-row w-full lg:w-auto items-center gap-2">
          {/* Búsqueda */}
          <div className="relative group w-full md:w-80 h-12 shrink-0">
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors text-xl">search</span>
            <input
              type="text"
              placeholder="Buscar por ID, título o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full pl-12 pr-4 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-blue-500/30 rounded-full text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-slate-200 font-medium placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* Orden fecha */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setFilterDate(filterDate === "desc" ? "asc" : "desc")}
            className="flex items-center justify-center gap-2 h-12 px-6 bg-slate-50 dark:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 transition-all w-full md:w-auto shrink-0"
          >
            <span className="material-symbols-rounded text-[20px] text-slate-400">
              {filterDate === "desc" ? "sort" : "filter_list"}
            </span>
            {filterDate === "desc" ? "Recientes" : "Antiguos"}
          </motion.button>
        </div>

        {/* Filtros + Reset (Responsivos) */}
        <motion.div
          layout
          transition={{ layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
          className="flex gap-2 w-full lg:w-auto shrink-0"
        >
          {/* Filtro Estatus - SE AÑADIÓ min-w-0 */}
          <motion.div
            layout="position"
            transition={{ layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
            className="relative flex-1 min-w-0 lg:flex-none"
            ref={statusRef}
          >
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              // Padding y gap reducidos en móvil para evitar empujar otros elementos
              className={`flex items-center justify-between gap-1.5 sm:gap-3 h-12 w-full lg:w-auto px-3 sm:px-5 rounded-full border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm ${isStatusOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 dark:border-slate-700"}`}
            >
              <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate">
                {filterStatus === "all" ? "Estatus" : statuses.find((s) => s.iIdStatus === Number(filterStatus))?.sStatus}
              </span>
              <span className="material-symbols-rounded text-slate-400 shrink-0 text-[18px] sm:text-[24px]" style={{ transform: isStatusOpen ? "rotate(180deg)" : "none" }}>expand_more</span>
            </motion.button>
            <AnimatePresence>
              {isStatusOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute left-0 lg:right-0 mt-2 w-56 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-[100] p-2"
                >
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto comments-scroll">
                    <button onClick={() => { setFilterStatus("all"); setIsStatusOpen(false); }} className={`px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${filterStatus === "all" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Todos los estatus</button>

                    {statuses
                      .filter((s) => s.iIdStatus !== 4)
                      .map((s) => (
                        <button key={s.iIdStatus} onClick={() => { setFilterStatus(s.iIdStatus.toString()); setIsStatusOpen(false); }} className={`px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${filterStatus === s.iIdStatus.toString() ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{s.sStatus}</button>
                      ))}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Filtro Sucursal - SE AÑADIÓ min-w-0 */}
          <motion.div
            layout="position"
            transition={{ layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
            className="relative flex-1 min-w-0 lg:flex-none"
            ref={branchRef}
          >
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setIsBranchOpen(!isBranchOpen)}
              // Padding y gap reducidos en móvil para evitar empujar otros elementos
              className={`flex items-center justify-between gap-1.5 sm:gap-3 h-12 w-full lg:w-auto px-3 sm:px-5 rounded-full border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm ${isBranchOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 dark:border-slate-700"}`}
            >
              <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate">
                {filterBranch === "all" ? "Sucursal" : branches.find((b) => b.iIdBranch === Number(filterBranch))?.sBranch}
              </span>
              <span className="material-symbols-rounded text-slate-400 shrink-0 text-[18px] sm:text-[24px]" style={{ transform: isBranchOpen ? "rotate(180deg)" : "none" }}>expand_more</span>
            </motion.button>
            <AnimatePresence>
              {isBranchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 sm:w-64 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-[100] p-2"
                >
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto comments-scroll">
                    <button onClick={() => { setFilterBranch("all"); setIsBranchOpen(false); }} className={`px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${filterBranch === "all" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Todas las sucursales</button>
                    {branches.map((b) => (
                      <button key={b.iIdBranch} onClick={() => { setFilterBranch(b.iIdBranch.toString()); setIsBranchOpen(false); }} className={`px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${filterBranch === b.iIdBranch.toString() ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{b.sBranch}</button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Reset animado: al ocultarse, los filtros se deslizan suave sin salto */}
          <AnimatePresence initial={false} mode="popLayout">
            {(searchTerm !== "" || filterStatus !== "all" || filterBranch !== "all" || filterDate !== "desc") && (
              <motion.button
                key="tickets-reset-filters"
                layout
                initial={{ opacity: 0, scale: 0.88, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.88, x: 8 }}
                transition={{
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
                }}
                onClick={() => { setSearchTerm(""); setFilterStatus("all"); setFilterBranch("all"); setFilterDate("desc"); }}
                whileHover={{ scale: 1.05, rotate: 180 }}
                whileTap={{ scale: 0.95 }}
                className="w-12 h-12 min-w-12 min-h-12 aspect-square p-0 flex-none flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-full border border-rose-200 dark:border-rose-500/30 text-rose-500 dark:text-rose-400 transition-colors overflow-hidden"
                title="Limpiar filtros"
              >
                <span className="material-symbols-rounded text-[20px] leading-none">filter_alt_off</span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* TABLA PRINCIPAL */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}>
        <Card className="overflow-hidden shadow-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-[24px] p-0">
          <div className="overflow-x-auto overflow-y-hidden min-h-[400px] hide-scrollbar [scrollbar-gutter:stable]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase tracking-widest text-slate-500 font-extrabold bg-slate-50/50 dark:bg-[#0f172a]/30">
                  <th className="px-8 py-5">#ID</th>
                  <th className="px-6 py-5 w-1/3">Asunto / Descripción</th>
                  <th className="px-6 py-5">Solicitado por</th>
                  <th className="px-6 py-5">Ubicación</th>
                  <th className="px-6 py-5">Estado actual</th>
                  <th className="px-6 py-5 text-right">Creación</th>
                </tr>
              </thead>

              <tbody className="text-sm bg-white dark:bg-[#1e293b]">
                <AnimatePresence mode="popLayout">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <motion.tr key={`skel-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="px-8 py-6"><Skeleton className="h-4 w-8 rounded" /></td>
                        <td className="px-6 py-6"><Skeleton className="h-4 w-48 rounded" /></td>
                        <td className="px-6 py-6"><Skeleton className="h-8 w-8 rounded-full" /></td>
                        <td className="px-6 py-6"><Skeleton className="h-6 w-32 rounded-md" /></td>
                        <td className="px-6 py-6"><Skeleton className="h-6 w-24 rounded-full" /></td>
                        <td className="px-6 py-6"><Skeleton className="h-4 w-24 rounded ml-auto" /></td>
                      </motion.tr>
                    ))
                  ) : paginatedTickets.length === 0 ? (
                    <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td colSpan={6} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-50">
                          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <span className="material-symbols-rounded text-4xl">inventory_2</span>
                          </div>
                          <p className="font-medium text-slate-500">No se encontraron tickets con estos filtros.</p>
                        </div>
                      </td>
                    </motion.tr>
                  ) : (
                    paginatedTickets.map((t, index) => {
                      const status = getStatusConfig(t.iIdStatus);
                      const taskName = (t as any).sName;
                      return (
                        <motion.tr
                          layout
                          key={t.iIdTask}
                          onClick={() => navigate(`/tickets/${t.iIdTask}`)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
                          className="group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-200 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                        >
                          <td className="px-8 py-6">
                            <span className="font-bold text-[12px] text-slate-400 group-hover:text-blue-500 transition-colors bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700">
                              #{t.iIdTask}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col justify-center gap-1">
                              <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate max-w-[350px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {taskName || t.sDescription}
                              </span>
                              {taskName && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold truncate max-w-[350px] tracking-wide">
                                  {t.sDescription}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(t.iIdTask)} flex items-center justify-center text-[10px] font-bold text-white shadow-md ring-2 ring-white dark:ring-[#1e293b]`}>
                                {getInitials(t.userRaisedName || "Us")}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.userRaisedName || "Desconocido"}</span>
                                <span className="text-[10px] text-slate-400">Usuario</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-xs text-slate-500">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <span className="material-symbols-rounded text-sm text-blue-500">store</span>
                                {t.branchName || "General"}
                              </span>
                              <span className="opacity-70 pl-5">{t.departmentName || "—"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${status.className} shadow-sm`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`}></div>
                              <span className="text-[10px] font-extrabold uppercase tracking-widest">{status.label}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <span className="text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
                              {formatDate(t.dDateUserCreate)}
                            </span>
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
          {!isLoading && filteredData.length > 0 && (
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-transparent">
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <span>Página</span>
                <AnimatePresence mode="popLayout">
                  <motion.b
                    key={currentPage}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-slate-800 dark:text-slate-200 inline-block w-3 text-center"
                  >
                    {currentPage}
                  </motion.b>
                </AnimatePresence>
                <span>de <b className="text-slate-800 dark:text-slate-200">{totalPages}</b></span>
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

                <div className="flex items-center gap-1">
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

      {/* MODAL EXPORTAR CON MARGEN RESPONSIVO (P-4) */}
      <AnimatePresence>
        {isExportModalOpen && (
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
          >
            <motion.div
              key="modal-content"
              initial={{ scale: 0.90, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg flex items-center justify-center"
            >
              <ExportTicketModal
                isOpen={true}
                onClose={() => setIsExportModalOpen(false)}
                data={filteredData as any}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </>
  );
};
