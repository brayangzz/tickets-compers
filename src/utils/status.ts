export function getStatusConfig(id: number) {
  switch (id) {
    case 1: return { label: "PENDIENTE",  className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",   dot: "bg-amber-500",          variant: "warning" };
    case 2: return { label: "ABIERTO",    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50",         dot: "bg-blue-500",            variant: "info" };
    case 3: return { label: "EN PROCESO", className: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50", dot: "bg-indigo-500 animate-pulse", variant: "info" };
    case 4: return { label: "COMPLETADO", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50", dot: "bg-emerald-500",         variant: "success" };
    case 5: return { label: "SOLUCIONADO", className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50",         dot: "bg-teal-500",            variant: "success" };
    case 6: return { label: "CANCELADO",  className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50",         dot: "bg-rose-500",            variant: "danger" };
    default: return { label: "DESCONOCIDO", className: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700",                           dot: "bg-slate-400",           variant: "neutral" };
  }
}

export function getStatusStyle(id: number) {
  switch (id) {
    case 1: return { bg: "bg-amber-500", text: "text-amber-500", label: "Pendiente" };
    case 2: return { bg: "bg-blue-500", text: "text-blue-500", label: "Abierto" };
    case 3: return { bg: "bg-indigo-500", text: "text-indigo-500", label: "En Proceso" };
    case 4: return { bg: "bg-emerald-500", text: "text-emerald-500", label: "Completado" };
    case 5: return { bg: "bg-teal-500", text: "text-teal-500", label: "Solucionado" };
    case 6: return { bg: "bg-rose-500", text: "text-rose-500", label: "Cancelado" };
    default: return { bg: "bg-slate-500", text: "text-slate-500", label: "Desconocido" };
  }
}
