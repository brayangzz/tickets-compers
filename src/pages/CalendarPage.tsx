import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getTaskTypes } from "../services/catalogService";
import { getPersonalTasks } from "../services/taskService";
import { getTickets } from "../services/ticketService";
import { getSessionStorageJSON } from "../utils/storage";
import { toApiUrl } from "../config/api";

interface CalendarEntry {
  id: number;
  title: string;
  description: string;
  date: Date;
  statusId: number;
  typeId: number;
  source: "task" | "assigned" | "delegated" | "ticket";
  typeName: string;
  detailPath: string;
}

const DAYS = ["DOMINGO", "LUNES", "MARTES", "MI\u00c9RCOLES", "JUEVES", "VIERNES", "S\u00c1BADO"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MAX_VISIBLE_ENTRIES = 1;
const CALENDAR_CACHE_KEY = "compers_calendar_entries_v1";

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const SurfaceCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cx("rounded-[28px] overflow-hidden", className)}>
    {children}
  </div>
);

const getStatusConfig = (statusId: number) => {
  switch (statusId) {
    case 1:
      return { dot: "bg-amber-400", chip: "border-amber-500/35 bg-amber-500/12", label: "Pendiente", labelColor: "text-amber-500 dark:text-amber-400" };
    case 2:
      return { dot: "bg-blue-400", chip: "border-blue-500/35 bg-blue-500/12", label: "En Proceso", labelColor: "text-blue-500 dark:text-blue-400" };
    case 3:
      return { dot: "bg-indigo-400", chip: "border-indigo-500/35 bg-indigo-500/12", label: "En Revision", labelColor: "text-indigo-500 dark:text-indigo-400" };
    case 4:
      return { dot: "bg-emerald-400", chip: "border-emerald-500/35 bg-emerald-500/12", label: "Completada", labelColor: "text-emerald-500 dark:text-emerald-400" };
    case 5:
      return { dot: "bg-teal-400", chip: "border-teal-500/35 bg-teal-500/12", label: "Solucionado", labelColor: "text-teal-500 dark:text-teal-400" };
    case 6:
      return { dot: "bg-rose-400", chip: "border-rose-500/35 bg-rose-500/12", label: "Cancelada", labelColor: "text-rose-500 dark:text-rose-400" };
    default:
      return { dot: "bg-slate-400 dark:bg-white/60", chip: "border-white/15 bg-white/[0.05]", label: "Otro", labelColor: "text-slate-500 dark:text-white/70" };
  }
};

const getSourceConfig = (source: CalendarEntry["source"]) => {
  switch (source) {
    case "ticket":
      return { label: "Ticket", badge: "bg-cyan-400/12 text-cyan-200 border-cyan-400/25" };
    case "assigned":
      return { label: "Asignada", badge: "bg-fuchsia-400/12 text-fuchsia-200 border-fuchsia-400/25" };
    case "delegated":
      return { label: "Delegada", badge: "bg-violet-400/12 text-violet-200 border-violet-400/25" };
    default:
      return { label: "Tarea", badge: "bg-white/8 text-white/75 border-white/12" };
  }
};

const hydrateCalendarEntries = (rawEntries: CalendarEntry[]) =>
  rawEntries.map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  }));

const getWeekdayLabel = (date: Date) => DAYS[date.getDay()];

export const CalendarPage = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const [selectedDayContext, setSelectedDayContext] = useState<{ date: Date, entries: CalendarEntry[] } | null>(null);

  useEffect(() => {
    const cachedEntries = getSessionStorageJSON<CalendarEntry[] | null>(
      CALENDAR_CACHE_KEY,
      null,
    );
    if (cachedEntries) {
      setEntries(hydrateCalendarEntries(cachedEntries));
      setIsLoading(false);
    }

    const loadData = async () => {
      if (!cachedEntries) setIsLoading(true);

      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [personalTasks, typesData, ticketsData, assignedRes, delegatedRes] = await Promise.all([
          getPersonalTasks(),
          getTaskTypes(),
          getTickets(),
          fetch(toApiUrl("/tasks/assigned/assigned-to-me"), { headers }),
          fetch(toApiUrl("/tasks/assigned/assigned-by-me"), { headers }),
        ]);

        const assignedData = assignedRes.ok ? await assignedRes.json() : [];
        const delegatedData = delegatedRes.ok ? await delegatedRes.json() : [];
        const mergedEntries: CalendarEntry[] = [];

        const resolveTypeName = (typeId: number, fallback?: string | null) =>
          fallback || typesData.find((type: any) => type.iIdTaskType === typeId)?.sTaskType || "General";

        const pushEntry = (item: any, source: CalendarEntry["source"], detailPath: string) => {
          const dateValue = item.dTaskStartDate || item.dDateUserCreate;
          if (!dateValue) return;

          mergedEntries.push({
            id: item.iIdTask,
            title: item.sName || item.sDescription || (source === "ticket" ? "Ticket" : "Tarea"),
            description: item.sDescription || "",
            date: new Date(dateValue),
            statusId: item.iIdStatus,
            typeId: item.iIdTaskType,
            source,
            typeName: resolveTypeName(item.iIdTaskType, item.taskTypeName),
            detailPath,
          });
        };

        personalTasks.forEach((item) => pushEntry(item, "task", `/my-tasks/${item.iIdTask}`));
        assignedData.forEach((item: any) => pushEntry(item, "assigned", `/my-tasks/${item.iIdTask}`));
        delegatedData.forEach((item: any) => pushEntry(item, "delegated", `/my-tasks/${item.iIdTask}`));
        ticketsData.forEach((item) => pushEntry(item, "ticket", `/tickets/${item.iIdTask}`));

        setEntries(mergedEntries);
        sessionStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(mergedEntries));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();
    const days = [];

    for (let index = firstDay - 1; index >= 0; index--) {
      days.push({ d: previousMonthDays - index, m: month - 1, y: year, current: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ d: day, m: month, y: year, current: true });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ d: day, m: month + 1, y: year, current: false });
    }

    return days;
  }, [year, month]);

  const changeMonth = (offset: number) => {
    setDirection(offset);
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const isToday = (day: number, monthValue: number, yearValue: number) => {
    const today = new Date();
    return day === today.getDate() && monthValue === today.getMonth() && yearValue === today.getFullYear();
  };

  const mobileMonthDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1;
      const currentDateObj = new Date(year, month, day);
      const dayEntries = entries
        .filter(
          (entry) =>
            entry.date.getDate() === day &&
            entry.date.getMonth() === month &&
            entry.date.getFullYear() === year
        )
        .sort((first, second) => first.date.getTime() - second.date.getTime());

      return {
        day,
        weekday: getWeekdayLabel(currentDateObj),
        isToday: isToday(day, month, year),
        dayEntries,
      };
    });
  }, [entries, month, year]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col gap-4 w-full max-w-[1520px] mx-auto pb-8 md:pb-10 px-2 md:px-4 text-slate-900 dark:text-white"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,1fr)_minmax(440px,640px)] lg:items-end pt-1">
        <div className="space-y-3 pt-1">
          <h1 className="max-w-[320px] text-[2.35rem] sm:text-[2.75rem] md:text-[3rem] lg:text-[3.25rem] font-black text-slate-900 dark:text-white tracking-[-0.04em] leading-[0.92]">
            Agenda <span className="block text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.45)]">Compers</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] sm:text-[12px] leading-none tracking-[0.07em] uppercase whitespace-normal sm:whitespace-nowrap">
            Control Estrategico De Actividades
          </p>
        </div>

        <div className="flex w-full flex-wrap md:flex-nowrap items-center justify-start lg:justify-end gap-3 lg:pb-2">
          <div className="w-full md:flex-1 md:max-w-[500px] min-w-0">
            <div className="grid grid-cols-[52px_minmax(0,1fr)_52px] items-center h-[70px] rounded-[20px] border border-slate-300 dark:border-slate-700/80 bg-white/95 dark:bg-[#13213a] px-2.5 shadow-[0_12px_30px_rgba(2,6,23,0.22)]">
              <button
                onClick={() => changeMonth(-1)}
                className="group/nav relative z-10 h-11 w-11 flex items-center justify-center rounded-[13px] text-slate-500 dark:text-slate-300 hover:text-white hover:bg-blue-600 hover:-translate-y-0.5 hover:scale-[1.04] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu active:scale-[0.96]"
              >
                <span className="material-symbols-rounded text-[21px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/nav:-translate-x-0.5">chevron_left</span>
              </button>

              <div className="min-w-0 text-center px-4">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Mes actual</div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h2
                    key={`${month}-${year}`}
                    initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-1 text-[1.25rem] sm:text-[1.45rem] md:text-[1.55rem] font-black text-slate-900 dark:text-white capitalize leading-none tracking-[-0.03em] whitespace-nowrap"
                  >
                    {MONTHS[month]}
                  </motion.h2>
                </AnimatePresence>
              </div>

              <button
                onClick={() => changeMonth(1)}
                className="group/nav relative z-10 h-11 w-11 flex items-center justify-center rounded-[13px] text-slate-500 dark:text-slate-300 hover:text-white hover:bg-blue-600 hover:-translate-y-0.5 hover:scale-[1.04] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu active:scale-[0.96]"
              >
                <span className="material-symbols-rounded text-[21px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/nav:translate-x-0.5">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="w-full md:w-auto md:max-w-[320px] md:flex-none">
            <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center h-[66px] rounded-[20px] border border-slate-300 dark:border-slate-700/80 bg-white/95 dark:bg-[#13213a] px-2.5 shadow-[0_12px_30px_rgba(2,6,23,0.22)] group transition-all duration-300 hover:border-blue-500/30">
              <div className="h-10 w-10" aria-hidden="true" />
              <div className="min-w-0 text-center px-3.5">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Gestion Anual</div>
                <div className="mt-1 text-[1.35rem] sm:text-[1.45rem] font-black text-slate-900 dark:text-white leading-none tracking-[-0.03em]">
                  {year}
                </div>
              </div>
              <div className="h-10 w-10" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      <SurfaceCard className="shadow-xl bg-white dark:bg-[#0f1c34] border border-slate-200 dark:border-slate-700/80 p-0">
        <div className="md:hidden p-3 sm:p-4 bg-slate-50/80 dark:bg-[#0f172a]/25">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mobileMonthDays.map((dayItem) => {
              const visibleEntries = dayItem.dayEntries.slice(0, 1);
              const hiddenCount = dayItem.dayEntries.length - visibleEntries.length;

              return (
                <motion.article
                  key={dayItem.day}
                  whileTap={dayItem.dayEntries.length > 0 ? { scale: 0.97 } : undefined}
                  onClick={() => {
                    if (dayItem.dayEntries.length === 1) {
                      navigate(dayItem.dayEntries[0].detailPath);
                    } else if (dayItem.dayEntries.length > 1) {
                      setSelectedDayContext({ date: new Date(year, month, dayItem.day), entries: dayItem.dayEntries });
                    }
                  }}
                  className={cx(
                    "rounded-[18px] border p-3.5 transition-colors",
                    dayItem.isToday
                      ? "border-blue-300 dark:border-blue-500/45 bg-blue-50/80 dark:bg-blue-500/10"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1f2937] hover:bg-slate-50 dark:hover:bg-[#1f2937]/80",
                    dayItem.dayEntries.length > 0 && "cursor-pointer"
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{dayItem.weekday}</p>
                      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{dayItem.day}</p>
                    </div>
                    {dayItem.dayEntries.length > 0 && (
                      <span className="min-w-7 h-7 px-2 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black shadow-[0_8px_16px_rgba(37,99,235,0.24)]">
                        {dayItem.dayEntries.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {visibleEntries.length === 0 ? (
                      <div className="rounded-[12px] border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                        Sin actividades
                      </div>
                    ) : (
                      visibleEntries.map((entry) => {
                        const statusConfig = getStatusConfig(entry.statusId);
                        const sourceConfig = getSourceConfig(entry.source);

                        return (
                          <button
                            key={`${entry.source}-${entry.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (dayItem.dayEntries.length === 1) navigate(entry.detailPath);
                              else setSelectedDayContext({ date: new Date(year, month, dayItem.day), entries: dayItem.dayEntries });
                            }}
                            className="shrink-0 w-full relative group rounded-[10px] border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#1f2937]/50 hover:border-slate-300 dark:hover:border-slate-500 px-3 py-2 text-left shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all overflow-hidden"
                          >
                            <div className={cx("absolute left-0 top-0 bottom-0 w-[4px]", statusConfig.dot)} />
                            <div className="flex items-center gap-2 pl-1">
                              <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-700 dark:text-slate-200">{entry.title}</span>
                              <span className="shrink-0 rounded-[6px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wider">
                                {sourceConfig.label}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}

                    {hiddenCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedDayContext({ date: new Date(year, month, dayItem.day), entries: dayItem.dayEntries }); }}
                        className="mt-1 w-full shrink-0 rounded-[8px] bg-blue-50 dark:bg-blue-500/10 py-2.5 text-center text-[11px] font-black text-blue-600 dark:text-blue-300 transition-colors hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-100 dark:border-blue-500/20"
                      >
                        Ver + {hiddenCount} {hiddenCount === 1 ? 'actividad' : 'actividades'}
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>

        <div className="hidden md:grid grid-cols-7 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#12213a]">
          {DAYS.map((day) => (
            <div key={day} className="py-4 text-center text-[10px] md:text-[11px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.3em]">
              {day}
            </div>
          ))}
        </div>

        <div className="relative hidden md:block min-h-[620px] lg:min-h-[690px]">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={`${month}-${year}`}
              custom={direction}
              initial={{ opacity: 0, scale: 0.99, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.005, y: -10 }}
              transition={{ duration: 0.45, ease: [0.19, 1, 0.22, 1] }}
              className="grid grid-cols-7 grid-rows-6 w-full h-full absolute inset-0"
            >
              {calendarDays.map((dateObj, index) => {
                const dayEntries = entries
                  .filter(
                    (entry) =>
                      entry.date.getDate() === dateObj.d &&
                      entry.date.getMonth() === dateObj.m &&
                      entry.date.getFullYear() === dateObj.y
                  )
                  .sort((first, second) => first.date.getTime() - second.date.getTime());

                const active = dateObj.current;
                const today = isToday(dateObj.d, dateObj.m, dateObj.y);
                const visibleEntries = dayEntries.slice(0, MAX_VISIBLE_ENTRIES);
                const hiddenCount = dayEntries.length - visibleEntries.length;

                return (
                  <motion.div
                    key={index}
                    whileTap={dayEntries.length > 0 ? { scale: 0.98 } : undefined}
                    onClick={() => {
                      if (dayEntries.length === 1) {
                        navigate(dayEntries[0].detailPath);
                      } else if (dayEntries.length > 1) {
                        setSelectedDayContext({ date: new Date(dateObj.y, dateObj.m, dateObj.d), entries: dayEntries });
                      }
                    }}
                    className={cx(
                      "min-h-[102px] lg:min-h-[114px] px-3 py-3 border-r border-b border-slate-200/70 dark:border-slate-700/70 relative flex flex-col overflow-hidden transition-colors duration-300",
                      active ? "bg-white dark:bg-[#14233d] hover:bg-slate-50/85 dark:hover:bg-[#1a2b47]" : "bg-slate-50/80 dark:bg-[#111d33] opacity-75",
                      index % 7 === 6 && "border-r-0",
                      dayEntries.length > 0 && "cursor-pointer"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
                      <span
                        className={cx(
                          "inline-flex items-center justify-center font-black transition-all duration-300 shrink-0 leading-none",
                          today
                            ? "w-10 h-10 rounded-full bg-white dark:bg-white text-slate-900 text-[1.6rem] shadow-[0_10px_22px_rgba(59,130,246,0.25)] ring-2 ring-blue-500/20"
                            : active
                              ? "text-slate-700 dark:text-slate-100 text-[1.6rem] px-0.5"
                              : "text-slate-300 dark:text-slate-600 text-[1.6rem] px-0.5"
                        )}
                      >
                        {dateObj.d}
                      </span>

                      {dayEntries.length > 0 && active && (
                        <div className="mt-0.5 min-w-6 h-6 px-1.5 flex items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-black shadow-[0_10px_20px_rgba(37,99,235,0.3)]">
                          {dayEntries.length}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5 relative z-10 min-h-0">
                      {!isLoading &&
                        visibleEntries.map((entry) => {
                          const statusConfig = getStatusConfig(entry.statusId);
                          const sourceConfig = getSourceConfig(entry.source);

                          return (
                            <motion.button
                              key={`${entry.source}-${entry.id}`}
                              whileTap={{ scale: 0.98 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (dayEntries.length === 1) navigate(entry.detailPath);
                                else setSelectedDayContext({ date: new Date(dateObj.y, dateObj.m, dateObj.d), entries: dayEntries });
                              }}
                              className="shrink-0 w-full h-[28px] rounded-[8px] bg-white dark:bg-[#1f2937]/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500 px-2 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all overflow-hidden relative group"
                            >
                              <div className={cx("absolute left-0 top-0 bottom-0 w-[3px] transition-all group-hover:w-[4px]", statusConfig.dot)} />
                              <div className="h-full flex items-center gap-1.5 pl-1.5 pr-0.5">
                                <span className="min-w-0 flex-1 text-[10.5px] font-semibold text-slate-700 dark:text-slate-200 truncate">{entry.title}</span>
                                <span className="shrink-0 rounded-[4px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1 py-[2px] text-[7.5px] font-bold uppercase tracking-wide">
                                  {sourceConfig.label}
                                </span>
                              </div>
                            </motion.button>
                          );
                        })}

                      {!isLoading && hiddenCount > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedDayContext({ date: new Date(dateObj.y, dateObj.m, dateObj.d), entries: dayEntries }); }}
                          className="mt-auto h-[26px] w-full shrink-0 rounded-[6px] bg-blue-50/80 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-2 text-center text-[10px] sm:text-[10.5px] font-black tracking-wide text-blue-600 dark:text-blue-300 transition-colors flex items-center justify-center shadow-[0_2px_6px_rgba(37,99,235,0.06)] border border-blue-100 dark:border-blue-500/20"
                        >
                          Ver + {hiddenCount} {hiddenCount === 1 ? 'actividad' : 'actividades'}
                        </button>
                      )}
                    </div>

                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </SurfaceCard>

      {/* Day Details Modal */}
      <AnimatePresence>
        {selectedDayContext && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDayContext(null)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-white dark:bg-[#0f1c34] border border-slate-200 dark:border-slate-700/80 rounded-[24px] shadow-2xl p-5 pointer-events-auto"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {selectedDayContext.date.getDate()} de {MONTHS[selectedDayContext.date.getMonth()]}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                      {selectedDayContext.entries.length} Actividades
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDayContext(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    <span className="material-symbols-rounded text-[20px]">close</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {selectedDayContext.entries.map((entry) => {
                    const statusConfig = getStatusConfig(entry.statusId);
                    const sourceConfig = getSourceConfig(entry.source);
                    return (
                      <button
                        key={`${entry.source}-${entry.id}`}
                        onClick={() => {
                          setSelectedDayContext(null);
                          navigate(entry.detailPath);
                        }}
                        className="w-full relative group rounded-[14px] border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#1a2b47]/50 hover:bg-slate-50 dark:hover:bg-[#1a2b47] hover:border-slate-300 dark:hover:border-slate-600 p-3.5 text-left shadow-sm transition-all overflow-hidden"
                      >
                        <div className={cx("absolute left-0 top-0 bottom-0 w-[4px]", statusConfig.dot)} />
                        <div className="pl-1.5">
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <span className="font-bold text-[14px] text-slate-800 dark:text-white leading-tight">
                              {entry.title}
                            </span>
                            <span className={cx("shrink-0 rounded-[6px] bg-slate-100 dark:bg-slate-800 px-2 py-[3px] text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300")}>
                              {sourceConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={cx("w-1.5 h-1.5 rounded-full shrink-0", statusConfig.dot)} />
                            <span className={cx("text-[11px] font-bold", statusConfig.labelColor)}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CalendarPage;
