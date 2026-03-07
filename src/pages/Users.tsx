import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Interfaces
interface ApiUser {
  iIdUser: number;
  sUser: string;
  iIdEmployee: number;
  employeeName: string;
  departmentName: string;
  branchName: string;
  roleName: string;
  dDateUserCreate?: string;
}

interface ApiDepartment {
  iIdDepartment: number;
  sDepartment: string;
}

// --- Helpers de Avatar ---
const getInitials = (name: string) => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getAvatarGradient = (id: number) => {
  const gradients = [
    "from-blue-500 to-indigo-600",
    "from-emerald-400 to-teal-600",
    "from-orange-400 to-rose-500",
    "from-purple-500 to-fuchsia-600",
    "from-cyan-400 to-blue-600",
  ];
  return gradients[id % gradients.length];
};

// --- Helpers de Iconos ---
const getRoleIcon = (role: string) => {
  const r = role.toLowerCase();
  if (r.includes("admin")) return "admin_panel_settings";
  if (r.includes("coordinador") || r.includes("gerente")) return "manage_accounts";
  if (r.includes("sistemas") || r.includes("soporte")) return "computer";
  if (r.includes("vendedor") || r.includes("cajero")) return "point_of_sale";
  return "badge";
};

const getDeptIcon = (dept: string) => {
  const d = dept.toLowerCase();
  if (d.includes("sistemas")) return "devices";
  if (d.includes("operaciones")) return "precision_manufacturing";
  if (d.includes("hr") || d.includes("recursos")) return "groups";
  if (d.includes("ventas")) return "storefront";
  return "domain";
};

// ─── Utilidad para calcular posición del portal ───
const usePortalPos = () => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX, width: rect.width });
  };

  return { triggerRef, pos, updatePos };
};

// ─── CustomSelect Premium ────────────────
const CustomSelect = ({ value, onChange, options, placeholder, icon }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, pos, updatePos } = usePortalPos();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((o: any) => o.value === value);

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
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); updatePos(); setIsOpen(!isOpen); }}
        className={`relative w-full h-[60px] flex items-center justify-between pl-[52px] pr-4 bg-slate-50 dark:bg-[#0f172a] border rounded-[20px] cursor-pointer transition-all duration-300 select-none shadow-inner group ${isOpen ? "bg-white dark:bg-[#131c2f] border-blue-500 ring-4 ring-blue-500/15" : "border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
          }`}>

        {/* ICONO */}
        {selectedOption && selectedOption.icon ? (
          <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 z-20 text-blue-600 dark:text-blue-500 text-[22px] transition-colors">{selectedOption.icon}</span>
        ) : (
          <span className={`material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 z-20 transition-colors text-[22px] ${isOpen || value !== "all" ? "text-blue-600 dark:text-blue-500" : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-blue-400"}`}>{icon}</span>
        )}

        {/* ETIQUETA Y VALOR */}
        <div className="flex flex-col items-start justify-center h-full w-full relative">
          <span className={`absolute left-0 transition-all duration-200 pointer-events-none z-20 font-bold uppercase tracking-wider text-[10px] ${isOpen ? 'text-blue-600 dark:text-blue-500' : 'text-slate-500 dark:text-slate-400'} top-[6px]`}>
            {placeholder}
          </span>
          <span className="text-[15px] font-medium truncate transition-opacity duration-200 mt-3 text-slate-800 dark:text-white">
            {selectedOption ? selectedOption.label : ''}
          </span>
        </div>

        <span className={`material-symbols-rounded text-[20px] shrink-0 transition-all duration-500 ${isOpen ? "rotate-180 text-blue-600 dark:text-blue-500" : "text-slate-400 dark:text-slate-500"}`}>expand_more</span>
      </motion.button>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 260), zIndex: 99999 }}>
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }} transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden p-2">
            <ul className="max-h-64 overflow-y-auto flex flex-col gap-1 pr-1 comments-scroll">
              {options.length === 0
                ? <li className="px-4 py-4 text-sm text-slate-500 text-center font-medium">No hay opciones</li>
                : options.map((opt: any) => {
                  const isSelected = value === opt.value;
                  return (
                    <li key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }}
                      className={`px-4 py-3.5 text-[14px] cursor-pointer rounded-xl transition-colors duration-200 flex items-center gap-3 font-bold group ${isSelected ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 shadow-inner" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0f172a] border border-transparent"
                        }`}>
                      <span className={`material-symbols-rounded text-[18px] transition-all duration-300 ${isSelected ? "opacity-100 text-blue-600 dark:text-blue-400 scale-110" : "opacity-0 scale-75"}`}>check</span>
                      {opt.icon && <span className={`material-symbols-rounded text-[20px] transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`}>{opt.icon}</span>}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate tracking-wide">{opt.label}</span>
                      </div>
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


export const Users = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros Generales
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Dropdown refs
  const roleRef = useRef<HTMLDivElement>(null);
  const deptRef = useRef<HTMLDivElement>(null);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isDeptOpen, setIsDeptOpen] = useState(false);

  // Modal: Cambiar contraseña
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<ApiUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editStatus, setEditStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal: Exportar
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<"pdf" | "excel" | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filtros específicos para la exportación
  const [exportRoleFilter, setExportRoleFilter] = useState("all");
  const [exportDeptFilter, setExportDeptFilter] = useState("all");

  // Carga de datos SEGURA
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { "Authorization": `Bearer ${token}` } : undefined;

        const [usersRes, deptsRes] = await Promise.all([
          fetch("https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/general/users", { headers }),
          fetch("https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/general/departments", { headers }),
        ]);

        const usersData = await usersRes.json();
        const deptsData = await deptsRes.json();

        setUsers(Array.isArray(usersData) ? usersData : (usersData?.data || usersData?.result || []));
        setDepartments(Array.isArray(deptsData) ? deptsData : (deptsData?.data || deptsData?.result || []));

      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setIsRoleOpen(false);
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) setIsDeptOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueRoles = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return [...new Set(users.map((u) => u.roleName).filter(Boolean))];
  }, [users]);

  // Usuarios filtrados para la tabla principal
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users.filter((user) => {
      const matchSearch =
        (user.employeeName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (user.sUser?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchRole = selectedRole === "all" || user.roleName === selectedRole;
      const matchDept = selectedDept === "all" || user.departmentName === selectedDept;
      return matchSearch && matchRole && matchDept;
    });
  }, [users, searchTerm, selectedRole, selectedDept]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedRole, selectedDept]);

  // Al abrir el modal de exportación, sincronizamos los filtros
  const handleOpenExportModal = () => {
    setExportRoleFilter(selectedRole);
    setExportDeptFilter(selectedDept);
    setSelectedExportFormat(null);
    setIsExportModalOpen(true);
  };

  // Usuarios filtrados ESPECÍFICAMENTE para la exportación
  const usersToExport = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users.filter((user) => {
      const matchRole = exportRoleFilter === "all" || user.roleName === exportRoleFilter;
      const matchDept = exportDeptFilter === "all" || user.departmentName === exportDeptFilter;
      return matchRole && matchDept;
    });
  }, [users, exportRoleFilter, exportDeptFilter]);

  // --- LÓGICA DE EXPORTACIÓN ---
  const handleExportSubmit = () => {
    if (!selectedExportFormat || usersToExport.length === 0) return;
    setIsExporting(true);

    setTimeout(() => {
      const dateStr = new Date().toISOString().split("T")[0];

      if (selectedExportFormat === "excel") {
        const headers = ["ID Empleado", "Nombre", "Usuario", "Rol", "Departamento", "Sucursal", "Fecha de Creación"];
        const rows = usersToExport.map((u) => [
          u.iIdEmployee,
          `"${u.employeeName || ''}"`,
          u.sUser || '',
          `"${u.roleName || ''}"`,
          `"${u.departmentName || ''}"`,
          `"${u.branchName || ''}"`,
          `"${u.dDateUserCreate ? new Date(u.dDateUserCreate).toLocaleDateString() : ''}"`,
        ]);
        const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Directorio_Usuarios_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } else if (selectedExportFormat === "pdf") {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Directorio de Usuarios - Compers", 14, 22);
        doc.setFontSize(11);
        doc.text(`Fecha de exportación: ${dateStr}`, 14, 30);
        doc.text(`Total de registros: ${usersToExport.length}`, 14, 36);

        const tableColumn = ["ID", "Nombre", "Usuario", "Rol", "Departamento", "Fecha Creación"];
        const tableRows = usersToExport.map(u => [
          u.iIdEmployee,
          u.employeeName,
          u.sUser,
          u.roleName,
          u.departmentName,
          u.dDateUserCreate ? new Date(u.dDateUserCreate).toLocaleDateString() : '—'
        ]);

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 45,
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [37, 99, 235] }, // Azul
        });

        doc.save(`Directorio_Usuarios_${dateStr}.pdf`);
      }

      setIsExporting(false);
      setIsExportModalOpen(false);
      setSelectedExportFormat(null);
    }, 800);
  };

  // Cambiar contraseña
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditStatus(null);
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!newPassword) { setEditStatus({ type: "error", text: "La contraseña no puede estar vacía." }); return; }
    if (!passwordRegex.test(newPassword)) { setEditStatus({ type: "error", text: "Mínimo 6 caracteres, 1 mayúscula y 1 número." }); return; }
    setIsEditSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api/users/admin/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sUser: userToEdit?.sUser, sNewPassword: newPassword }),
      });
      if (!response.ok) throw new Error("Error al actualizar la contraseña");
      setEditStatus({ type: "success", text: "¡Contraseña actualizada exitosamente!" });
      setTimeout(() => { setIsEditModalOpen(false); setUserToEdit(null); }, 2000);
    } catch (error: any) {
      setEditStatus({ type: "error", text: error.message || "Error al conectar con el servidor." });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const openEditModal = (user: ApiUser) => {
    setUserToEdit(user); setNewPassword(""); setEditStatus(null); setShowEditPassword(false); setIsEditModalOpen(true);
  };

  // Badge de rol
  const getRoleBadgeStyle = (role: string) => {
    const r = role?.toUpperCase() || "";
    if (r.includes("DIRECCION") || r.includes("DIRECCIÓN")) return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    if (r.includes("SOPORTE") || r.includes("SISTEMAS")) return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    if (r.includes("VENTA")) return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    if (r.includes("ADMIN")) return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
    return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  };

  // Listas con iconos para el Modal de Exportación
  const exportRolesList = [
    { value: "all", label: "Todos los roles", icon: "all_inclusive" },
    ...uniqueRoles.map(r => ({ value: r, label: r, icon: getRoleIcon(r) }))
  ];

  const exportDeptsList = [
    { value: "all", label: "Todos los departamentos", icon: "all_inclusive" },
    ...departments.map(d => ({ value: d.sDepartment, label: d.sDepartment, icon: getDeptIcon(d.sDepartment) }))
  ];

  // VARIANTE DE ANIMACIÓN TIPADA COMO ANY PARA EVITAR ERRORES TS
  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  return (
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
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Directorio de Usuarios
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">
            Administra el acceso al sistema, asignaciones y roles del personal.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenExportModal}
            className="w-full md:w-auto px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white rounded-full text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-rounded text-[20px]">ios_share</span> Exportar
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/users/new")}
            className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-rounded text-[20px]">add</span> Crear Usuario
          </motion.button>
        </div>
      </motion.div>

      {/* TOOLBAR PÍLDORA */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-sm rounded-[24px] lg:rounded-full flex flex-col lg:flex-row gap-2 items-center justify-between sticky top-4 z-30"
      >
        {/* Búsqueda */}
        <div className="relative group w-full lg:w-80 h-12 shrink-0">
          <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors text-xl">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-full pl-12 pr-4 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-blue-500/30 rounded-full text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-slate-200 font-medium placeholder:font-normal placeholder:text-slate-400"
          />
        </div>

        {/* Filtros + Reset */}
        <div className="flex gap-2 w-full lg:w-auto shrink-0">

          {/* Filtro Rol - SE AÑADIÓ min-w-0 */}
          <div className="relative flex-1 min-w-0 lg:flex-none" ref={roleRef}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.preventDefault(); setIsRoleOpen(!isRoleOpen); }}
              // Padding y gap reducidos en móvil para evitar empujar otros elementos
              className={`flex items-center justify-between gap-1.5 sm:gap-3 h-12 w-full lg:w-auto px-3 sm:px-5 rounded-full border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm ${isRoleOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 dark:border-slate-700"}`}
            >
              <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate">
                {selectedRole === "all" ? "Rol" : selectedRole}
              </span>
              <span className="material-symbols-rounded text-slate-400 shrink-0 text-[18px] sm:text-[24px]" style={{ transform: isRoleOpen ? "rotate(180deg)" : "none" }}>expand_more</span>
            </motion.button>
            <AnimatePresence>
              {isRoleOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute left-0 lg:right-0 mt-2 w-56 sm:w-60 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-[100] p-2"
                >
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto comments-scroll">
                    <button type="button" onClick={() => { setSelectedRole("all"); setIsRoleOpen(false); }} className={`px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${selectedRole === "all" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Todos los roles</button>
                    {uniqueRoles.map((role) => (
                      <button type="button" key={role} onClick={() => { setSelectedRole(role); setIsRoleOpen(false); }} className={`px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${selectedRole === role ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{role}</button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filtro Departamento - SE AÑADIÓ min-w-0 */}
          <div className="relative flex-1 min-w-0 lg:flex-none" ref={deptRef}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.preventDefault(); setIsDeptOpen(!isDeptOpen); }}
              // Padding y gap reducidos en móvil para evitar empujar otros elementos
              className={`flex items-center justify-between gap-1.5 sm:gap-3 h-12 w-full lg:w-auto px-3 sm:px-5 rounded-full border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm ${isDeptOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 dark:border-slate-700"}`}
            >
              <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate">
                {selectedDept === "all" ? "Depto." : selectedDept}
              </span>
              <span className="material-symbols-rounded text-slate-400 shrink-0 text-[18px] sm:text-[24px]" style={{ transform: isDeptOpen ? "rotate(180deg)" : "none" }}>expand_more</span>
            </motion.button>
            <AnimatePresence>
              {isDeptOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 sm:w-64 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-[100] p-2"
                >
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto comments-scroll">
                    <button type="button" onClick={() => { setSelectedDept("all"); setIsDeptOpen(false); }} className={`px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${selectedDept === "all" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Todos los departamentos</button>
                    {departments.map((d) => (
                      <button type="button" key={d.iIdDepartment} onClick={() => { setSelectedDept(d.sDepartment); setIsDeptOpen(false); }} className={`px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${selectedDept === d.sDepartment ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{d.sDepartment}</button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reset animado */}
          <AnimatePresence>
            {(searchTerm !== "" || selectedRole !== "all" || selectedDept !== "all") && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, scale: 1, width: 48, marginLeft: 8 }}
                exit={{ opacity: 0, scale: 0.5, width: 0, marginLeft: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={() => { setSearchTerm(""); setSelectedRole("all"); setSelectedDept("all"); }}
                whileHover={{ scale: 1.05, rotate: 180 }} whileTap={{ scale: 0.95 }}
                className="w-12 h-12 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-full border border-rose-200 dark:border-rose-500/30 text-rose-500 dark:text-rose-400 transition-colors shrink-0 overflow-hidden"
                title="Limpiar filtros"
              >
                <span className="material-symbols-rounded text-[20px]">filter_alt_off</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* TABLA CON STAGGER DIRECTO (EFECTO CASCADA SEGURO) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}>
        <Card className="overflow-hidden shadow-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-[24px] p-0">
          <div className="overflow-x-auto min-h-[640px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase tracking-widest text-slate-500 font-extrabold bg-slate-50/50 dark:bg-[#0f172a]/30">
                  <th className="px-8 py-5 min-w-[260px]">Empleado</th>
                  <th className="px-6 py-5 min-w-[120px]">Usuario</th>
                  <th className="px-6 py-5 min-w-[190px]">Rol</th>
                  <th className="px-6 py-5 min-w-[160px]">Departamento</th>
                  <th className="px-6 py-5 min-w-[120px]">Sucursal</th>
                  <th className="px-6 py-5 min-w-[150px]">Fecha Creación</th>
                  <th className="px-8 py-5 text-right min-w-[100px] print:hidden">Acciones</th>
                </tr>
              </thead>

              <tbody className="text-sm bg-white dark:bg-[#1e293b]">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    [...Array(itemsPerPage)].map((_, index) => (
                      <motion.tr
                        key={`skel-${index}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
                        className="border-b border-slate-100 dark:border-slate-800/50"
                      >
                        <td className="px-8 py-5"><div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-full" /><Skeleton className="h-4 w-36 rounded" /></div></td>
                        <td className="px-6 py-5"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="px-6 py-5"><Skeleton className="h-6 w-20 rounded-full" /></td>
                        <td className="px-6 py-5"><Skeleton className="h-4 w-28 rounded" /></td>
                        <td className="px-6 py-5"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="px-6 py-5"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="px-8 py-5"><Skeleton className="h-8 w-8 rounded-xl ml-auto" /></td>
                      </motion.tr>
                    ))
                  ) : paginatedUsers.length === 0 ? (
                    <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.2 }}>
                      <td colSpan={7} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-50">
                          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <span className="material-symbols-rounded text-4xl">person_search</span>
                          </div>
                          <p className="font-medium text-slate-500">No se encontraron usuarios con estos filtros.</p>
                        </div>
                      </td>
                    </motion.tr>
                  ) : (
                    paginatedUsers.map((user, index) => (
                      <motion.tr
                        key={user.iIdUser}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
                        className="group border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-200"
                      >
                        {/* Empleado */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(user.iIdUser)} flex items-center justify-center text-[11px] font-bold text-white shadow-md ring-2 ring-white dark:ring-[#1e293b]`}>
                              {getInitials(user.employeeName)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{user.employeeName}</span>
                              <span className="text-[10px] text-slate-400 font-medium">ID: {user.iIdEmployee}</span>
                            </div>
                          </div>
                        </td>

                        {/* Usuario */}
                        <td className="px-6 py-5">
                          <span className="font-bold text-[12px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700">
                            @{user.sUser}
                          </span>
                        </td>

                        {/* Rol */}
                        <td className="px-6 py-5">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest shadow-sm ${getRoleBadgeStyle(user.roleName)}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></div>
                            {user.roleName || "—"}
                          </div>
                        </td>

                        {/* Departamento */}
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-sm text-blue-500">domain</span>
                            {user.departmentName || "—"}
                          </span>
                        </td>

                        {/* Sucursal */}
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-sm text-emerald-500">store</span>
                            {user.branchName || "—"}
                          </span>
                        </td>

                        {/* Fecha Creación */}
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-sm text-slate-400">calendar_today</span>
                            {user.dDateUserCreate ? new Date(user.dDateUserCreate).toLocaleDateString() : "—"}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-8 py-5 text-right print:hidden">
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => openEditModal(user)}
                            className="p-2.5 text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-xl transition-all duration-200 shadow-sm"
                            title="Cambiar Contraseña"
                          >
                            <span className="material-symbols-rounded text-[20px] block">password</span>
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN ESTABLE */}
          <div className={`min-h-[81px] p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-transparent transition-opacity duration-300 ${isLoading ? "opacity-0 pointer-events-none" : "opacity-100"} ${!isLoading && filteredUsers.length === 0 ? "hidden" : ""}`}>
            {!isLoading && filteredUsers.length > 0 && (
              <>
                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <span>
                    {filteredUsers.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, filteredUsers.length)} de{" "}
                    <b className="text-slate-800 dark:text-slate-200">{filteredUsers.length}</b> usuarios
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
              </>
            )}
          </div>
        </Card>
      </motion.div>

      {/* MODAL: EXPORTAR MEJORADO (Premium Apple-Like) */}
      <AnimatePresence>
        {isExportModalOpen && (
          <motion.div
            key="export-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0"
          >
            <motion.div
              key="export-content"
              initial={{ scale: 0.90, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto comments-scroll bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-[28px] sm:rounded-[32px] shadow-2xl flex flex-col p-6 sm:p-8 md:p-10"
            >
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-[20px] flex items-center justify-center mb-3 sm:mb-4 shadow-inner border border-blue-100 dark:border-blue-500/20">
                  <span className="material-symbols-rounded text-3xl sm:text-4xl">cloud_download</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Exportar Directorio</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 sm:mt-2">
                  Configura los filtros y selecciona el formato.
                </p>
              </div>

              {/* Filtros dentro del Modal (Con CustomSelect Premium) */}
              <div className="flex flex-col gap-4 sm:gap-5 mb-6 sm:mb-8 shrink-0">
                <div className="relative z-50">
                  <CustomSelect
                    value={exportRoleFilter}
                    onChange={(val: string) => setExportRoleFilter(val)}
                    options={exportRolesList}
                    placeholder="Filtrar por Rol"
                    icon="admin_panel_settings"
                  />
                </div>
                <div className="relative z-40">
                  <CustomSelect
                    value={exportDeptFilter}
                    onChange={(val: string) => setExportDeptFilter(val)}
                    options={exportDeptsList}
                    placeholder="Filtrar por Departamento"
                    icon="domain"
                  />
                </div>

                <div className="flex justify-between items-center px-2 pt-1 sm:pt-2">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Total a exportar</span>
                  <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">{usersToExport.length} usuarios</span>
                </div>
              </div>

              {/* Opciones de Formato */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 shrink-0">
                {[
                  { key: "excel", icon: "table_view", label: "Excel (CSV)", color: "emerald" },
                  { key: "pdf", icon: "picture_as_pdf", label: "Archivo PDF", color: "rose" },
                ].map(({ key, icon, label, color }) => {
                  const isSelected = selectedExportFormat === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedExportFormat(key as "pdf" | "excel")}
                      className={`flex-1 group relative overflow-hidden flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-2 p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border-2 transition-all duration-300 ${isSelected ? `border-${color}-500 bg-${color}-50/50 dark:bg-${color}-500/10 shadow-md scale-[1.02]` : "border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 bg-slate-50 dark:bg-[#0f172a]"}`}
                    >
                      <span className={`material-symbols-rounded text-[28px] sm:text-[32px] transition-colors ${isSelected ? `text-${color}-500` : "text-slate-400 group-hover:text-slate-500"}`}>{icon}</span>
                      <span className={`font-bold text-sm ${isSelected ? `text-${color}-700 dark:text-${color}-400` : "text-slate-700 dark:text-slate-300"}`}>{label}</span>
                      {isSelected && (
                        <span className={`material-symbols-rounded absolute right-4 sm:top-3 sm:right-3 text-${color}-500 text-xl`}>check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Botones */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 mt-auto shrink-0">
                <button
                  type="button"
                  onClick={() => { setIsExportModalOpen(false); setSelectedExportFormat(null); }}
                  disabled={isExporting}
                  className="flex-1 py-3.5 sm:py-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExportSubmit}
                  disabled={!selectedExportFormat || isExporting || usersToExport.length === 0}
                  className="flex-[1.5] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3.5 sm:py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-40 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none disabled:text-slate-500"
                >
                  {isExporting
                    ? <span className="material-symbols-rounded animate-spin">progress_activity</span>
                    : <><span className="material-symbols-rounded text-[20px]">save_alt</span> Descargar</>
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CAMBIAR CONTRASEÑA */}
      <AnimatePresence>
        {isEditModalOpen && userToEdit && (
          <motion.div
            key="edit-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0"
          >
            <motion.div
              key="edit-content"
              initial={{ scale: 0.90, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md max-h-[90vh] overflow-y-auto comments-scroll bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-[28px] sm:rounded-[32px] shadow-2xl flex flex-col"
            >
              {/* Header modal */}
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700/50 flex flex-col gap-2 shrink-0">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mb-2 border border-blue-100 dark:border-blue-500/20">
                  <span className="material-symbols-rounded text-3xl">lock_reset</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Cambiar Contraseña</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                  Asignando nueva credencial para{" "}
                  <span className="font-bold text-blue-500">@{userToEdit.sUser}</span>
                </p>
              </div>

              {/* Body modal */}
              <form onSubmit={handlePasswordUpdate} className="p-6 sm:p-8 flex flex-col gap-5 sm:gap-6 shrink-0">
                {editStatus?.type === "success" ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20"
                    >
                      <span className="material-symbols-rounded text-4xl">check</span>
                    </motion.div>
                    <p className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">¡Completado!</p>
                    <p className="text-slate-500 text-sm font-medium">{editStatus.text}</p>
                  </div>
                ) : (
                  <>
                    <div className="group relative">
                      <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 sm:mb-3 ml-1">
                        Nueva Contraseña
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-rounded absolute left-4 text-slate-400 z-20">key</span>
                        <input
                          type={showEditPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); if (editStatus?.type === "error") setEditStatus(null); }}
                          className={`w-full pl-12 pr-14 py-3.5 sm:py-4 bg-white dark:bg-[#0f172a]/50 border-2 ${editStatus?.type === "error" ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-700/60"} rounded-2xl text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20`}
                          placeholder="Ingresa la nueva clave"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-4 p-2 text-slate-400 hover:text-blue-500 z-20 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
                        >
                          <span className="material-symbols-rounded text-[22px] block">{showEditPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                      </div>
                      {editStatus?.type === "error" && (
                        <p className="text-rose-500 text-[11px] sm:text-sm mt-3 font-medium flex items-start gap-1">
                          <span className="material-symbols-rounded text-base mt-0.5">error</span>
                          {editStatus.text}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(false)}
                        className="flex-1 py-3.5 sm:py-4 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isEditSubmitting || !newPassword}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3.5 sm:py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                      >
                        {isEditSubmitting
                          ? <span className="material-symbols-rounded animate-spin">progress_activity</span>
                          : "Guardar"
                        }
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};