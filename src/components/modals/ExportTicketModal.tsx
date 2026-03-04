import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Ticket } from "../../services/ticketService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: Ticket[];
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
const CustomDropdown = ({ value, onChange, options, placeholder }: { value: string | number, onChange: (v: string) => void, options: { id: string | number, label: string }[], placeholder: string }) => {
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
        // Usamos capture: true para eventos de scroll en contenedores internos
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", updatePos);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", updatePos);
        };
    }, [isOpen, updatePos]);

    const selectedLabel = value === "Todos" ? placeholder : options.find(o => String(o.id) === String(value))?.label || placeholder;

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
                className={`flex items-center justify-between gap-1.5 sm:gap-2 h-11 w-full px-4 sm:px-4 bg-slate-50 dark:bg-slate-900/50 border hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-[13px] font-bold transition-all shrink-0 ${isOpen ? "border-blue-500 ring-2 ring-blue-500/20 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#131c2f]" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"}`}
            >
                <span className="truncate">{selectedLabel}</span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="material-symbols-rounded text-[18px] sm:text-[20px] text-slate-400 shrink-0">expand_more</motion.span>
            </motion.button>

            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            ref={dropdownRef} 
                            style={{ position: "absolute", top: pos.top, left: pos.left, width: Math.max(pos.width, 160), zIndex: 999999 }}
                            initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: -10, scale: 0.95 }} 
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-2"
                        >
                            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto comments-scroll">
                                {/* Opcional: "Todos" si aplica */}
                                {options.some(o => o.id === "Todos") && (
                                    <button 
                                        type="button"
                                        onClick={() => { onChange("Todos"); setIsOpen(false); }} 
                                        className={`px-3 py-2.5 rounded-xl text-left text-[13px] font-bold transition-all ${value === "Todos" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                                    >
                                        Todos
                                    </button>
                                )}
                                
                                {options.filter(o => o.id !== "Todos").map(opt => (
                                    <button 
                                        type="button"
                                        key={opt.id} 
                                        onClick={() => { onChange(String(opt.id)); setIsOpen(false); }} 
                                        className={`px-3 py-2.5 rounded-xl text-left text-[13px] font-bold transition-all flex justify-between items-center ${String(value) === String(opt.id) ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
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

export const ExportTicketModal = ({ isOpen, onClose, data }: Props) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedStatus, setSelectedStatus] = useState<string>("Todos");
  const [format, setFormat] = useState<"excel" | "pdf">("excel");
  const [isExporting, setIsExporting] = useState(false);

  const uniqueStatuses = useMemo(() => {
    const statuses = data.map((t) => t.statusName).filter(Boolean);
    return ["Todos", ...new Set(statuses)] as string[];
  }, [data]);

  const years = [new Date().getFullYear(), new Date().getFullYear() - 1];
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const getFilteredData = () => {
    return data.filter((t) => {
      const dateStr = t.dDateUserCreate || t.dTaskStartDate;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      const matchesDate = date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      const matchesStatus = selectedStatus === "Todos" || t.statusName === selectedStatus;
      return matchesDate && matchesStatus;
    });
  };

  const exportToExcel = (tickets: Ticket[]) => {
    const formattedData = tickets.map((t) => ({
      ID: t.iIdTask,
      Descripción: t.sDescription,
      Solicitante: t.userRaisedName || "N/A",
      Sucursal: t.branchName || "N/A",
      Departamento: t.departmentName || "N/A",
      Estatus: t.statusName || "N/A",
      "Fecha Creación": t.dDateUserCreate ? new Date(t.dDateUserCreate).toLocaleDateString("es-MX") : "-",
      "Fecha Cierre": t.dTaskCompletionDate ? new Date(t.dTaskCompletionDate).toLocaleDateString("es-MX") : "Pendiente",
    }));
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, `Reporte_Tickets_${months[selectedMonth]}_${selectedYear}.xlsx`);
  };

  const exportToPDF = (tickets: Ticket[]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Reporte de Tickets - ${months[selectedMonth]} ${selectedYear}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 28);
    const tableColumn = ["ID", "Solicitante", "Sucursal", "Estatus", "Fecha"];
    const tableRows = tickets.map((t) => [
      t.iIdTask,
      t.userRaisedName || "-",
      t.branchName || "-",
      t.statusName || "-",
      t.dDateUserCreate ? new Date(t.dDateUserCreate).toLocaleDateString("es-MX") : "-",
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
    });
    doc.save(`Reporte_Tickets_${months[selectedMonth]}_${selectedYear}.pdf`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const filteredTickets = getFilteredData();
    if (filteredTickets.length === 0) {
      alert("No se encontraron tickets con los filtros seleccionados.");
      setIsExporting(false);
      return;
    }
    if (format === "excel") exportToExcel(filteredTickets);
    else exportToPDF(filteredTickets);
    setIsExporting(false);
    onClose();
  };

  const filteredCount = getFilteredData().length;

  // Preparamos opciones para los dropdowns
  const monthOptions = months.map((m, i) => ({ id: i, label: m }));
  const yearOptions = years.map(y => ({ id: y, label: String(y) }));
  const statusOptions = uniqueStatuses.map(s => ({ id: s, label: s }));

  // El wrapper AnimatePresence + motion lo maneja el padre (Tickets.tsx)
  return (
    <div className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
      
      {/* HEADER */}
      <div className="p-8 border-b border-slate-100 dark:border-slate-700/50 flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
            <span className="material-symbols-rounded text-3xl">ios_share</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">Exportar Reporte</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Elige los filtros y el formato de descarga.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          transition={{ duration: 0.2 }}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <span className="material-symbols-rounded text-[22px]">close</span>
        </motion.button>
      </div>

      {/* BODY */}
      <div className="p-8 flex flex-col gap-8">

        {/* FILTROS: Mes / Año / Estatus */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Mes</label>
              <CustomDropdown value={selectedMonth} onChange={(v) => setSelectedMonth(Number(v))} options={monthOptions} placeholder="Mes" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Año</label>
              <CustomDropdown value={selectedYear} onChange={(v) => setSelectedYear(Number(v))} options={yearOptions} placeholder="Año" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Estatus</label>
              <CustomDropdown value={selectedStatus} onChange={(v) => setSelectedStatus(v)} options={statusOptions} placeholder="Todos" />
            </div>
        </div>

        {/* FORMATO */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
            Formato de archivo
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "excel", icon: "table_view", label: "Excel (.xlsx)", color: "emerald" },
              { key: "pdf", icon: "picture_as_pdf", label: "PDF Document", color: "rose" },
            ].map(({ key, icon, label, color }) => {
              const isSelected = format === key;
              return (
                <button
                  key={key}
                  onClick={() => setFormat(key as "excel" | "pdf")}
                  className={`relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? `border-${color}-500 bg-${color}-50/50 dark:bg-${color}-500/10 scale-[1.02] shadow-md`
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 shrink-0 ${
                      isSelected
                        ? `bg-${color}-500 text-white shadow-lg shadow-${color}-500/30`
                        : `bg-slate-100 dark:bg-slate-800 text-${color}-500`
                    }`}
                  >
                    <span className="material-symbols-rounded text-xl">{icon}</span>
                  </div>
                  <span className={`font-bold text-sm ${isSelected ? `text-${color}-700 dark:text-${color}-400` : "text-slate-700 dark:text-slate-300"}`}>
                    {label}
                  </span>
                  {isSelected && (
                    <div className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-${color}-500 animate-pulse`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RESUMEN */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
          filteredCount > 0
            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300"
            : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300"
        }`}>
          <span className="material-symbols-rounded text-xl shrink-0">
            {filteredCount > 0 ? "info" : "warning"}
          </span>
          <p className="text-sm font-medium">
            {filteredCount > 0 ? (
              <>Se exportarán <b className="font-extrabold text-slate-900 dark:text-white">{filteredCount} tickets</b> con los filtros actuales.</>
            ) : (
              "No hay tickets que coincidan con estos filtros."
            )}
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-8 pb-8 flex gap-3">
        <button
          onClick={onClose}
          disabled={isExporting}
          className="flex-1 py-4 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleExport}
          disabled={isExporting || filteredCount === 0}
          className="flex-[1.5] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-40 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none disabled:text-slate-500"
        >
          {isExporting ? (
            <span className="material-symbols-rounded animate-spin">progress_activity</span>
          ) : (
            <>
              <span className="material-symbols-rounded text-[20px]">download</span>
              Descargar
            </>
          )}
        </button>
      </div>
    </div>
  );
};