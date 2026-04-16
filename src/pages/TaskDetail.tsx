import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { getPersonalTasks, updatePersonalTask, deletePersonalTask, type UpdateTaskPayload } from "../services/taskService";
import { getStatuses, type Status } from "../services/catalogService";
import { motion, AnimatePresence } from "framer-motion";
import { getInitials, getAvatarGradient } from "../utils/user";
import { getStatusStyle } from "../utils/status";
import { getLocalStorageJSON, getSessionStorageJSON } from "../utils/storage";
import { toApiUrl } from "../config/api";

// --- INTERFACES BASADAS EN TU POSTMAN ---
interface ApiTask {
    iIdTask: number;
    sName?: string; // <--- AÑADIDO: Soporte para Título
    iIdTaskType: number;
    iIdStatus: number;
    taskTypeName?: string;
    statusName?: string;
    iIdUserCreate?: number; 
    userCreateName?: string;
    iIdUserTaskAssigned?: number; 
    userAssignedName?: string;
    sDescription: string;
    dTaskStartDate: string | null;
    dDateUserCreate: string | null;
    dTaskCompletionDate?: string | null;
    iIdUserRaisedTask?: number;
    iIdBranch?: number | null;
    iIdDepartment?: number | null;
}

interface ApiFile {
    iIdTaskFile: number;
    sFileName: string;
    sFilePath: string;
    dDateUserCreate: string;
}

type TaskDetailUser = {
    ildUser?: number | string;
    iIdUser?: number | string;
};

// --- MODO EDICIÓN INTEGRADO (Título y Descripción) ---
export const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- IDENTIDAD DEL USUARIO ACTUAL ---
  const userObj = getLocalStorageJSON<TaskDetailUser>('user', {});
  const currentUserId = Number(userObj.ildUser || userObj.iIdUser || 0);

  // --- ESTADOS ---
  const [task, setTask] = useState<ApiTask | null>(null);
  const [files, setFiles] = useState<ApiFile[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentStatusId, setCurrentStatusId] = useState<number>(0);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // --- MODO EDICIÓN INTEGRADO (Título y Descripción) ---
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [titleEdit, setTitleEdit] = useState(""); // <--- AÑADIDO
  const [descriptionEdit, setDescriptionEdit] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [deleteTaskError, setDeleteTaskError] = useState<string | null>(null);

  const refreshPersonalTask = async (taskId: number) => {
    const personalTasks = await getPersonalTasks();
    if (!Array.isArray(personalTasks)) return null;
    return (personalTasks as ApiTask[]).find((item) => item.iIdTask === taskId) || null;
  };

  const buildPersonalTaskPayload = (source: ApiTask, overrides: Partial<UpdateTaskPayload> = {}): UpdateTaskPayload => ({
    sName: source.sName || "",
    sDescription: source.sDescription || "",
    iIdStatus: source.iIdStatus,
    dTaskCompletionDate: source.dTaskCompletionDate ?? null,
    iIdTaskType: source.iIdTaskType,
    dTaskStartDate: source.dTaskStartDate ?? null,
    iIdTask: source.iIdTask,
    iIdUserRaisedTask: source.iIdUserRaisedTask,
    iIdUserCreate: source.iIdUserCreate,
    iIdBranch: source.iIdBranch ?? null,
    iIdDepartment: source.iIdDepartment ?? null,
    bActive: true,
    ...overrides
  });

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { "Authorization": `Bearer ${token}` };
        const taskId = Number(id);

        const fetchCached = async <T,>(key: string, fetcher: () => Promise<T>) => {
            const cached = getSessionStorageJSON<T | null>(key, null);
            if (cached !== null) return cached;

            const data = await fetcher();
            if (data !== undefined) {
                sessionStorage.setItem(key, JSON.stringify(data));
            } else {
                sessionStorage.removeItem(key);
            }
            return data;
        };

        const pStatuses = fetchCached('app_statuses', () => getStatuses());

        const [assignedToMeRes, assignedByMeRes, personalData, filesRes, statusesData] = await Promise.all([
            fetch(toApiUrl("/tasks/assigned/assigned-to-me"), { headers }),
            fetch(toApiUrl("/tasks/assigned/assigned-by-me"), { headers }),
            getPersonalTasks(),
            fetch(toApiUrl(`/task-files/${taskId}`), { headers }),
            pStatuses
        ]);

        const assignedToMe = assignedToMeRes.ok ? await assignedToMeRes.json() : [];
        const assignedByMe = assignedByMeRes.ok ? await assignedByMeRes.json() : [];
        const filesData = filesRes.ok ? await filesRes.json() : [];

        const allTasks = [
            ...(Array.isArray(assignedToMe) ? assignedToMe : []), 
            ...(Array.isArray(assignedByMe) ? assignedByMe : []), 
            ...(Array.isArray(personalData) ? personalData : [])
        ];
        
        const foundTask = allTasks.find(t => t.iIdTask === taskId);

        if (foundTask) {
            setTask(foundTask);
            setCurrentStatusId(foundTask.iIdStatus);
            setDescriptionEdit(foundTask.sDescription);
            setTitleEdit(foundTask.sName || ""); // <--- AÑADIDO
        }
        
        setFiles(Array.isArray(filesData) ? filesData : []);
        setStatuses(Array.isArray(statusesData) ? statusesData : []);
        
      } catch (error) { 
          console.error("Error cargando detalle de tarea:", error); 
      } finally { 
          setIsLoading(false); 
      }
    };
    loadData();
  }, [id]);

  // --- PERMISOS ---
  const isPersonalTask = task?.iIdTaskType === 18 || !task?.iIdUserTaskAssigned; 
  const amITheAssignee = task?.iIdUserTaskAssigned === currentUserId;
  
  const canEditStatus = isPersonalTask || amITheAssignee;
  const canEditDescription = isPersonalTask; // Solo se edita si es tarea personal

  // --- GUARDAR ESTATUS ---
  const handleSaveStatus = async () => {
    if (!task) return;
    setIsSavingStatus(true);
    try {
        const token = localStorage.getItem('token');
        let success = false;

        if (isPersonalTask) {
            const payload = buildPersonalTaskPayload(task, {
                iIdStatus: currentStatusId,
                dTaskCompletionDate: currentStatusId === 4 || currentStatusId === 5 ? new Date().toISOString() : null,
            });
            success = await updatePersonalTask(task.iIdTask, payload);
        } else {
            const response = await fetch(toApiUrl("/tasks/assigned/status"), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    iIdTask: task.iIdTask,
                    iIdStatus: currentStatusId
                })
            });
            success = response.ok;
        }

        if (success) {
            setHasChanges(false);
            const refreshedTask = await refreshPersonalTask(task.iIdTask);
            setTask(refreshedTask ? { ...task, ...refreshedTask } : { ...task, iIdStatus: currentStatusId });
        } else {
            alert("Hubo un error al guardar el estatus.");
        }
    } catch (error) { 
        console.error(error); 
    } finally { 
        setIsSavingStatus(false); 
    }
  };

  // --- GUARDAR EDICIÓN (TÍTULO Y DESCRIPCIÓN) ---
  const handleSaveDescription = async () => {
      if (!task) return;
      if (!descriptionEdit.trim() || !titleEdit.trim()) {
          alert("El título y la descripción no pueden estar vacíos.");
          return;
      }
      
      setIsSavingEdit(true);
      try {
          const payload = buildPersonalTaskPayload(task, {
              sName: titleEdit.trim(),
              sDescription: descriptionEdit.trim(),
              iIdStatus: task.iIdStatus,
          });
          const success = await updatePersonalTask(task.iIdTask, payload);
          if (success) {
              const refreshedTask = await refreshPersonalTask(task.iIdTask);
              setTask(refreshedTask ? { ...task, ...refreshedTask } : { ...task, sDescription: descriptionEdit.trim(), sName: titleEdit.trim() });
              setDescriptionEdit(descriptionEdit.trim());
              setTitleEdit(titleEdit.trim());
              setIsEditingDescription(false);
          } else {
              alert("Error al actualizar la tarea");
          }
      } catch (e) { console.error(e); }
      setIsSavingEdit(false);
  };

  const handleCancelEdit = () => {
      setDescriptionEdit(task?.sDescription || "");
      setTitleEdit(task?.sName || "");
      setIsEditingDescription(false);
  };

  const openDeleteModal = () => {
      if (!task || isDeletingTask) return;
      setDeleteTaskError(null);
      setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
      if (isDeletingTask) return;
      setIsDeleteModalOpen(false);
      setDeleteTaskError(null);
  };
  const handleConfirmDelete = async () => {
      if (!task || isDeletingTask) return;
      setIsDeletingTask(true);
      setDeleteTaskError(null);
      try {
          const success = await deletePersonalTask(task.iIdTask);
          if (success) {
              setIsDeleteModalOpen(false);
              navigate(-1);
          } else {
              setDeleteTaskError("No se pudo eliminar la tarea. Intenta de nuevo.");
          }
      } catch (e) {
          console.error(e);
          setDeleteTaskError("No se pudo eliminar la tarea. Intenta de nuevo.");
      } finally {
          setIsDeletingTask(false);
      }
  };
  const formatDate = (d: string | null | undefined) => {
      if (!d) return "No especificada";
      const date = new Date(d);
      return new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000).toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) return <TaskDetailSkeleton />;
  if (!task) return <div className="p-10 text-center text-txt-muted text-xl font-bold mt-20 flex flex-col items-center gap-4"><span className="material-symbols-rounded text-6xl opacity-50">search_off</span> Tarea no encontrada o sin acceso.</div>;

  const currentStatusConfig = getStatusStyle(task.iIdStatus);

  return (
    <>
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto pb-12 font-display text-txt-main"
    >
      
      {/* --- HEADER DE NAVEGACIÓN Y BOTONES --- */}
      <div className="flex items-center justify-between h-12">
        <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} 
            className="flex items-center gap-3 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all duration-300 group"
        >
          <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
             <span className="material-symbols-rounded text-xl">arrow_back</span>
          </div>
          <span className="text-sm font-semibold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">Volver al Dashboard</span>
        </motion.button>

        {/* ACCIONES (Editar/Eliminar) - Solo para tareas personales */}
        {canEditDescription && (
            <motion.div key="view-actions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                <button onClick={openDeleteModal} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all font-bold text-sm">
                    <span className="material-symbols-rounded text-lg">delete</span>
                </button>
            </motion.div>
        )}
      </div>

      {/* --- HEADER TAREA --- */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
            <div className="flex flex-col gap-3 w-full lg:w-2/3">
                <div className="flex items-center gap-3">
                   <Badge variant="neutral" className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-0 uppercase tracking-widest text-[10px] font-bold px-3 py-1">
                       {task.taskTypeName || (isPersonalTask ? "Tarea Personal" : "Asignación")}
                   </Badge>
                </div>
                
                {/* ESTRUCTURA ROBUSTA PARA EL TÍTULO Y EL NÚMERO # */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {isEditingDescription ? (
                        <input 
                            type="text" 
                            value={titleEdit}
                            onChange={(e) => setTitleEdit(e.target.value)}
                            className="text-4xl md:text-5xl font-extrabold tracking-tight text-txt-main leading-tight bg-transparent border-b-2 border-blue-500 focus:outline-none w-full max-w-2xl py-1"
                            placeholder="Título de la tarea..."
                        />
                    ) : (
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight truncate max-w-[90%]" title={task.sName || "Detalle de Tarea"}>
                            {task.sName || (isPersonalTask ? "Tarea Personal" : "Tarea Asignada")}
                        </h1>
                    )}
                    {/* El '#' y el número ahora están en un bloque seguro para no perderse */}
                    <div className="flex items-baseline shrink-0">
                        <span className="text-3xl font-medium text-slate-300 dark:text-slate-600 mr-1 opacity-70">#</span>
                        <span className="text-5xl md:text-6xl font-black text-blue-500 drop-shadow-md">{task.iIdTask}</span>
                    </div>
                </div>
            </div>

            {/* CONTROL DE ESTATUS (Dinámico basado en Permisos) */}
            <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className="flex items-center gap-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-2 rounded-[24px] border border-slate-200/50 dark:border-slate-700/50 shadow-sm self-start xl:self-center">
                {canEditStatus ? (
                    <>
                        <ModernStatusSelector 
                            options={statuses} 
                            selectedId={currentStatusId} 
                            onChange={(id) => { setCurrentStatusId(id); setHasChanges(id !== task.iIdStatus); }} 
                        />
                        <AnimatePresence mode="popLayout">
                            {hasChanges && (
                                <motion.button 
                                    layout initial={{ scale: 0, opacity: 0, width: 0 }} animate={{ scale: 1, opacity: 1, width: 48 }} exit={{ scale: 0, opacity: 0, width: 0 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                    onClick={handleSaveStatus} disabled={isSavingStatus} 
                                    className="relative flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg overflow-hidden shrink-0 hover:bg-blue-500 transition-colors"
                                >
                                    {isSavingStatus ? <span className="material-symbols-rounded animate-spin text-xl">progress_activity</span> : <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="material-symbols-rounded text-xl">save</motion.span>}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </>
                ) : (
                    // VISTA ESTÁTICA SI NO TIENE PERMISOS PARA EDITAR
                    <div className="px-6 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full font-bold text-sm text-slate-500 flex items-center gap-3 shadow-inner">
                        <div className={`w-2.5 h-2.5 rounded-full ${currentStatusConfig.bg} animate-pulse`}></div>
                        <span className="uppercase tracking-widest">{task.statusName || currentStatusConfig.label}</span>
                    </div>
                )}
            </motion.div>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQUIERDA */}
          <div className="xl:col-span-2 flex flex-col gap-6">
              
              {/* DESCRIPCIÓN CON MODO EDICIÓN */}
              <Card className={`p-0 bg-white dark:bg-[#1e293b] border ${isEditingDescription ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'} shadow-sm rounded-[24px] overflow-hidden transition-all duration-300`}>
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400">
                              <span className="material-symbols-rounded text-xl">subject</span>
                          </div>
                          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Descripción de la Tarea</h3>
                      </div>
                      {isEditingDescription && <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded animate-pulse">EDITANDO</span>}
                  </div>
                  <div className="p-8">
                      {isEditingDescription ? (
                          <motion.textarea 
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="w-full bg-transparent text-lg md:text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed outline-none resize-none min-h-[150px] placeholder:text-slate-400"
                              value={descriptionEdit} onChange={(e) => setDescriptionEdit(e.target.value)}
                          />
                      ) : (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg md:text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                              {task.sDescription}
                          </motion.p>
                      )}
                  </div>
              </Card>

              {/* EVIDENCIAS ADJUNTAS */}
              <div>
                  <div className="flex items-center justify-between px-2 mb-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-rounded text-lg">folder_open</span> Archivos Adjuntos
                      </h3>
                  </div>

                  {files.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {files.map((file) => {
                              const isImage = file.sFilePath.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i);
                              return (
                                  <motion.div 
                                      key={file.iIdTaskFile} whileHover={{ scale: 1.02 }} onClick={() => isImage ? setPreviewImage(file.sFilePath) : window.open(file.sFilePath, '_blank')}
                                      className="group flex items-center gap-4 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                                  >
                                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center overflow-hidden relative">
                                          {isImage ? (
                                              <img src={file.sFilePath} alt="evidencia" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                          ) : (
                                              <span className="material-symbols-rounded text-2xl text-slate-400 group-hover:text-blue-500 transition-colors">description</span>
                                          )}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                          <p className="text-sm font-bold text-txt-main truncate group-hover:text-blue-500 transition-colors">{file.sFileName || "Archivo Adjunto"}</p>
                                          <p className="text-xs text-slate-400 mt-0.5">{isImage ? "Clic para ver imagen" : "Clic para descargar"}</p>
                                      </div>
                                  </motion.div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                          <span className="material-symbols-rounded text-3xl opacity-30 mb-2">image_not_supported</span>
                          <span className="text-xs font-medium">Sin archivos adjuntos</span>
                      </div>
                  )}
              </div>
          </div>

          {/* COLUMNA DERECHA (Detalles y Fechas) */}
          <div className="flex flex-col h-full">
              <Card className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 p-6 rounded-[24px] shadow-sm h-fit">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <span className="material-symbols-rounded text-slate-400">info</span>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Información General</h3>
                  </div>
                  
                  <div className="flex flex-col gap-6">
                      
                      {/* CREADOR DE LA TAREA */}
                      <div className="flex items-center gap-4 group">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(task.iIdTask)} text-white flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
                              <span className="text-xs font-bold">{getInitials(task.userCreateName || "YO")}</span>
                          </div>
                          <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{isPersonalTask ? "Propietario" : "Asignado por"}</p>
                              <p className="text-sm font-bold text-txt-main">{task.userCreateName || "Mi Tarea Personal"}</p>
                          </div>
                      </div>

                      {/* ASIGNADO A (Solo visible si es tarea delegada) */}
                      {!isPersonalTask && task.userAssignedName && (
                          <div className="flex items-center gap-4 group">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(task.iIdTask + 5)} text-white flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
                                  <span className="text-xs font-bold">{getInitials(task.userAssignedName)}</span>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Responsable Actual</p>
                                  <p className="text-sm font-bold text-txt-main">{task.userAssignedName}</p>
                              </div>
                          </div>
                      )}

                      {/* FECHAS */}
                      <div className="space-y-5 mt-2 border-t border-slate-100 dark:border-slate-800 pt-5">
                          <DetailRow icon="play_arrow" label="Fecha de Inicio" value={formatDate(task.dTaskStartDate)} color="text-blue-500" bg="bg-blue-500/10" />
                          {task.dTaskCompletionDate && (
                              <DetailRow icon="task_alt" label="Fecha Finalizada" value={formatDate(task.dTaskCompletionDate)} color="text-emerald-500" bg="bg-emerald-500/10" />
                          )}
                      </div>
                  </div>
              </Card>
          </div>
      </div>

      <AnimatePresence>
      {isDeleteModalOpen && task && (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeDeleteModal(); }}
        >
            <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 20 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-sm bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-[28px] shadow-2xl overflow-hidden"
            >
                <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-pink-600" />
                <div className="p-7 flex flex-col items-center text-center gap-5">
                    <motion.div
                        initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
                        className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shadow-inner"
                    >
                        <span className="material-symbols-rounded text-3xl text-rose-500">delete</span>
                    </motion.div>
                    <div className="flex flex-col gap-1.5">
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Eliminar tarea</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-snug">
                            Esta accion no se puede deshacer.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl w-full">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-[10px] font-bold text-white shadow">
                            #{task.iIdTask}
                        </div>
                        <div className="flex flex-col min-w-0 text-left">
                            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                                {task.sName || task.sDescription}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium truncate">
                                {task.sName ? task.sDescription : "Tarea personal"}
                            </span>
                        </div>
                    </div>
                    {deleteTaskError && (
                        <div className="w-full rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
                            {deleteTaskError}
                        </div>
                    )}
                    <div className="flex gap-3 w-full mt-1">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={closeDeleteModal}
                            disabled={isDeletingTask}
                            className="flex-1 py-3.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-40"
                        >
                            Cancelar
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(244,63,94,0.35)" }}
                            whileTap={{ scale: 0.96 }}
                            onClick={handleConfirmDelete}
                            disabled={isDeletingTask}
                            className="flex-[1.4] flex items-center justify-center gap-2 py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50"
                        >
                            {isDeletingTask ? (
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                    className="material-symbols-rounded text-[20px]"
                                >
                                    progress_activity
                                </motion.span>
                            ) : (
                                <>
                                    <span className="material-symbols-rounded text-[18px]">delete</span>
                                    Eliminar
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- LIGHTBOX DE IMAGEN --- */}
      <AnimatePresence>
      {previewImage && (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-2xl"
            onClick={() => setPreviewImage(null)}
        >
            <motion.button whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50 border border-white/10 shadow-xl backdrop-blur-sm">
                <span className="material-symbols-rounded text-2xl">close</span>
            </motion.button>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="flex-1 w-full h-full flex items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
                <img src={previewImage} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
            </motion.div>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="pb-8">
                <a href={previewImage} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-bold rounded-full shadow-xl hover:scale-105 transition-transform">
                    <span className="material-symbols-rounded">visibility</span> Abrir Original
                </a>
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </motion.div>
    </>
  );
};

// --- COMPONENTES AUXILIARES ESTILIZADOS ---
const DetailRow = ({ icon, label, value, bg, color }: any) => (
    <div className="flex items-center gap-4 group">
        <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
            <span className="material-symbols-rounded text-xl">{icon}</span>
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm font-bold text-txt-main">{value}</p>
        </div>
    </div>
);

const ModernStatusSelector = ({ options, selectedId, onChange }: { options: Status[], selectedId: number, onChange: (id: number) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentStyle = getStatusStyle(selectedId);
    const selectedOption = options.find(o => o.iIdStatus === selectedId);

    return (
        <div className="relative" ref={containerRef}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-3 px-5 py-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 min-w-[180px] justify-between group shadow-sm ${isOpen ? 'ring-2 ring-blue-500/30 border-blue-500/50' : ''}`}>
                <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${currentStyle.bg} animate-pulse`}></span>
                    <span className="font-bold text-xs text-txt-main tracking-widest uppercase">
                        {selectedOption ? selectedOption.sStatus : currentStyle.label}
                    </span>
                </div>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="material-symbols-rounded text-slate-400">expand_more</motion.span>
            </motion.button>
            <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50 origin-top-right p-2">
                    <div className="flex flex-col gap-1">
                        {/* --- FILTRO DE ESTADOS PERMITIDOS --- */}
                        {options.filter(opt => [1, 3, 4, 6].includes(opt.iIdStatus)).map((opt) => {
                            const style = getStatusStyle(opt.iIdStatus);
                            const isSelected = selectedId === opt.iIdStatus;
                            return (
                                <motion.button key={opt.iIdStatus} whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }} onClick={() => { onChange(opt.iIdStatus); setIsOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group ${isSelected ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                    <div className={`w-2 h-2 rounded-full ${style.bg} transition-all duration-300 ${isSelected ? 'scale-125' : 'opacity-50 group-hover:opacity-100'}`}></div>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-txt-main' : 'text-slate-500'}`}>{opt.sStatus}</span>
                                    {isSelected && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="material-symbols-rounded text-blue-500 text-lg ml-auto">check</motion.span>}
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

const TaskDetailSkeleton = () => (
    <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto pb-12 animate-pulse">
        <div className="h-20 w-full mb-8 rounded-[30px] bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="h-64 w-full rounded-[30px] bg-slate-200 dark:bg-slate-800" />
                <div className="h-40 w-full rounded-[30px] bg-slate-200 dark:bg-slate-800" />
            </div>
            <div>
                <div className="h-64 w-full rounded-[30px] bg-slate-200 dark:bg-slate-800" />
            </div>
        </div>
    </div>
);


