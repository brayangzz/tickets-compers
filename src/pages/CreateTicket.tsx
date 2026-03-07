import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { createTicket, uploadTicketFile } from "../services/ticketService";
import { getBranches, getDepartments, type Branch, type Department } from "../services/catalogService";
import { motion, AnimatePresence } from "framer-motion";

interface FileWithPreview {
  file: File;
  previewUrl: string | null;
  id: string;
}

// ─── ICONOS PARA LOS SELECTORES ──────────────────────────────────────────────
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
  return map.default || "circle";
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

// ─── CustomSelect Premium (Con Ordenamiento, Búsqueda y Bloqueo) ─────────────
const CustomSelect = ({ name, value, onChange, options, placeholder, icon, hasError = false, iconMap, disabled = false }: {
  name: string; value: number;
  onChange: (name: string, v: number) => void;
  options: { value: number; label: string }[];
  placeholder: string; icon: string; hasError?: boolean;
  iconMap?: Record<string, string>;
  disabled?: boolean; // <-- Nueva propiedad
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, pos, updatePos } = usePortalPos();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Ordenar opciones alfabéticamente
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  const selected = sortedOptions.find((o) => o.value === value);

  useEffect(() => {
    document.documentElement.style.scrollbarGutter = "stable";
    return () => { document.documentElement.style.scrollbarGutter = ""; };
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
    if (!isOpen || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); return; }
      
      if (e.key.length === 1 && /[a-zA-Z0-9\s]/i.test(e.key)) {
        const newQuery = searchQuery + e.key.toLowerCase();
        setSearchQuery(newQuery);

        const match = sortedOptions.find(opt => opt.label.toLowerCase().startsWith(newQuery));
        if (match) {
            const element = document.getElementById(`option-${name}-${match.value}`);
            if (element && dropdownRef.current) {
                const list = dropdownRef.current.querySelector('ul');
                if (list) list.scrollTo({ top: element.offsetTop - 10, behavior: 'smooth' });
            }
        }

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => setSearchQuery(""), 1000);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchQuery, sortedOptions, name, disabled]);

  // Clases dinámicas dependiendo de si está bloqueado o no
  const containerClasses = disabled
    ? "bg-slate-100/50 dark:bg-[#131c2f]/40 border-slate-200 dark:border-slate-800 cursor-default shadow-none"
    : hasError
    ? "bg-slate-50 dark:bg-[#0f172a] border-rose-500 ring-2 ring-rose-500/20 cursor-pointer"
    : isOpen
    ? "bg-white dark:bg-[#131c2f] border-blue-500 ring-4 ring-blue-500/15 cursor-pointer"
    : "bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 cursor-pointer";

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => { 
            if (disabled) return; // Evita que se abra si está bloqueado
            updatePos(); setIsOpen(!isOpen); 
        }}
        tabIndex={disabled ? -1 : 0} 
        className={`w-full flex items-center gap-3 px-5 py-4 border rounded-[20px] transition-all duration-200 select-none shadow-inner group focus:outline-none ${containerClasses}`}
      >
        <motion.span
          animate={{ rotate: isOpen ? 10 : 0, scale: isOpen ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
          className={`material-symbols-rounded text-[22px] shrink-0 transition-colors ${
            disabled ? "text-blue-500/70 dark:text-blue-400/70" :
            isOpen || value !== 0 ? "text-blue-500 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-200"
          }`}
        >
          {selected && iconMap ? getIconForOption(selected.label, iconMap) : icon}
        </motion.span>
        
        <span className={`flex-1 text-[15px] font-medium truncate ${
            disabled ? "text-slate-700 dark:text-slate-200 font-bold" : // Se lee claro pero distinto
            value === 0 ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-white"
        }`}>
          {selected ? selected.label : placeholder}
        </span>
        
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={`material-symbols-rounded text-[20px] shrink-0 ${
              disabled ? "text-slate-400 dark:text-slate-500 opacity-70" :
              isOpen ? "text-blue-500 dark:text-blue-400" : "text-slate-400"
          }`}
        >
          {disabled ? "lock" : "expand_more"} {/* Muestra un candado si está bloqueado */}
        </motion.span>
      </div>

      {isOpen && !disabled && createPortal(
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
                : sortedOptions.map((opt, i) => {
                  const optIcon = iconMap ? getIconForOption(opt.label, iconMap) : "circle";
                  const isSelected = value === opt.value;
                  const isHighlighted = searchQuery && opt.label.toLowerCase().startsWith(searchQuery);

                  return (
                    <motion.li
                      key={opt.value}
                      id={`option-${name}-${opt.value}`} 
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

export const CreateTicket = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<number>(0);
  const [selectedDept, setSelectedDept] = useState<number>(0);
  const [fileData, setFileData] = useState<FileWithPreview[]>([]);

  const [branchesList, setBranchesList] = useState<Branch[]>([]);
  const [departmentsList, setDepartmentsList] = useState<Department[]>([]);
  
  // NUEVO: Estados para bloquear los selects si se autocompletan
  const [isBranchLocked, setIsBranchLocked] = useState(false);
  const [isDeptLocked, setIsDeptLocked] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState("Generar Ticket");
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isValid = title.trim().length > 0 && description.trim().length > 0 && selectedBranch !== 0 && selectedDept !== 0;

  // Cargar catálogos e Inteligencia para Auto-Selección y Bloqueo
  useEffect(() => {
    const loadCatalogsAndAutoSelect = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Helper de caché para catálogos y directorio
        const fetchCached = async (key: string, fetcher: () => Promise<any>) => {
            const cached = sessionStorage.getItem(key);
            if (cached) return JSON.parse(cached);
            const data = await fetcher();
            sessionStorage.setItem(key, JSON.stringify(data));
            return data;
        };

        const [branchesData, deptsData, usersList] = await Promise.all([
          fetchCached('app_branches', () => getBranches()), 
          fetchCached('app_departments', () => getDepartments()),
          fetchCached('app_users', async () => {
              const res = await fetch("https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/general/users", { headers });
              return res.ok ? await res.json() : [];
          })
        ]);

        const bList = branchesData || [];
        const dList = deptsData || [];
        
        setBranchesList(bList);
        setDepartmentsList(dList);

        // LEER LOCALSTORAGE PARA SABER QUIÉN ESTÁ LOGUEADO
        const userString = localStorage.getItem('user');
        if (userString) {
            const userObj = JSON.parse(userString);
            const currentUserId = Number(userObj.iIdUser || userObj.ildUser || userObj.idUser || 0);

            if (currentUserId > 0 && Array.isArray(usersList)) {
                // Buscar al usuario logueado dentro de la lista completa para leer su sucursal y depto reales
                const currentUserData = usersList.find((u: any) => (u.iIdUser === currentUserId) || (u.ildUser === currentUserId));
                
                if (currentUserData) {
                    // Auto-seleccionar y bloquear Sucursal
                    if (currentUserData.branchName) {
                        const matchBranch = bList.find((b: Branch) => b.sBranch.toLowerCase() === currentUserData.branchName.toLowerCase());
                        if (matchBranch) {
                            setSelectedBranch(matchBranch.iIdBranch);
                            setIsBranchLocked(true); // Bloquear
                        }
                    }
                    
                    // Auto-seleccionar y bloquear Departamento
                    if (currentUserData.departmentName) {
                        const matchDept = dList.find((d: Department) => d.sDepartment.toLowerCase() === currentUserData.departmentName.toLowerCase());
                        if (matchDept) {
                            setSelectedDept(matchDept.iIdDepartment);
                            setIsDeptLocked(true); // Bloquear
                        }
                    }
                }
            }
        }
      } catch (err) {
        console.error("Error cargando catálogos", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadCatalogsAndAutoSelect();
  }, []);

  // Limpiar URLs de previsualización
  useEffect(() => {
    return () => {
      fileData.forEach((item) => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
    };
  }, [fileData]);

  const processFiles = (newFiles: File[]) => {
    const newFileData: FileWithPreview[] = newFiles.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      id: crypto.randomUUID(),
    }));
    setFileData((prev) => [...prev, ...newFileData]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (idToRemove: string) => {
    setFileData((prev) => {
      const item = prev.find((i) => i.id === idToRemove);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== idToRemove);
    });
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!title.trim() || !description.trim()) {
      setErrorMessage("El título y la descripción son obligatorios.");
      return;
    }
    if (selectedBranch === 0 || selectedDept === 0) {
      setErrorMessage("Debes seleccionar tu sucursal y tu departamento.");
      return;
    }

    setIsSubmitting(true);
    setStatusText("Creando ticket...");
    try {
      const payload = {
        sName: title.trim(),
        sDescription: description.trim(),
        iIdTaskType: 17, // ID por defecto de tu sistema para tickets nuevos
        iIdStatus: 1, // ID para estatus "Pendiente"
        iIdBranch: selectedBranch,
        iIdDepartment: selectedDept,
        dTaskStartDate: new Date().toISOString(),
      };
      const createdTicket = await createTicket(payload);
      if (createdTicket && createdTicket.iIdTask) {
        if (fileData.length > 0) {
          setStatusText(`Subiendo evidencia (0/${fileData.length})...`);
          let uploadedCount = 0;
          await Promise.all(
            fileData.map(async (data) => {
              const result = await uploadTicketFile(createdTicket.iIdTask, data.file);
              if (result) uploadedCount++;
              setStatusText(`Subiendo evidencia (${uploadedCount}/${fileData.length})...`);
              return result;
            })
          );
        }
        setShowSuccess(true);
        setTimeout(() => navigate("/tickets"), 2500);
      } else {
        setErrorMessage("Error: No se pudo crear el ticket en el servidor.");
        setIsSubmitting(false);
        setStatusText("Generar Ticket");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Ocurrió un error inesperado.");
      setIsSubmitting(false);
      setStatusText("Generar Ticket");
    }
  };

  // --- VISTA ÉXITO ---
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] font-display">
        <div className="relative mb-8">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-28 h-28 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 relative z-10"
          >
            <motion.span
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
              className="material-symbols-rounded text-7xl text-white"
            >check</motion.span>
          </motion.div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 bg-emerald-500/20 rounded-full z-0"
          />
        </div>
        <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3 text-center">
          ¡Ticket Creado!
        </motion.h2>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-slate-500 dark:text-slate-400 text-center text-lg">
          Tu solicitud ha sido registrada correctamente.
        </motion.p>
      </div>
    );
  }

  // --- CLASES REUTILIZABLES PARA INPUTS PREMIUM ---
  const inputPremiumClass = "w-full px-5 py-4 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-[15px] text-slate-800 dark:text-white focus:bg-white dark:focus:bg-[#131c2f] focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium shadow-inner";

  // --- VISTA FORMULARIO ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col gap-8 w-full max-w-[860px] mx-auto pb-12 font-display"
    >
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center gap-5"
      >
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-md"
        >
          <span className="material-symbols-rounded text-[22px]">arrow_back</span>
        </motion.button>
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">Nuevo Ticket</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[15px] mt-1.5 font-medium">Reporta una incidencia al departamento de Sistemas</p>
        </div>
      </motion.div>

      {/* ERROR */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
              <span className="material-symbols-rounded shrink-0">error</span>
              <p className="font-medium text-sm">{errorMessage}</p>
              <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600 transition-colors">
                <span className="material-symbols-rounded text-[18px]">close</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD PRINCIPAL */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <Card className="overflow-hidden shadow-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-[28px] p-0">

          {/* SECCIÓN PRINCIPAL */}
          <div className="p-8 md:p-10 flex flex-col gap-8">

            {/* Título sección */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <span className="material-symbols-rounded text-2xl">confirmation_number</span>
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight">Información del Ticket</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Los campos marcados con <span className="text-rose-500 font-bold">*</span> son obligatorios</p>
              </div>
            </div>

            {/* TÍTULO */}
            <div className="flex flex-col gap-2.5 group">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors ml-1">
                Asunto / Título del problema <span className="text-rose-500">*</span>
              </label>
              <input
                type="text" value={title} onChange={(e) => { setTitle(e.target.value); setErrorMessage(null); }}
                placeholder="Ej: Falla en conexión a internet, Error en sistema ERP..."
                autoFocus
                className={inputPremiumClass}
              />
            </div>

            {/* DESCRIPCIÓN */}
            <div className="flex flex-col gap-2.5 group">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors ml-1">
                Detalles del problema <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  rows={5} value={description} onChange={(e) => { setDescription(e.target.value); setErrorMessage(null); }}
                  placeholder="Explica a detalle qué sucede, desde cuándo y en qué equipo o área..."
                  className={`${inputPremiumClass} resize-none pb-8`}
                />
                <div className="absolute bottom-3 right-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-[#1e293b] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 pointer-events-none">
                  {description.length}/2000
                </div>
              </div>
            </div>

            {/* SUCURSAL + DEPARTAMENTO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              
              {/* SUCURSAL */}
              <div className="flex flex-col gap-2.5 group">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors ml-1 flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-[16px] text-blue-500">store</span>
                  Sucursal <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  name="branch"
                  value={selectedBranch as number}
                  onChange={(_, val) => { setSelectedBranch(val); setErrorMessage(null); }}
                  options={branchesList.map(b => ({ value: b.iIdBranch, label: b.sBranch }))}
                  placeholder={isLoadingData ? "Cargando..." : "Selecciona tu sucursal"}
                  icon="store"
                  iconMap={BRANCH_ICONS}
                  hasError={errorMessage !== null && selectedBranch === 0}
                  disabled={isBranchLocked} // <-- Bloqueo aplicado
                />
              </div>

              {/* DEPARTAMENTO */}
              <div className="flex flex-col gap-2.5 group">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors ml-1 flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-[16px] text-indigo-500">domain</span>
                  Departamento <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  name="dept"
                  value={selectedDept as number}
                  onChange={(_, val) => { setSelectedDept(val); setErrorMessage(null); }}
                  options={departmentsList.map(d => ({ value: d.iIdDepartment, label: d.sDepartment }))}
                  placeholder={isLoadingData ? "Cargando..." : "Selecciona tu departamento"}
                  icon="domain"
                  iconMap={DEPT_ICONS}
                  hasError={errorMessage !== null && selectedDept === 0}
                  disabled={isDeptLocked} // <-- Bloqueo aplicado
                />
              </div>

            </div>
          </div>

          {/* SECCIÓN ADJUNTOS */}
          <div className="px-8 md:px-10 pb-10 flex flex-col gap-5 border-t border-slate-100 dark:border-slate-800/80 pt-8 bg-slate-50/50 dark:bg-[#1e293b]/50">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-white dark:bg-[#0f172a] text-slate-500 dark:text-slate-400 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner">
                <span className="material-symbols-rounded text-2xl">attach_file</span>
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight">Evidencia Visual</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Puedes adjuntar capturas de pantalla (JPG, PNG) o documentos (PDF).</p>
              </div>
            </div>

            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />

            <motion.div
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-[24px] p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[1.02]"
                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0f172a]/50 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-[#0f172a]"
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 shadow-lg ${
                isDragging
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 dark:bg-[#1e293b] text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:border-blue-200 dark:group-hover:border-blue-500/30 group-hover:-translate-y-1"
              }`}>
                <span className="material-symbols-rounded text-[28px]">cloud_upload</span>
              </div>
              <p className="text-[15px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {isDragging ? "Suelta los archivos aquí..." : "Haz clic para buscar o arrastra tus archivos aquí"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1.5 font-medium">Límite por archivo: 10MB</p>
            </motion.div>

            <AnimatePresence>
              {fileData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-3 mt-2"
                >
                  {fileData.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="flex items-center gap-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 pl-2 pr-4 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm group"
                    >
                      {item.previewUrl ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0 bg-slate-100 dark:bg-black">
                          <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                          <span className="material-symbols-rounded text-[20px]">description</span>
                        </div>
                      )}
                      <span className="max-w-[140px] truncate">{item.file.name}</span>
                      <motion.button
                        whileHover={{ scale: 1.2, rotate: 90 }} whileTap={{ scale: 0.8 }}
                        onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                        className="text-slate-400 hover:text-rose-500 transition-colors ml-1 flex items-center justify-center"
                      >
                        <span className="material-symbols-rounded text-[18px]">cancel</span>
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FOOTER ACCIONES */}
          <div className="px-8 py-6 bg-slate-50 dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse md:flex-row justify-end items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(-1)}
              className="w-full md:w-auto px-8 py-3.5 rounded-full border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-all"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={!isSubmitting && isValid ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting && isValid ? { scale: 0.98 } : {}}
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingData || !isValid}
              className={`w-full md:w-auto px-10 py-3.5 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition-all ${
                isSubmitting || isLoadingData || !isValid
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent dark:border-slate-700"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] dark:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_10px_25px_rgba(37,99,235,0.3)] dark:hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] border border-blue-500/50"
              }`}
            >
              {isSubmitting ? (
                <><span className="material-symbols-rounded animate-spin text-[20px]">progress_activity</span><span>{statusText}</span></>
              ) : (
                <><span className="material-symbols-rounded text-[20px]">send</span><span>Generar Ticket</span></>
              )}
            </motion.button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};