import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Ticket } from "../../services/ticketService";
import { usePortalPos } from "../../hooks/usePortalPos";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: Ticket[];
}

// ─── DROPDOWN PREMIUM ─────────────────────────────────────────────────────────
const CustomDropdown = ({ value, onChange, options, placeholder }: {
  value: string | number;
  onChange: (v: string) => void;
  options: { id: string | number; label: string }[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, pos, updatePos } = usePortalPos<HTMLButtonElement>();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const selectedLabel = value === "Todos"
    ? placeholder
    : options.find(o => String(o.id) === String(value))?.label || placeholder;

  return (
    <>
      <motion.button
        ref={triggerRef}
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); updatePos(); setIsOpen(!isOpen); }}
        className={`flex items-center justify-between gap-2 h-11 w-full px-4 bg-slate-50 dark:bg-slate-900/50 border hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-[13px] font-bold transition-all shrink-0 ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#131c2f]"
            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="material-symbols-rounded text-[18px] text-slate-400 shrink-0">
          expand_more
        </motion.span>
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 160), zIndex: 999999 }}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-2"
            >
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto comments-scroll">
                {options.some(o => o.id === "Todos") && (
                  <button
                    type="button"
                    onClick={() => { onChange("Todos"); setIsOpen(false); }}
                    className={`px-3 py-2.5 rounded-xl text-left text-[13px] font-bold transition-all ${
                      value === "Todos"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    Todos
                  </button>
                )}
                {options.filter(o => o.id !== "Todos").map(opt => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => { onChange(String(opt.id)); setIsOpen(false); }}
                    className={`px-3 py-2.5 rounded-xl text-left text-[13px] font-bold transition-all flex justify-between items-center ${
                      String(value) === String(opt.id)
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {String(value) === String(opt.id) && (
                      <span className="material-symbols-rounded text-[16px] shrink-0">check</span>
                    )}
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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export const ExportTicketModal = ({ isOpen, onClose, data }: Props) => {
  const [selectedMonth, setSelectedMonth]   = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear]     = useState<number>(new Date().getFullYear());
  const [selectedStatus, setSelectedStatus] = useState<string>("Todos");
  const [format, setFormat]                 = useState<"excel" | "pdf">("excel");
  const [isExporting, setIsExporting]       = useState(false);

  const uniqueStatuses = useMemo(() => {
    const statuses = data.map(t => t.statusName).filter(Boolean);
    return ["Todos", ...new Set(statuses)] as string[];
  }, [data]);

  const years  = [new Date().getFullYear(), new Date().getFullYear() - 1];
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const getFilteredData = () =>
    data.filter(t => {
      const dateStr = t.dDateUserCreate || t.dTaskStartDate;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear &&
        (selectedStatus === "Todos" || t.statusName === selectedStatus);
    });

  const exportToExcel = (tickets: Ticket[]) => {
    const rows = tickets.map(t => ({
      ID: t.iIdTask,
      Descripción: t.sDescription,
      Solicitante: t.userRaisedName || "N/A",
      Sucursal: t.branchName || "N/A",
      Departamento: t.departmentName || "N/A",
      Estatus: t.statusName || "N/A",
      "Fecha Creación": t.dDateUserCreate ? new Date(t.dDateUserCreate).toLocaleDateString("es-MX") : "-",
      "Fecha Cierre": t.dTaskCompletionDate ? new Date(t.dTaskCompletionDate).toLocaleDateString("es-MX") : "Pendiente",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_Tickets_${months[selectedMonth]}_${selectedYear}.xlsx`);
  };

  const exportToPDF = (tickets: Ticket[]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Reporte de Tickets - ${months[selectedMonth]} ${selectedYear}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 28);
    autoTable(doc, {
      head: [["ID","Solicitante","Sucursal","Estatus","Fecha"]],
      body: tickets.map(t => [
        t.iIdTask,
        t.userRaisedName || "-",
        t.branchName || "-",
        t.statusName || "-",
        t.dDateUserCreate ? new Date(t.dDateUserCreate).toLocaleDateString("es-MX") : "-",
      ]),
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
    });
    doc.save(`Reporte_Tickets_${months[selectedMonth]}_${selectedYear}.pdf`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    const filtered = getFilteredData();
    if (filtered.length === 0) {
      setIsExporting(false);
      return;
    }
    if (format === "excel") exportToExcel(filtered);
    else exportToPDF(filtered);
    setIsExporting(false);
    onClose();
  };

  const filteredCount = getFilteredData().length;

  const monthOptions  = months.map((m, i) => ({ id: i, label: m }));
  const yearOptions   = years.map(y => ({ id: y, label: String(y) }));
  const statusOptions = uniqueStatuses.map(s => ({ id: s, label: s }));

  // El overlay/AnimatePresence lo maneja el padre — aquí solo el card
  return (
    <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-[28px] shadow-2xl">

      {/* Franja superior azul-violeta */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 sticky top-0 z-10" />

      <div className="p-5 sm:p-7 flex flex-col items-center text-center gap-4 sm:gap-5">

        {/* Ícono animado spring */}
        <motion.div
          initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
          className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shadow-inner"
        >
          <span className="material-symbols-rounded text-3xl text-blue-500">ios_share</span>
        </motion.div>

        {/* Título */}
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Exportar Reporte</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Elige los filtros y el formato de descarga.
          </p>
        </div>

        {/* Filtros: Mes / Año / Estatus */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Mes</label>
            <CustomDropdown value={selectedMonth} onChange={v => setSelectedMonth(Number(v))} options={monthOptions} placeholder="Mes" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Año</label>
            <CustomDropdown value={selectedYear} onChange={v => setSelectedYear(Number(v))} options={yearOptions} placeholder="Año" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Estatus</label>
            <CustomDropdown value={selectedStatus} onChange={v => setSelectedStatus(v)} options={statusOptions} placeholder="Todos" />
          </div>
        </div>

        {/* Opciones de formato */}
        <div className="flex gap-3 w-full">
          {([
            { key: "excel", icon: "table_view",     label: "Excel (.xlsx)", borderColor: "border-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-500/10", ringColor: "ring-emerald-400/30", textColor: "text-emerald-600 dark:text-emerald-400" },
            { key: "pdf",   icon: "picture_as_pdf", label: "PDF",           borderColor: "border-rose-400",    bgColor: "bg-rose-50 dark:bg-rose-500/10",       ringColor: "ring-rose-400/30",    textColor: "text-rose-600 dark:text-rose-400" },
          ] as const).map(({ key, icon, label, borderColor, bgColor, ringColor, textColor }, i) => {
            const isSelected = format === key;
            return (
              <motion.button
                key={key}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.07, duration: 0.28 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setFormat(key as "excel" | "pdf")}
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

        {/* Chip de total / estado */}
        <motion.div
          animate={{
            backgroundColor: filteredCount > 0 ? undefined : undefined,
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border w-full transition-colors ${
            filteredCount > 0
              ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300"
              : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300"
          }`}
        >
          <span className="material-symbols-rounded text-xl shrink-0">{filteredCount > 0 ? "info" : "warning"}</span>
          <p className="text-sm font-medium text-left">
            {filteredCount > 0
              ? <>Se exportarán <b className="font-extrabold text-slate-900 dark:text-white">{filteredCount} tickets</b>.</>
              : "No hay tickets con estos filtros."
            }
          </p>
        </motion.div>

        {/* Botones */}
        <div className="flex gap-3 w-full mt-1">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 py-3.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-40"
          >
            Cancelar
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(59,130,246,0.35)" }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExport}
            disabled={isExporting || filteredCount === 0}
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
                <span className="material-symbols-rounded text-[18px]">download</span>
                Descargar
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};  