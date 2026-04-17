import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getInitials, getAvatarGradient } from "../utils/user";
import { usePortalPos } from "../hooks/usePortalPos";
import { toApiUrl } from "../config/api";

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

// ─── CustomSelect Premium ────────────────
const CustomSelect = ({ value, onChange, options, placeholder, icon }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, pos, updatePos } = usePortalPos<HTMLButtonElement>();
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

  // Modal: Eliminar usuario
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ApiUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "success" | "error">("idle");

  // Modal: Exportar
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<"pdf" | "excel" | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filtros específicos para la exportación
  const [exportRoleFilter, setExportRoleFilter] = useState("all");
  const [exportDeptFilter, setExportDeptFilter] = useState("all");

  // Carga de datos SEGURA (Y OPTIMIZADA)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { "Authorization": `Bearer ${token}` } : undefined;

        // Helper de caché
        const fetchCached = async (key: string, url: string) => {
            const cached = sessionStorage.getItem(key);
            if (cached) {
              try {
                return JSON.parse(cached);
              } catch {
                sessionStorage.removeItem(key);
              }
            }

            const res = await fetch(url, { headers });
            let data: unknown;

            try {
              data = await res.json();
            } catch {
              sessionStorage.removeItem(key);
              return [];
            }

            const finalData = Array.isArray(data) ? data : ((data as any)?.data || (data as any)?.result || []);
            if (!res.ok) {
              sessionStorage.removeItem(key);
              return finalData;
            }

            sessionStorage.setItem(key, JSON.stringify(finalData));
            return finalData;
        };

        const [usersData, deptsData] = await Promise.all([
           fetchCached('app_users', toApiUrl("/general/users")),
           fetchCached('app_departments', toApiUrl("/general/departments"))
        ]);

        setUsers(usersData);
        setDepartments(deptsData);

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
      const response = await fetch(toApiUrl("/users/admin/change-password"), {
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

  const openDeleteModal = (user: ApiUser) => {
    setUserToDelete(user);
    setDeleteStatus("idle");
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        toApiUrl(`/users/admin/${userToDelete.iIdUser}`),
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Error al eliminar");
      setDeleteStatus("success");
      // Limpiar caché y quitar el usuario del estado local
      sessionStorage.removeItem("app_users");
      setUsers(prev => prev.filter(u => u.iIdUser !== userToDelete.iIdUser));
      setTimeout(() => { setIsDeleteModalOpen(false); setUserToDelete(null); }, 1800);
    } catch {
      setDeleteStatus("error");
    } finally {
      setIsDeleting(false);
    }
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
        <motion.div
          layout
          transition={{ layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
          className="flex gap-2 w-full lg:w-auto shrink-0"
        >

          {/* Filtro Rol - SE AÑADIÓ min-w-0 */}
          <motion.div
            layout="position"
            transition={{ layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
            className="relative flex-1 min-w-0 lg:flex-none"
            ref={roleRef}
          >
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
          </motion.div>

          {/* Filtro Departamento - SE AÑADIÓ min-w-0 */}
          <motion.div
            layout="position"
            transition={{ layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
            className="relative flex-1 min-w-0 lg:flex-none"
            ref={deptRef}
          >
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
          </motion.div>

          {/* Reset animado: al ocultarse, los filtros se deslizan suave sin salto */}
          <AnimatePresence initial={false} mode="popLayout">
            {(searchTerm !== "" || selectedRole !== "all" || selectedDept !== "all") && (
              <motion.button
                key="users-reset-filters"
                layout
                initial={{ opacity: 0, scale: 0.88, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.88, x: 8 }}
                transition={{
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
                }}
                onClick={() => { setSearchTerm(""); setSelectedRole("all"); setSelectedDept("all"); }}
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
                          <div className="flex items-center justify-end gap-2">
                            {/* Cambiar contraseña */}
                            <motion.button
                              whileHover={{ scale: 1.12, rotate: -8 }}
                              whileTap={{ scale: 0.88 }}
                              onClick={() => openEditModal(user)}
                              className="p-2.5 text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-xl transition-all duration-200 shadow-sm"
                              title="Cambiar Contraseña"
                            >
                              <span className="material-symbols-rounded text-[19px] block">edit_square</span>
                            </motion.button>
                            {/* Eliminar usuario */}
                            <motion.button
                              whileHover={{ scale: 1.12, rotate: 8 }}
                              whileTap={{ scale: 0.88 }}
                              onClick={() => openDeleteModal(user)}
                              className="p-2.5 text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-all duration-200 shadow-sm"
                              title="Desactivar Usuario"
                            >
                              <span className="material-symbols-rounded text-[19px] block">delete</span>
                            </motion.button>
                          </div>
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

      {/* MODAL: EXPORTAR — mismo estilo premium */}
      <AnimatePresence>
        {isExportModalOpen && (
          <motion.div
            key="export-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget && !isExporting) { setIsExportModalOpen(false); setSelectedExportFormat(null); }}}
          >
            <motion.div
              key="export-content"
              initial={{ scale: 0.88, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md max-h-[92vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-[28px] shadow-2xl"
            >
              {/* Franja superior azul-violeta */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

              <div className="p-5 sm:p-7 flex flex-col items-center text-center gap-4 sm:gap-5">
                {/* Ícono animado */}
                <motion.div
                  initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
                  className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shadow-inner"
                >
                  <span className="material-symbols-rounded text-3xl text-blue-500">cloud_download</span>
                </motion.div>

                {/* Título */}
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Exportar Directorio</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Elige los filtros y el formato de descarga.
                  </p>
                </div>

                {/* Filtros */}
                <div className="flex flex-col gap-3 w-full">
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

                  {/* Chip total */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl w-full">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total a exportar</span>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                      {usersToExport.length} usuarios
                    </span>
                  </div>
                </div>

                {/* Opciones de Formato */}
                <div className="flex gap-3 w-full">
                  {([
                    { key: "excel", icon: "table_view",     label: "Excel (CSV)", borderColor: "border-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-500/10", ringColor: "ring-emerald-400/30", textColor: "text-emerald-600 dark:text-emerald-400" },
                    { key: "pdf",   icon: "picture_as_pdf", label: "PDF",          borderColor: "border-rose-400",    bgColor: "bg-rose-50 dark:bg-rose-500/10",       ringColor: "ring-rose-400/30",    textColor: "text-rose-600 dark:text-rose-400" },
                  ] as const).map(({ key, icon, label, borderColor, bgColor, ringColor, textColor }, i) => {
                    const isSelected = selectedExportFormat === key;
                    return (
                      <motion.button
                        key={key}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.07, duration: 0.28 }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelectedExportFormat(key as "pdf" | "excel")}
                        className={`flex-1 relative flex flex-col items-center justify-center gap-2 py-5 rounded-[20px] border-2 transition-all duration-200 ${
                          isSelected
                            ? `${borderColor} ${bgColor} ring-4 ${ringColor} shadow-md`
                            : "border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#0f172a] hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <span className={`material-symbols-rounded text-[30px] transition-colors ${isSelected ? textColor : "text-slate-400"}`}>
                          {icon}
                        </span>
                        <span className={`font-bold text-sm transition-colors ${isSelected ? textColor : "text-slate-600 dark:text-slate-300"}`}>
                          {label}
                        </span>
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className={`absolute top-2.5 right-2.5 material-symbols-rounded text-[16px] ${textColor}`}
                          >check_circle</motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Botones */}
                <div className="flex gap-3 w-full mt-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                    onClick={() => { setIsExportModalOpen(false); setSelectedExportFormat(null); }}
                    disabled={isExporting}
                    className="flex-1 py-3.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-40"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(59,130,246,0.35)" }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleExportSubmit}
                    disabled={!selectedExportFormat || isExporting || usersToExport.length === 0}
                    className="flex-[1.4] flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-40 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none disabled:text-slate-500"
                  >
                    {isExporting ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="material-symbols-rounded text-[20px]"
                      >progress_activity</motion.span>
                    ) : (
                      <>
                        <span className="material-symbols-rounded text-[18px]">save_alt</span>
                        Descargar
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CAMBIAR CONTRASEÑA — mismo estilo que Delete */}
      <AnimatePresence>
        {isEditModalOpen && userToEdit && (
          <motion.div
            key="edit-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget && editStatus?.type !== "success") { setIsEditModalOpen(false); setUserToEdit(null); }}}
          >
            <motion.div
              key="edit-content"
              initial={{ scale: 0.88, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-[28px] shadow-2xl overflow-hidden"
            >
              {/* Franja azul superior */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

              <div className="p-7 flex flex-col items-center text-center gap-5">
                <AnimatePresence mode="wait">
                  {editStatus?.type === "success" ? (
                    <motion.div
                      key="pw-success"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                        <span className="material-symbols-rounded text-3xl text-emerald-500">check</span>
                      </div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-white">¡Contraseña actualizada!</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">La nueva clave fue guardada correctamente.</p>
                    </motion.div>
                  ) : (
                    <motion.div key="pw-form" className="flex flex-col items-center gap-5 w-full">
                      {/* Ícono animado */}
                      <motion.div
                        initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
                        className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shadow-inner"
                      >
                        <span className="material-symbols-rounded text-3xl text-blue-500">lock_reset</span>
                      </motion.div>

                      {/* Título */}
                      <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Cambiar Contraseña</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                          Nueva clave para{" "}
                          <span className="font-bold text-blue-500">@{userToEdit.sUser}</span>
                        </p>
                      </div>

                      {/* Chip del usuario */}
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl w-full text-left">
                        <div className={`w-9 h-9 shrink-0 rounded-full bg-gradient-to-br ${getAvatarGradient(userToEdit.iIdUser)} flex items-center justify-center text-[10px] font-bold text-white shadow`}>
                          {getInitials(userToEdit.employeeName)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">{userToEdit.employeeName}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{userToEdit.roleName}</span>
                        </div>
                      </div>

                      {/* Formulario */}
                      <form onSubmit={handlePasswordUpdate} className="w-full flex flex-col gap-4">
                        <div className="relative flex items-center">
                          <span className="material-symbols-rounded absolute left-4 text-slate-400 z-20 text-[20px]">key</span>
                          <input
                            type={showEditPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); if (editStatus?.type === "error") setEditStatus(null); }}
                            className={`w-full pl-12 pr-14 py-3.5 bg-white dark:bg-[#0f172a]/60 border-2 ${
                              editStatus?.type === "error"
                                ? "border-rose-400 ring-2 ring-rose-400/20"
                                : "border-slate-200 dark:border-slate-700/60 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                            } rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all duration-200`}
                            placeholder="Nueva contraseña..."
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditPassword(v => !v)}
                            className="absolute right-4 p-1.5 text-slate-400 hover:text-blue-500 z-20 rounded-xl transition-all"
                          >
                            <span className="material-symbols-rounded text-[20px] block">{showEditPassword ? "visibility_off" : "visibility"}</span>
                          </button>
                        </div>

                        {/* Error inline */}
                        <AnimatePresence>
                          {editStatus?.type === "error" && (
                            <motion.p
                              initial={{ opacity: 0, y: -4, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: "auto" }}
                              exit={{ opacity: 0, y: -4, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="flex items-center gap-1.5 text-rose-500 text-[12px] font-semibold -mt-1"
                            >
                              <span className="material-symbols-rounded text-[15px] shrink-0">error</span>
                              {editStatus.text}
                            </motion.p>
                          )}
                        </AnimatePresence>

                        {/* Botones */}
                        <div className="flex gap-3 mt-1">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                            onClick={() => { setIsEditModalOpen(false); setUserToEdit(null); }}
                            disabled={isEditSubmitting}
                            className="flex-1 py-3.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-40"
                          >
                            Cancelar
                          </motion.button>
                          <motion.button
                            type="submit"
                            whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(59,130,246,0.35)" }}
                            whileTap={{ scale: 0.96 }}
                            disabled={isEditSubmitting || !newPassword}
                            className="flex-[1.4] flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                          >
                            {isEditSubmitting ? (
                              <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                className="material-symbols-rounded text-[20px]"
                              >progress_activity</motion.span>
                            ) : (
                              <>
                                <span className="material-symbols-rounded text-[18px]">lock_reset</span>
                                Guardar
                              </>
                            )}
                          </motion.button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      <AnimatePresence>
        {isDeleteModalOpen && userToDelete && (
          <motion.div
            key="delete-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget && deleteStatus === "idle") { setIsDeleteModalOpen(false); setUserToDelete(null); }}}
          >
            <motion.div
              key="delete-content"
              initial={{ scale: 0.88, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-[28px] shadow-2xl overflow-hidden"
            >
              {/* Franja de color superior */}
              <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-pink-600" />

              <div className="p-7 flex flex-col items-center text-center gap-5">

                {/* Estado: éxito */}
                <AnimatePresence mode="wait">
                  {deleteStatus === "success" ? (
                    <motion.div
                      key="del-success"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                        <span className="material-symbols-rounded text-3xl text-emerald-500">check</span>
                      </div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-white">¡Usuario desactivado!</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">El usuario ha sido eliminado correctamente.</p>
                    </motion.div>
                  ) : deleteStatus === "error" ? (
                    <motion.div
                      key="del-error"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                        <span className="material-symbols-rounded text-3xl text-rose-500">error</span>
                      </div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-white">Error al eliminar</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No se pudo desactivar el usuario. Intenta de nuevo.</p>
                      <motion.button
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="mt-1 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-sm transition-all"
                      >
                        Cerrar
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div key="del-confirm" className="flex flex-col items-center gap-5 w-full">
                      {/* Ícono animado */}
                      <motion.div
                        initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
                        className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shadow-inner"
                      >
                        <span className="material-symbols-rounded text-3xl text-rose-500">person_remove</span>
                      </motion.div>

                      {/* Texto */}
                      <div className="flex flex-col gap-1.5">
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">¿Desactivar usuario?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-snug">
                          Estás a punto de desactivar a{" "}
                          <span className="font-black text-slate-700 dark:text-slate-200">
                            {userToDelete.employeeName}
                          </span>
                          {" "}(<span className="text-rose-500 font-bold">@{userToDelete.sUser}</span>).
                          <br />Esta acción no se puede deshacer.
                        </p>
                      </div>

                      {/* Chip del usuario */}
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl w-full">
                        <div className={`w-9 h-9 shrink-0 rounded-full bg-gradient-to-br ${getAvatarGradient(userToDelete.iIdUser)} flex items-center justify-center text-[10px] font-bold text-white shadow`}>
                          {getInitials(userToDelete.employeeName)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">{userToDelete.employeeName}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{userToDelete.roleName}</span>
                        </div>
                      </div>

                      {/* Botones */}
                      <div className="flex gap-3 w-full mt-1">
                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                          onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
                          disabled={isDeleting}
                          className="flex-1 py-3.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-40"
                        >
                          Cancelar
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(244,63,94,0.35)" }}
                          whileTap={{ scale: 0.96 }}
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="flex-[1.4] flex items-center justify-center gap-2 py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                              className="material-symbols-rounded text-[20px]"
                            >progress_activity</motion.span>
                          ) : (
                            <>
                              <span className="material-symbols-rounded text-[18px]">person_remove</span>
                              Desactivar
                            </>
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

