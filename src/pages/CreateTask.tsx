import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { createPersonalTask, createAssignedTask } from "../services/taskService";
import { motion, AnimatePresence } from "framer-motion";
import { getInitials, getAvatarGradient } from "../utils/user";
import { fetchCached, fetchCachedUrl } from "../utils/cache";
import { usePortalPos } from "../hooks/usePortalPos";
import { toApiUrl } from "../config/api";

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

// ─── CUSTOM SELECT ────────────────────────────────────────────────────────────
const CustomSelect = ({
  value, onChange, options, placeholder, icon, hasError = false,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string; sub?: string }[];
  placeholder: string; icon: string; hasError?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, pos, updatePos } = usePortalPos<HTMLDivElement>();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

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

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => { updatePos(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center gap-3 px-5 py-3.5 bg-slate-50 dark:bg-[#0f172a] border rounded-2xl cursor-pointer transition-all select-none shadow-inner ${hasError
          ? "border-rose-500 ring-2 ring-rose-500/20"
          : isOpen
            ? "dark:bg-[#131c2f] border-blue-500 ring-2 ring-blue-500/30"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
          }`}
      >
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
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={`material-symbols-rounded text-[20px] shrink-0 ${isOpen ? "text-blue-500" : "text-slate-400 dark:text-slate-500"}`}
        >expand_more</motion.span>
      </div>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div ref={dropdownRef} style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 260), zIndex: 9999 }}>
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-600 rounded-2xl shadow-2xl overflow-hidden p-2"
          >
            <ul className="max-h-64 overflow-y-auto flex flex-col gap-1 pr-1 comments-scroll">
              {options.length === 0
                ? <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">Sin personal en tu cadena de mando</li>
                : options.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <li
                      key={opt.value}
                      onClick={() => { onChange(opt.value); setIsOpen(false); }}
                      className={`px-3 py-2.5 text-sm cursor-pointer rounded-xl transition-all flex items-center gap-3 font-bold group ${isSelected
                        ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0f172a] border border-transparent"
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(parseInt(opt.value) || 0)} text-white flex items-center justify-center shrink-0 shadow-md text-[10px] ring-2 ring-transparent group-hover:ring-white/20 transition-all`}>
                        {getInitials(opt.label)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate tracking-wide">{opt.label}</span>
                        {opt.sub && <span className={`text-[10px] font-medium ${isSelected ? "text-blue-500 dark:text-blue-300" : "text-slate-400 dark:text-slate-500"}`}>{opt.sub}</span>}
                      </div>
                      {isSelected && <span className="material-symbols-rounded text-[18px] text-blue-500 dark:text-blue-400 shrink-0">check</span>}
                    </li>
                  );
                })}
            </ul>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─── CUSTOM DATE PICKER ───────────────────────────────────────────────────────
const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAYS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const CustomDatePicker = ({ value, onChange, placeholder = "Selecciona una fecha..." }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, pos, updatePos } = usePortalPos<HTMLDivElement>();
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

  const safeYear = view.year || today.getFullYear();
  const safeMonth = view.month ?? today.getMonth();
  const daysInMonth = new Date(safeYear, safeMonth + 1, 0).getDate();
  const firstDay = (() => { const d = new Date(safeYear, safeMonth, 1).getDay(); return d === 0 ? 6 : d - 1; })();

  const prevMonth = () => setView(v => v.month === 0 ? { month: 11, year: v.year - 1 } : { month: v.month - 1, year: v.year });
  const nextMonth = () => setView(v => v.month === 11 ? { month: 0, year: v.year + 1 } : { month: v.month + 1, year: v.year });
  const selectDay = (day: number) => {
    const d = new Date(safeYear, safeMonth, day);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setIsOpen(false);
  };
  const isSelected = (day: number) => selectedDate?.getDate() === day && selectedDate?.getMonth() === safeMonth && selectedDate?.getFullYear() === safeYear;
  const isToday = (day: number) => today.getDate() === day && today.getMonth() === safeMonth && today.getFullYear() === safeYear;
  const formatDisplay = (v: string) => new Date(v + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => { if (value) setView({ month: new Date(value + "T12:00:00").getMonth(), year: new Date(value + "T12:00:00").getFullYear() }); updatePos(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center gap-3 px-5 py-3.5 bg-slate-50 dark:bg-[#0f172a] border rounded-2xl cursor-pointer transition-all select-none shadow-inner ${isOpen
          ? "dark:bg-[#131c2f] border-blue-500 ring-2 ring-blue-500/30"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
          }`}
      >
        <span className={`material-symbols-rounded text-[20px] shrink-0 transition-colors ${isOpen ? "text-blue-500" : "text-slate-400 dark:text-slate-500"}`}>calendar_today</span>
        <span className={`flex-1 text-[15px] font-medium ${value ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="w-6 h-6 flex items-center justify-center self-center text-slate-400 hover:text-rose-500 transition-colors shrink-0"
          >
            <span className="material-symbols-rounded text-[18px]">close</span>
          </motion.button>
        )}
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
          className={`material-symbols-rounded text-[20px] shrink-0 ${isOpen ? "text-blue-500" : "text-slate-400 dark:text-slate-500"}`}
        >expand_more</motion.span>
      </div>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div ref={pickerRef} style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 280), zIndex: 9999 }}>
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16 }}
            className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-600 rounded-2xl shadow-2xl p-5"
          >
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
            <div className="grid grid-cols-7 mb-2">
              {DAYS_ES.map((d) => (
                <div key={d} className="text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-widest py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: Math.max(0, firstDay) }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: Math.max(0, daysInMonth) }).map((_, i) => {
                const day = i + 1;
                const sel = isSelected(day);
                const tod = isToday(day);
                return (
                  <motion.button key={day} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => selectDay(day)}
                    className={`w-full aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all ${sel ? "bg-blue-600 text-white shadow-lg shadow-blue-500/40"
                      : tod ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-2 ring-blue-300 dark:ring-blue-600"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0f172a] hover:text-blue-600 dark:hover:text-blue-400"
                      }`}
                  >{day}</motion.button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/80">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => { const d = new Date(); selectDay(d.getDate()); setView({ month: d.getMonth(), year: d.getFullYear() }); }}
                className="w-full py-2.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[#0f172a] rounded-xl transition-all flex items-center justify-center gap-2 border border-transparent dark:hover:border-slate-700"
              >
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

// ─── CLASE INPUT ──────────────────────────────────────────────────────────────
const inputClass = "w-full px-5 py-3.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl text-[15px] text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#131c2f] focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium shadow-inner";

// ─── COMPONENTE LABEL ─────────────────────────────────────────────────────────
const FieldLabel = ({ children, icon, required }: { children: React.ReactNode; icon?: string; required?: boolean }) => (
  <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors duration-200">
    {icon && <span className={`material-symbols-rounded text-[15px] ${icon === "lock" ? "text-slate-400" : "text-blue-500"}`}>{icon}</span>}
    {children}
    {required && <span className="text-rose-500 font-black ml-0.5">*</span>}
  </label>
);

// ─── PANTALLA DE ÉXITO ────────────────────────────────────────────────────────
const SuccessScreen = ({ onBack }: { onBack: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="flex flex-col items-center justify-center min-h-[60vh] gap-6 font-display text-center px-4"
  >
    {/* Ícono con ripple */}
    <div className="relative">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [1, 1.4, 1.2], opacity: [0.4, 0, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
        className="absolute inset-0 rounded-full bg-emerald-400/30"
      />
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 relative z-10"
      >
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
          className="material-symbols-rounded text-[60px] text-white"
        >task_alt</motion.span>
      </motion.div>
    </div>

    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex flex-col items-center gap-2"
    >
      <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">¡Tarea Creada!</h2>
      <p className="text-slate-500 dark:text-slate-400 font-medium">La actividad ha sido agendada correctamente.</p>
    </motion.div>

    <motion.button
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.45, duration: 0.4 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onBack}
      className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all"
    >
      <span className="material-symbols-rounded text-[18px]">arrow_back</span>
      Volver
    </motion.button>
  </motion.div>
);

// ─── CREATE TASK ──────────────────────────────────────────────────────────────
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
  const [userDepartment, setUserDepartment] = useState<string>("Sistemas (Default)");

  const isValid = title.trim().length > 0 && description.trim().length > 0 && startDate.length > 0 && (taskType === "personal" || selectedUserId !== "");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const fetchData = async () => {
      setIsLoadingUsers(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [usersData, rolesData] = await Promise.all([
          fetchCachedUrl<ApiUser[]>("app_users", toApiUrl("/general/users"), headers),
          fetchCachedUrl<ApiUser[]>("app_roles", toApiUrl("/general/roles"), headers),
        ]);
        const userStr = localStorage.getItem("user");
        let myRoleId = 0, currentUserId = 0;
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            myRoleId = parseInt(u.ildRol || u.iIdRol || "0");
            currentUserId = parseInt(u.iIdUser || u.ildUser || "0");
          } catch (e) { console.error(e); }
        }
        if (currentUserId > 0) {
          const me = usersData.find((u: any) => u.iIdUser === currentUserId || u.ildUser === currentUserId);
          if (me?.departmentName) setUserDepartment(me.departmentName);
        }
        if (myRoleId === 0) { setUsers([]); return; }
        const getDescendantRoles = (allRoles: any[], parentId: number): number[] => {
          const desc: number[] = [];
          const findChildren = (id: number) => {
            allRoles.filter(r => r.iIdParent == id || r.ildParent == id).forEach(child => {
              const cId = child.iIdRol || child.ildRol;
              if (cId && !desc.includes(cId)) { desc.push(cId); findChildren(cId); }
            });
          };
          findChildren(parentId);
          return desc;
        };
        const validRoleIds = getDescendantRoles(rolesData, myRoleId);
        setUsers(usersData.filter((u: any) => { const rid = u.iIdRol || u.ildRol; return rid ? validRoleIds.includes(rid) : false; }));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchData();
  }, []);

  const processFiles = (newFiles: File[]) =>
    setFiles(prev => [...prev, ...newFiles.map(file => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      isImage: file.type.startsWith("image/"),
      id: Math.random().toString(36).substring(2, 10),
    }))]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) processFiles(Array.from(e.target.files)); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) processFiles(Array.from(e.dataTransfer.files)); };
  const removeFile = (id: string) => setFiles(prev => {
    const item = prev.find(i => i.id === id);
    if (item?.isImage) URL.revokeObjectURL(item.previewUrl);
    return prev.filter(i => i.id !== id);
  });

  const uploadTaskFiles = async (taskId: number) => {
    const token = localStorage.getItem("token");
    for (const item of files) {
      const fd = new FormData(); fd.append("File", item.file);
      try { await fetch(toApiUrl(`/task-files/${taskId}`), { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }); }
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
        setTimeout(() => navigate(-1), 2500);
      } else {
        setErrorMessage(createdTask === true ? "Tarea creada, pero sin subir archivos." : "El servidor rechazó la creación.");
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Ocurrió un error al procesar la solicitud.");
      setIsSubmitting(false);
    }
  };

  if (showSuccess) return <SuccessScreen onBack={() => navigate(-1)} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-6 w-full max-w-[860px] mx-auto pb-12 font-display"
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all shadow-sm shrink-0"
        >
          <span className="material-symbols-rounded text-[20px]">arrow_back</span>
        </motion.button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Nueva <span className="text-blue-500">Tarea</span>
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
            Organiza tu día o asigna actividades a tu equipo
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setTitle(""); setDescription(""); setStartDate(""); setFiles([]); setErrorMessage(null); setSelectedUserId(""); setTaskType("personal"); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#0f172a] hover:border-rose-200 dark:hover:border-slate-600 transition-all text-xs font-bold shadow-sm shrink-0"
        >
          <span className="material-symbols-rounded text-[16px]">delete_sweep</span>
          <span className="hidden sm:inline">Limpiar</span>
        </motion.button>
      </div>

      {/* ── ERROR BANNER ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 px-4 py-3.5 rounded-2xl flex items-center gap-3">
              <span className="material-symbols-rounded text-[20px] shrink-0">error</span>
              <p className="font-semibold text-sm flex-1">{errorMessage}</p>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 transition-colors shrink-0">
                <span className="material-symbols-rounded text-[18px]">close</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CARD PRINCIPAL ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="overflow-hidden shadow-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-[24px] p-0">

          {/* ── Sección detalles ─────────────────────────────────────────── */}
          <div className="p-6 md:p-8 flex flex-col gap-7">

            {/* Encabezado sección con gradiente lateral */}
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80 -mx-6 md:-mx-8 px-6 md:px-8 pt-1 -mt-1">
              <motion.div
                initial={{ scale: 0.7, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.15 }}
                className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-[14px] flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0"
              >
                <span className="material-symbols-rounded text-[22px]">task_alt</span>
              </motion.div>
              <div className="flex-1">
                <h2 className="font-extrabold text-slate-800 dark:text-white text-base tracking-tight">Detalles de la Tarea</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Los campos con <span className="text-rose-500 font-bold">*</span> son obligatorios</p>
              </div>
              {/* Pill decorativo */}
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-3 py-1.5 rounded-full">
                <span className="material-symbols-rounded text-[13px]">edit_note</span>
                Nuevo
              </span>
            </div>

            {/* Tipo de tarea + selector asignado */}
            <div className="flex flex-col gap-0">
              <div className="flex flex-col gap-2">
                <FieldLabel>Tipo de Tarea</FieldLabel>
                <div className="flex bg-slate-100 dark:bg-[#0f172a] p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-full md:w-72 relative shadow-inner">
                  <motion.div
                    layout
                    className="absolute top-1 bottom-1 rounded-xl bg-white dark:bg-slate-700/80 shadow-sm border border-slate-200 dark:border-slate-600"
                    initial={false}
                    animate={{ left: taskType === "personal" ? "4px" : "50%", width: "calc(50% - 6px)" }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  />
                  {[
                    { key: "personal", icon: "person", label: "Personal" },
                    { key: "assign", icon: "group", label: "Asignar" },
                  ].map(({ key, icon, label }) => {
                    const isDisabled = key === "assign" && !isLoadingUsers && users.length === 0;
                    return (
                      <button
                        key={key}
                        disabled={isDisabled}
                        onClick={() => setTaskType(key as "personal" | "assign")}
                        title={isDisabled ? "No tienes personal a cargo para asignar tareas" : ""}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold z-10 transition-colors relative flex items-center justify-center gap-1.5 ${isDisabled
                          ? "opacity-40 cursor-not-allowed text-slate-400"
                          : taskType === key
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          }`}
                      >
                        <span className="material-symbols-rounded text-[18px]">{icon}</span>
                        {label}
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
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="pt-6 flex flex-col gap-2 group">
                      <FieldLabel icon="person_add" required>Asignar a</FieldLabel>
                      <CustomSelect
                        value={selectedUserId}
                        onChange={(v) => { setSelectedUserId(v); setErrorMessage(null); }}
                        options={users.map(u => ({ value: String(u.iIdUser || u.ildUser), label: u.employeeName, sub: u.roleName }))}
                        placeholder="Selecciona un colaborador..."
                        icon="person_search"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Título */}
            <div className="flex flex-col gap-2 group">
              <FieldLabel required>Título</FieldLabel>
              <input
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setErrorMessage(null); }}
                placeholder="Ej: Revisión de inventario, Actualizar diseño..."
                className={inputClass}
              />
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-2 group">
              <FieldLabel required>Descripción</FieldLabel>
              <div className="relative">
                <textarea
                  rows={5}
                  value={description}
                  onChange={e => { setDescription(e.target.value); setErrorMessage(null); }}
                  placeholder="Escribe aquí el detalle de lo que necesitas realizar..."
                  className={`${inputClass} resize-none pb-8`}
                />
                <div className="absolute bottom-3 right-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#1e293b] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 pointer-events-none">
                  {description.length}/2000
                </div>
              </div>
            </div>

            {/* Departamento + Fecha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <FieldLabel icon="lock">Departamento</FieldLabel>
                <div className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-100/60 dark:bg-[#131c2f]/40 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-default shadow-none">
                  <span className="material-symbols-rounded text-[20px] text-blue-400/80 dark:text-blue-400/70">domain</span>
                  <span className="text-[15px] font-bold text-slate-700 dark:text-slate-300 truncate flex-1">
                    {isLoadingUsers ? "Cargando..." : userDepartment}
                  </span>
                  <span className="material-symbols-rounded text-[18px] text-slate-300 dark:text-slate-600">lock</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 group">
                <FieldLabel icon="calendar_today" required>Fecha de Inicio</FieldLabel>
                <CustomDatePicker value={startDate} onChange={v => { setStartDate(v); setErrorMessage(null); }} />
              </div>
            </div>
          </div>

          {/* ── Sección Adjuntos ─────────────────────────────────────────── */}
          <div className="px-6 md:px-8 pb-8 flex flex-col gap-5 border-t border-slate-100 dark:border-slate-800/80 pt-6 bg-slate-50/40 dark:bg-[#0f172a]/30">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-slate-100 dark:bg-slate-700/70 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-[14px] flex items-center justify-center shadow-sm shrink-0">
                <span className="material-symbols-rounded text-[20px]">attach_file</span>
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 dark:text-white text-base tracking-tight">Archivos Adjuntos</h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Opcional — JPG, PNG o PDF. Máx. 10MB por archivo.</p>
              </div>
            </div>

            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />

            {/* Drop zone */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.998 }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
              className={`w-full border-2 border-dashed rounded-[20px] p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group ${isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a]/50 hover:border-blue-400/70 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-[#0f172a]"
                }`}
            >
              <motion.div
                animate={isDragging ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-200 ${isDragging
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "bg-slate-100 dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-slate-800 group-hover:text-blue-500 group-hover:border-blue-200"
                  }`}
              >
                <span className="material-symbols-rounded text-[24px]">cloud_upload</span>
              </motion.div>
              <p className={`text-sm font-bold transition-colors ${isDragging ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400"}`}>
                {isDragging ? "Suelta los archivos aquí..." : "Clic para buscar o arrastra tus archivos"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">JPG, PNG, PDF — Límite: 10MB</p>
            </motion.div>

            {/* Archivos seleccionados — grid responsivo */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5"
                >
                  {files.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                      transition={{ type: "spring", stiffness: 380, damping: 24 }}
                      className="flex items-center gap-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 p-2 pr-3 rounded-2xl shadow-sm group hover:border-slate-300 dark:hover:border-slate-600 transition-colors min-w-0"
                    >
                      {/* Miniatura */}
                      {item.previewUrl ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0 bg-slate-100 dark:bg-slate-900">
                          <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500 border border-blue-100 dark:border-blue-800">
                          <span className="material-symbols-rounded text-[20px]">description</span>
                        </div>
                      )}

                      {/* Nombre */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate leading-snug">{item.file.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {item.isImage ? "Imagen" : "PDF"} &middot; {(item.file.size / 1024).toFixed(0)}KB
                        </p>
                      </div>

                      {/* Eliminar */}
                      <motion.button
                        whileHover={{ scale: 1.2, rotate: 90 }}
                        whileTap={{ scale: 0.8 }}
                        onClick={e => { e.stopPropagation(); removeFile(item.id); }}
                        className="w-7 h-7 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors shrink-0 self-center"
                      >
                        <span className="material-symbols-rounded text-[18px]">cancel</span>
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Footer acciones ──────────────────────────────────────────── */}
          <div className="px-6 md:px-8 py-5 bg-slate-50 dark:bg-[#0f172a]/60 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-7 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white transition-all"
            >
              Cancelar
            </motion.button>

            <motion.button
              whileHover={!isSubmitting && isValid ? { scale: 1.03, boxShadow: "0 8px 24px rgba(59,130,246,0.35)" } : {}}
              whileTap={!isSubmitting && isValid ? { scale: 0.97 } : {}}
              onClick={handleSubmit}
              disabled={isSubmitting || !isValid}
              className={`w-full sm:w-auto px-8 py-3 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 transition-all ${isSubmitting || !isValid
                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                }`}
            >
              {isSubmitting ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="material-symbols-rounded text-[18px]"
                  >progress_activity</motion.span>
                  Guardando...
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-[18px]">task_alt</span>
                  Crear Tarea
                </>
              )}
            </motion.button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};
