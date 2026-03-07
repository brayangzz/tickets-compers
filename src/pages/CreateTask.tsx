import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { createPersonalTask, createAssignedTask } from "../services/taskService";
import { motion, AnimatePresence } from "framer-motion";

interface ApiUser {
  iIdUser?: number; ildUser?: number;
  employeeName: string; roleName?: string;
  iIdRol?: number; ildRol?: number;
  departmentName?: string;
}

interface FilePreview { 
  file: File; 
  previewUrl: string; 
  isImage: boolean; 
  id: string; 
}

// --- HELPERS VISUALES ---
const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getAvatarGradient = (id: number) => {
    const validId = Number(id) || 0;
    const gradients = ['from-blue-500 to-indigo-600', 'from-emerald-400 to-teal-600', 'from-orange-400 to-rose-500', 'from-purple-500 to-fuchsia-600', 'from-cyan-400 to-blue-600'];
    return gradients[validId % gradients.length];
};

// ─── Utilidad para calcular posición del portal y actualizar al hacer scroll ───
const usePortalPos = () => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX, width: rect.width });
  };

  return { triggerRef, pos, updatePos };
};

// ─── CustomSelect con Portal (Jerarquía de Contraste Perfecta) ───────────────
const CustomSelect = ({ value, onChange, options, placeholder, icon, hasError = false }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string; sub?: string }[];
  placeholder: string; icon: string; hasError?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, pos, updatePos } = usePortalPos();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node))
        setIsOpen(false);
    };
    
    const handleScroll = () => { if(isOpen) updatePos(); };

    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true); 
    window.addEventListener("resize", updatePos);
    
    return () => { 
        document.removeEventListener("mousedown", handleOutside); 
        window.removeEventListener("scroll", handleScroll, true); 
        window.removeEventListener("resize", updatePos);
    };
  }, [isOpen, updatePos]);

  return (
    <>
      <div ref={triggerRef} onClick={() => { updatePos(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center gap-3 px-5 py-3.5 bg-slate-50 dark:bg-[#0f172a] border rounded-2xl cursor-pointer transition-all select-none shadow-inner ${
          hasError ? "border-rose-500 ring-2 ring-rose-500/20"
          : isOpen ? "dark:bg-[#131c2f] border-blue-500 ring-2 ring-blue-500/40"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
        }`}>
        
        {selected ? (
           <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(parseInt(selected.value))} text-white flex items-center justify-center shrink-0 shadow-sm text-[10px] font-bold`}>
              {getInitials(selected.label)}
           </div>
        ) : (
           <span className={`material-symbols-rounded text-[20px] shrink-0 transition-colors ${isOpen ? "text-blue-500" : "text-slate-400 dark:text-slate-500"}`}>{icon}</span>
        )}

        <span className={`flex-1 text-[15px] font-medium truncate ${!value ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.sub && (
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 shrink-0 shadow-sm">
            {selected.sub}
          </span>
        )}
        <span className={`material-symbols-rounded text-[20px] shrink-0 transition-all duration-300 ${isOpen ? "rotate-180 text-blue-500" : "text-slate-400 dark:text-slate-500"}`}>expand_more</span>
      </div>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div ref={dropdownRef} style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 260), zIndex: 9999 }}>
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.16 }}
            className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-600 rounded-2xl shadow-2xl overflow-hidden p-2">
            <ul className="max-h-64 overflow-y-auto flex flex-col gap-1 pr-1 comments-scroll">
              {options.length === 0
                ? <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">Sin personal en tu cadena de mando</li>
                : options.map((opt) => {
                    const isSelected = value === opt.value;
                    const numericId = parseInt(opt.value) || 0;
                    return (
                      <li key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }}
                        className={`px-3 py-2.5 text-sm cursor-pointer rounded-xl transition-all flex items-center gap-3 font-bold group ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0f172a] border border-transparent"
                        }`}>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(numericId)} text-white flex items-center justify-center shrink-0 shadow-md text-[10px] ring-2 ring-transparent group-hover:ring-white/20 transition-all`}>
                            {getInitials(opt.label)}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate tracking-wide">{opt.label}</span>
                          {opt.sub && <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-500 dark:text-blue-300' : 'text-slate-400 dark:text-slate-500 group-hover:dark:text-slate-400'}`}>{opt.sub}</span>}
                        </div>
                        {isSelected && <span className="material-symbols-rounded text-[18px] text-blue-500 dark:text-blue-400 shrink-0">check</span>}
                      </li>
                    )
                })}
            </ul>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─── CustomDatePicker con Portal ─────────────────────────────────────────────
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_ES = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];

const CustomDatePicker = ({ value, onChange, placeholder = "Selecciona una fecha..." }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, pos, updatePos } = usePortalPos();
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + "T12:00:00") : new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
  });
  const pickerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value + "T12:00:00") : null;
  const today = new Date();

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !pickerRef.current?.contains(e.target as Node))
        setIsOpen(false);
    };

    const handleScroll = () => { if(isOpen) updatePos(); };

    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true); 
    window.addEventListener("resize", updatePos);

    return () => { 
        document.removeEventListener("mousedown", handleOutside); 
        window.removeEventListener("scroll", handleScroll, true); 
        window.removeEventListener("resize", updatePos);
    };
  }, [isOpen, updatePos]);

  // Protección por si view.year o month se corrompen
  const safeYear = view.year || today.getFullYear();
  const safeMonth = view.month ?? today.getMonth();

  const daysInMonth = new Date(safeYear, safeMonth + 1, 0).getDate();
  const firstDay = (() => { const d = new Date(safeYear, safeMonth, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  
  const prevMonth = () => setView(v => v.month === 0 ? { month: 11, year: v.year - 1 } : { month: v.month - 1, year: v.year });
  const nextMonth = () => setView(v => v.month === 11 ? { month: 0, year: v.year + 1 } : { month: v.month + 1, year: v.year });
  
  const selectDay = (day: number) => {
    const d = new Date(safeYear, safeMonth, day);
    onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
    setIsOpen(false);
  };
  
  const isSelected = (day: number) => selectedDate?.getDate() === day && selectedDate?.getMonth() === safeMonth && selectedDate?.getFullYear() === safeYear;
  const isToday = (day: number) => today.getDate() === day && today.getMonth() === safeMonth && today.getFullYear() === safeYear;
  const formatDisplay = (v: string) => new Date(v + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <div ref={triggerRef} onClick={() => { if (value) setView({ month: new Date(value + "T12:00:00").getMonth(), year: new Date(value + "T12:00:00").getFullYear() }); updatePos(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center gap-3 px-5 py-3.5 bg-slate-50 dark:bg-[#0f172a] border rounded-2xl cursor-pointer transition-all select-none shadow-inner ${
          isOpen ? "dark:bg-[#131c2f] border-blue-500 ring-2 ring-blue-500/40"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
        }`}>
        <span className={`material-symbols-rounded text-[20px] shrink-0 transition-colors ${isOpen ? "text-blue-500" : "text-slate-400 dark:text-slate-500"}`}>calendar_today</span>
        <span className={`flex-1 text-[15px] font-medium ${value ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-slate-400 hover:text-rose-500 transition-colors">
            <span className="material-symbols-rounded text-[18px]">close</span>
          </motion.button>
        )}
        <span className={`material-symbols-rounded text-[20px] shrink-0 transition-all duration-300 ${isOpen ? "rotate-180 text-blue-500" : "text-slate-400 dark:text-slate-500"}`}>expand_more</span>
      </div>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div ref={pickerRef} style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 280), zIndex: 9999 }}>
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.16 }}
            className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-600 rounded-2xl shadow-2xl p-5">
            {/* Nav */}
            <div className="flex items-center justify-between mb-5">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0f172a] transition-all">
                <span className="material-symbols-rounded text-[18px]">chevron_left</span>
              </motion.button>
              <span className="text-[15px] font-extrabold text-slate-800 dark:text-white capitalize tracking-wide">
                {MONTHS_ES[safeMonth]} {safeYear}
              </span>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0f172a] transition-all">
                <span className="material-symbols-rounded text-[18px]">chevron_right</span>
              </motion.button>
            </div>
            {/* Header semana */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_ES.map((d) => (
                <div key={d} className="text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-widest py-1">{d}</div>
              ))}
            </div>
            {/* Días */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: Math.max(0, firstDay) }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: Math.max(0, daysInMonth) }).map((_, i) => {
                const day = i + 1;
                const sel = isSelected(day);
                const tod = isToday(day);
                return (
                  <motion.button key={day} 
                    whileHover={{ scale: 1.15 }} 
                    whileTap={{ scale: 0.9 }} 
                    onClick={() => selectDay(day)}
                    className={`w-full aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all ${
                      sel ? "bg-blue-600 text-white shadow-lg shadow-blue-500/40"
                      : tod ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-2 ring-blue-300 dark:ring-blue-600 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0f172a] hover:text-blue-600 dark:hover:text-blue-400" 
                    }`}>
                    {day}
                  </motion.button>
                );
              })}
            </div>
            {/* Hoy */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/80">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => { const d = new Date(); selectDay(d.getDate()); setView({ month: d.getMonth(), year: d.getFullYear() }); }}
                className="w-full py-2.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[#0f172a] rounded-xl transition-all flex items-center justify-center gap-2 border border-transparent dark:hover:border-slate-700">
                <span className="material-symbols-rounded text-[16px]">today</span> Ir a Hoy
              </motion.button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─── CLASE INPUT PREMIUM ──────────────────────────────────────────────────────
const inputPremiumClass = "w-full px-5 py-3.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl text-[15px] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131c2f] focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium shadow-inner";

// ─── CreateTask ───────────────────────────────────────────────────────────────
export const CreateTask = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [taskType, setTaskType] = useState<"personal" | "assign">("personal");
  
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // NUEVO: Estado para almacenar el departamento detectado del usuario
  const [userDepartment, setUserDepartment] = useState<string>("Sistemas (Default)");

  const isValid = title.trim().length > 0 && description.trim().length > 0 && startDate.length > 0 && (taskType === "personal" || selectedUserId !== "");

  useEffect(() => {
    // MAGIA AQUI: Forzar el scroll hacia arriba apenas entra a la pantalla
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const fetchSubordinatesAndUserInfo = async () => {
      setIsLoadingUsers(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { 'Authorization': `Bearer ${token}` };

        // Helper de caché para usuarios y roles
        const fetchCached = async (key: string, url: string) => {
            const cached = sessionStorage.getItem(key);
            if (cached) return JSON.parse(cached);
            const res = await fetch(url, { headers });
            const data = res.ok ? await res.json() : [];
            const finalData = Array.isArray(data) ? data : (data?.data || data?.result || []);
            sessionStorage.setItem(key, JSON.stringify(finalData));
            return finalData;
        };

        const [usersData, rolesData] = await Promise.all([
          fetchCached('app_users', "https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/general/users"),
          fetchCached('app_roles', "https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/general/roles")
        ]);
          
        const userStr = localStorage.getItem("user");
        let myRoleId = 0;
        let currentUserId = 0;

        if (userStr) { 
          try { 
            const u = JSON.parse(userStr); 
            myRoleId = parseInt(u.ildRol || u.iIdRol || "0"); 
            currentUserId = parseInt(u.iIdUser || u.ildUser || "0");
          } catch (e) { console.error(e); } 
        }
        
        // --- DETECTAR DEPARTAMENTO DEL USUARIO ACTUAL ---
        if (currentUserId > 0) {
          const currentUserData = usersData.find((u: any) => (u.iIdUser === currentUserId) || (u.ildUser === currentUserId));
          if (currentUserData && currentUserData.departmentName) {
              setUserDepartment(currentUserData.departmentName);
          }
        }
        // ------------------------------------------------

        if (myRoleId === 0) { 
            setUsers([]); 
            return; 
        }
        
        const getDescendantRoles = (allRoles: any[], parentId: number): number[] => {
          const descendants: number[] = [];
          const findChildren = (id: number) => {
            const children = allRoles.filter((r) => r.iIdParent == id || r.ildParent == id);
            for (const child of children) { const cId = child.iIdRol || child.ildRol; if (cId && !descendants.includes(cId)) { descendants.push(cId); findChildren(cId); } }
          };
          findChildren(parentId);
          return descendants;
        };
        const validRoleIds = getDescendantRoles(rolesData, myRoleId);
        setUsers(usersData.filter((u: any) => { const rid = u.iIdRol || u.ildRol; return rid ? validRoleIds.includes(rid) : false; }));
        
      } catch (error) { 
          console.error(error); 
      } finally {
          setIsLoadingUsers(false);
      }
    };
    fetchSubordinatesAndUserInfo();
  }, []);

  const processFiles = (newFiles: File[]) => setFiles((prev) => [...prev, ...newFiles.map((file) => ({
    file, 
    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "", 
    isImage: file.type.startsWith("image/"),
    id: Math.random().toString(36).substring(2, 10)
  }))]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) processFiles(Array.from(e.target.files)); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) processFiles(Array.from(e.dataTransfer.files)); };
  
  const removeFile = (idToRemove: string) => setFiles((prev) => { 
      const item = prev.find((i) => i.id === idToRemove);
      if (item && item.isImage) URL.revokeObjectURL(item.previewUrl); 
      return prev.filter((i) => i.id !== idToRemove); 
  });

  const uploadTaskFiles = async (taskId: number) => {
    const token = localStorage.getItem("token");
    for (const item of files) {
      const fd = new FormData(); fd.append("File", item.file);
      try { await fetch(`https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/task-files/${taskId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }); }
      catch (e) { console.error(e); }
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!title.trim() || !description.trim()) { setErrorMessage("El título y la descripción son obligatorios."); return; }
    if (!startDate) { setErrorMessage("Debes seleccionar una fecha de inicio."); return; }
    if (taskType === "assign" && !selectedUserId) { setErrorMessage("Debes seleccionar a un colaborador."); return; }
    setIsSubmitting(true);
    try {
      let createdTask: any = null;
      if (taskType === "personal") createdTask = await createPersonalTask({ sName: title.trim(), sDescription: description.trim(), iIdTaskType: 18, iIdStatus: 1, dTaskStartDate: startDate });
      else createdTask = await createAssignedTask({ sName: title.trim(), iIdTaskType: 19, sDescription: description.trim(), iIdUserTaskAssigned: parseInt(selectedUserId), dTaskStartDate: startDate });
      if (createdTask && (createdTask.iIdTask || createdTask.ildTask)) {
        const newTaskId = createdTask.iIdTask || createdTask.ildTask;
        if (files.length > 0) await uploadTaskFiles(newTaskId);
        setShowSuccess(true);
        setTimeout(() => navigate(-1), 2000);
      } else {
        setErrorMessage(createdTask === true ? "Tarea creada, pero sin subir imágenes." : "El servidor rechazó la creación.");
        setIsSubmitting(false);
      }
    } catch (e) { console.error(e); setErrorMessage("Ocurrió un error al procesar la solicitud."); setIsSubmitting(false); }
  };

  if (showSuccess) return (
    <div className="flex flex-col items-center justify-center h-[70vh] font-display">
      <div className="relative mb-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 } as any}
          className="w-28 h-28 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 relative z-10">
          <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 } as any} className="material-symbols-rounded text-7xl text-white">check</motion.span>
        </motion.div>
        <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" } as any} className="absolute inset-0 bg-emerald-500/20 rounded-full z-0" />
      </div>
      <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 } as any} className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">¡Tarea Creada!</motion.h2>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 } as any} className="text-slate-500 dark:text-slate-400">Se ha agendado correctamente.</motion.p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" } as any}
      className="flex flex-col gap-8 w-full max-w-[860px] mx-auto pb-12 font-display"
    >
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" } as any} className="flex items-center gap-5">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-md">
          <span className="material-symbols-rounded text-[22px]">arrow_back</span>
        </motion.button>
        <div className="flex-1 flex justify-between items-center">
            <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">Nueva Tarea</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[15px] mt-1.5 font-medium">Organiza tu día o asigna actividades a tu equipo</p>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setTitle(""); setDescription(""); setStartDate(""); setFiles([]); setErrorMessage(null); setSelectedUserId(""); setTaskType("personal"); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#0f172a] hover:border-rose-200 dark:hover:border-slate-600 transition-all text-sm font-bold shadow-sm">
            <span className="material-symbols-rounded text-[18px]">delete_sweep</span> Limpiar
            </motion.button>
        </div>
      </motion.div>

      {/* ERROR */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 } as any} className="overflow-hidden">
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
              <span className="material-symbols-rounded shrink-0">error</span>
              <p className="font-medium text-sm">{errorMessage}</p>
              <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600 transition-colors"><span className="material-symbols-rounded text-[18px]">close</span></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD PRINCIPAL */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" } as any}>
        <Card className="overflow-hidden shadow-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-[28px] p-0">

          <div className="p-8 md:p-10 flex flex-col gap-8">
            {/* Título sección */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                <span className="material-symbols-rounded text-2xl">task_alt</span>
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight">Detalles de la Tarea</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Los campos marcados con <span className="text-rose-500 font-bold">*</span> son obligatorios</p>
              </div>
            </div>

            {/* SWITCHER Y SELECTOR AGRUPADOS PARA ANIMACIÓN FLUIDA */}
            <div className="flex flex-col">
                <div className="flex flex-col gap-2.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Tipo de Tarea</label>
                  <div className="flex bg-slate-100 dark:bg-[#0f172a] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-full md:w-80 relative shadow-inner">
                    <motion.div layout className="absolute top-1.5 bottom-1.5 rounded-xl bg-white dark:bg-slate-700/80 shadow-sm border border-slate-200 dark:border-slate-600"
                      initial={false} animate={{ left: taskType === "personal" ? "6px" : "50%", width: "calc(50% - 9px)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 } as any} />
                    
                    {[{ key: "personal", icon: "person", label: "Personal" }, { key: "assign", icon: "group", label: "Asignar" }].map(({ key, icon, label }) => {
                      const isDisabled = key === "assign" && !isLoadingUsers && users.length === 0;

                      return (
                          <button 
                            key={key} 
                            disabled={isDisabled}
                            onClick={() => setTaskType(key as "personal" | "assign")}
                            title={isDisabled ? "No tienes personal a cargo para asignar tareas" : ""}
                            className={`flex-1 py-3 rounded-xl text-[15px] font-bold z-10 transition-colors relative flex items-center justify-center gap-2 ${
                                isDisabled ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500" :
                                taskType === key ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                          >
                            <span className="material-symbols-rounded text-[20px]">{icon}</span>{label}
                          </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {taskType === "assign" && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} 
                        transition={{ duration: 0.3, ease: "easeInOut" } as any} 
                        style={{ overflow: "hidden" }} 
                    >
                      <div className="pt-8 flex flex-col gap-2.5">
                        <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1 flex items-center gap-1.5">
                          <span className="material-symbols-rounded text-[16px] text-blue-500">person_add</span>
                          Asignar a <span className="text-rose-500">*</span>
                        </label>
                        <CustomSelect
                          value={selectedUserId}
                          onChange={(v) => { setSelectedUserId(v); setErrorMessage(null); }}
                          options={users.map((u) => ({ value: String(u.iIdUser || u.ildUser), label: u.employeeName, sub: u.roleName }))}
                          placeholder="Selecciona un colaborador..."
                          icon="person_search"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            {/* TÍTULO (SIN autoFocus) */}
            <div className="flex flex-col gap-2.5 group">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-300 group-focus-within:text-blue-500 transition-colors ml-1">
                Título <span className="text-rose-500">*</span>
              </label>
              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setErrorMessage(null); }}
                placeholder="Ej: Revisión de inventario, Actualizar diseño..." className={inputPremiumClass} />
            </div>

            {/* DESCRIPCIÓN */}
            <div className="flex flex-col gap-2.5 group">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-300 group-focus-within:text-blue-500 transition-colors ml-1">
                Descripción <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <textarea rows={5} value={description} onChange={(e) => { setDescription(e.target.value); setErrorMessage(null); }}
                  placeholder="Escribe aquí el detalle de lo que necesitas realizar..."
                  className={`${inputPremiumClass} resize-none pb-8`} />
                <div className="absolute bottom-3 right-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#1e293b] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 pointer-events-none shadow-sm">
                  {description.length}/2000
                </div>
              </div>
            </div>

            {/* DEPARTAMENTO + FECHA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div className="flex flex-col gap-2.5">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1 flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-[16px] text-slate-400">lock</span> Departamento
                </label>
                <div className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-100/50 dark:bg-[#131c2f]/40 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-default shadow-none transition-all">
                  <span className="material-symbols-rounded text-[20px] text-blue-500/70 dark:text-blue-400/70">domain</span>
                  <span className="text-[15px] font-bold text-slate-700 dark:text-slate-200 truncate flex-1">
                    {isLoadingUsers ? "Cargando..." : userDepartment}
                  </span>
                  <span className="material-symbols-rounded text-[20px] text-slate-400 dark:text-slate-500 opacity-70 ml-auto">lock</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 group">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1 flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">
                  <span className="material-symbols-rounded text-[16px] text-blue-500">calendar_today</span>
                  Fecha de Inicio <span className="text-rose-500">*</span>
                </label>
                <CustomDatePicker value={startDate} onChange={(v) => { setStartDate(v); setErrorMessage(null); }} />
              </div>
            </div>
          </div>

          {/* ADJUNTOS */}
          <div className="px-8 md:px-10 pb-10 flex flex-col gap-5 border-t border-slate-100 dark:border-slate-800/80 pt-8 bg-slate-50/50 dark:bg-[#1e293b]">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-white dark:bg-[#0f172a] text-slate-500 dark:text-slate-400 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner">
                <span className="material-symbols-rounded text-2xl">attach_file</span>
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight">Archivos Adjuntos</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Opcional — Puedes subir imágenes (JPG, PNG) o PDFs.</p>
              </div>
            </div>

            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />

            <motion.div
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-[24px] p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[1.02]"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a]/50 hover:border-blue-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-[#0f172a]"
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 shadow-sm ${
                isDragging
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-slate-800 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:border-blue-200 dark:group-hover:border-slate-600 group-hover:-translate-y-1"
              }`}>
                <span className="material-symbols-rounded text-[28px]">cloud_upload</span>
              </div>
              <p className="text-[15px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                {isDragging ? "Suelta los archivos aquí..." : "Haz clic para buscar o arrastra tus archivos aquí"}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">Límite por archivo: 10MB</p>
            </motion.div>

            <AnimatePresence>
              {files.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-3 mt-2">
                  {files.map((item) => (
                    <motion.div key={item.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 400, damping: 25 } as any}
                      className="flex items-center gap-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 pl-2 pr-4 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm group">
                      {item.previewUrl ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0 bg-slate-100 dark:bg-slate-900">
                          <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500 border border-blue-100 dark:border-blue-800">
                          <span className="material-symbols-rounded text-[20px]">description</span>
                        </div>
                      )}
                      <span className="max-w-[140px] truncate">{item.file.name}</span>
                      <motion.button whileHover={{ scale: 1.2, rotate: 90 }} whileTap={{ scale: 0.8 }}
                        onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                        className="text-slate-400 hover:text-rose-500 transition-colors ml-1 flex items-center justify-center">
                        <span className="material-symbols-rounded text-[18px]">cancel</span>
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FOOTER ACCIONES */}
          <div className="px-8 py-6 bg-slate-50 dark:bg-[#0f172a] border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse md:flex-row justify-end items-center gap-4">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => navigate(-1)}
              className="w-full md:w-auto px-8 py-3.5 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white transition-all shadow-sm">
              Cancelar
            </motion.button>
            <motion.button whileHover={!isSubmitting && isValid ? { scale: 1.02 } : {}} whileTap={!isSubmitting && isValid ? { scale: 0.98 } : {}}
              onClick={handleSubmit} disabled={isSubmitting || !isValid}
              className={`w-full md:w-auto px-10 py-3.5 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition-all ${
                isSubmitting || !isValid
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]"
              }`}>
              {isSubmitting
                ? <><span className="material-symbols-rounded animate-spin text-[20px]">progress_activity</span><span>Guardando...</span></>
                : <><span className="material-symbols-rounded text-[20px]">check</span><span>Crear Tarea</span></>}
            </motion.button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};