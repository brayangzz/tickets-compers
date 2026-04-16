import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { getTicketById, getTicketFiles, updateTicket, type Ticket } from "../services/ticketService";
import { getStatuses, type Status } from "../services/catalogService";
import { motion, AnimatePresence } from "framer-motion";
import { getInitials, getAvatarGradient } from "../utils/user";
import { getStatusConfig } from "../utils/status";
import { getLocalStorageJSON, getSessionStorageJSON } from "../utils/storage";
import { toApiUrl } from "../config/api";

// --- INTERFACES ---
interface ApiComment {
    ildComment?: number;
    iIdComment?: number;
    ildTask?: number;
    iIdTask?: number;
    sComment: string;
    ildUser?: number;
    iIdUser?: number;
    userName?: string; 
    sUser?: string;
    employeeName?: string;
    dDateCreate: string;
    images?: string[]; 
}

interface ChatMessage {
    id: string | number;
    isBot: boolean;
    isMine: boolean;
    author: string;
    time: string;
    text: string;
    images?: string[];
    avatarIcon?: string;
    avatarBg: string;
    initials?: string;
}

interface ApiUser {
    iIdUser?: number;
    ildUser?: number;
    sUser?: string;
    employeeName?: string;
}

type TicketDetailUser = {
    iIdRol?: number | string;
    roleId?: number | string;
    ildRol?: number | string;
    iIdUser?: number | string;
    ildUser?: number | string;
    idUser?: number | string;
    sUser?: string;
    employeeName?: string;
};

// --- HELPER PARA DETECTAR ENLACES (LINKIFY) ---
const linkifyText = (text: string) => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a 
                    key={i} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-bold underline hover:opacity-80 hover:no-underline transition-all break-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

export const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- IDENTIDAD DEL USUARIO ACTUAL ---
  const userObj = getLocalStorageJSON<TicketDetailUser>('user', {});
  const userRole = Number(userObj.iIdRol || userObj.roleId || userObj.ildRol || 0);
  const currentUserId = Number(userObj.iIdUser || userObj.ildUser || userObj.idUser || 0);
  const currentUserName = userObj.sUser || userObj.employeeName || "Yo";

  const isSupport = [1, 2, 5, 20, 32].includes(userRole);
  
  // LÓGICA DE PERMISOS
  const isDani = currentUserId === 28 || currentUserId === 33 || currentUserName.toLowerCase().includes('dan');
  const canAssign = isSupport && isDani;

  // --- ESTADOS GENERALES ---
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [usersList, setUsersList] = useState<ApiUser[]>([]); 
  const [supportUsers, setSupportUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ESTADOS DE ESTADO (STATUS)
  const [currentStatusId, setCurrentStatusId] = useState<number>(0);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ESTADOS DE ASIGNACIÓN
  const [assignedUserId, setAssignedUserId] = useState<number>(0); 
  const [pendingAssignId, setPendingAssignId] = useState<number>(0); 
  const [hasAssignChanges, setHasAssignChanges] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false); 

  // --- ESTADOS EDICIÓN INLINE ---
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionEdit, setDescriptionEdit] = useState("");
  const [titleEdit, setTitleEdit] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // --- ESTADOS DE COMENTARIOS ---
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // REFERENCIA PARA SCROLL
  const commentsScrollRef = useRef<HTMLDivElement>(null);

  // --- FUNCION AUXILIAR DE SCROLL FORZADO ---
  const scrollToBottom = () => {
      setTimeout(() => {
          if (commentsScrollRef.current) {
              commentsScrollRef.current.scrollTo({
                  top: commentsScrollRef.current.scrollHeight,
                  behavior: "smooth"
              });
          }
      }, 150); 
  };

  // --- CARGAR COMENTARIOS ---
  const fetchComments = async (taskId: number) => {
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(toApiUrl(`/TicketComments/${taskId}`), {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setComments(Array.isArray(data) ? data : (data.result || []));
          }
      } catch (error) { console.error("Error al cargar comentarios", error); }
  };

  // --- CARGA INICIAL (OPTIMIZADA) ---
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token') || '';
        const headers = { 'Authorization': `Bearer ${token}` };
        const ticketId = Number(id);

        // Disparamos peticiones nucleares
        const pTicket = getTicketById(ticketId);
        const pFiles = getTicketFiles(ticketId);
        // Eliminamos el waterfall. Iniciamos la descarga de comentarios simultáneamente.
        const pComments = fetchComments(ticketId); 

        // Helper de Caché Temporal de la Sesión para los "Diccionarios" Gigantes
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
        
        const pUsers = fetchCached('app_users', async () => {
            const res = await fetch(toApiUrl("/general/users"), { headers });
            if (!res.ok) {
                sessionStorage.removeItem("app_users");
                return undefined;
            }
            return await res.json();
        });

        const pSupportUsers = fetchCached('app_support_users', async () => {
            const res = await fetch(toApiUrl("/general/support-users"), { headers });
            if (!res.ok) {
                sessionStorage.removeItem("app_support_users");
                return undefined;
            }
            return await res.json();
        });

        // Esperamos TODO en paralelo nativo (Ahorro enorme de milisegundos).
        // Los comentarios (fetchComments) ya se dispararon y se actualizarán en segundo plano sin bloquear la vista principal.
        const [ticketData, filesData, statusesData, usersData, supportData] = await Promise.all([
            pTicket, pFiles, pStatuses, pUsers, pSupportUsers
        ]);

        setTicket(ticketData);
        setFiles(filesData || []);
        setStatuses(statusesData || []);
        
        setUsersList(Array.isArray(usersData) ? usersData : []);
        setSupportUsers(Array.isArray(supportData) ? supportData : (supportData.data || []));

        if (ticketData) {
            setCurrentStatusId(ticketData.iIdStatus);
            
            const initialAssignee = (ticketData as any).iIdUserTaskAssigned || (ticketData as any).assignedUserId || 0;
            setAssignedUserId(initialAssignee); 
            setPendingAssignId(initialAssignee);

            setDescriptionEdit(ticketData.sDescription);
            setTitleEdit(ticketData.sName || "");
            
            scrollToBottom();
        }
      } catch (error) { 
          console.error("Error cargando el ticket:", error); 
      } finally { 
          setIsLoading(false); 
      }
    };
    loadData();
  }, [id]);

  // --- POLLING AUTOMÁTICO DE COMENTARIOS ---
  useEffect(() => {
      if (!ticket) return;
      const intervalId = setInterval(() => { fetchComments(ticket.iIdTask); }, 10000); 
      return () => clearInterval(intervalId); 
  }, [ticket?.iIdTask]);

  // --- POLLING AUTOMÁTICO DE ESTATUS ---
  useEffect(() => {
    if (!ticket) return;

    const intervalId = setInterval(async () => {
        try {
            const updatedTicket = await getTicketById(ticket.iIdTask);
            if (updatedTicket && updatedTicket.iIdStatus !== ticket.iIdStatus) {
                setTicket(prev => prev ? { ...prev, iIdStatus: updatedTicket.iIdStatus, statusName: updatedTicket.statusName } : prev);
                if (!hasChanges) {
                    setCurrentStatusId(updatedTicket.iIdStatus);
                }
            }
            if (updatedTicket && (updatedTicket as any).iIdUserTaskAssigned !== assignedUserId) {
                const newAssignee = (updatedTicket as any).iIdUserTaskAssigned || 0;
                setAssignedUserId(newAssignee);
                if (!hasAssignChanges) setPendingAssignId(newAssignee);
            }
        } catch (error) { console.error("Error al actualizar estatus", error); }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [ticket?.iIdTask, ticket?.iIdStatus, hasChanges, assignedUserId, hasAssignChanges]);

  // --- AUTO-SCROLL SUAVE ---
  useEffect(() => {
      const el = commentsScrollRef.current;
      if (!el) return;
      
      const timeoutId = setTimeout(() => {
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          if (distanceFromBottom < 350) {
              el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
          }
      }, 150);

      return () => clearTimeout(timeoutId);
  }, [comments, commentImages]);

  const isCreator = ticket ? ticket.iIdUserRaisedTask === currentUserId : false;

  // --- ASIGNAR TICKET ---
  const handleAssignUser = async () => {
    if (!ticket || !pendingAssignId) return;
    setIsAssigning(true);
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(toApiUrl(`/tickets/${ticket.iIdTask}/assign`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ iIdUserTarget: pendingAssignId })
        });

        if (res.ok || res.status === 204) {
            setAssignedUserId(pendingAssignId);
            setHasAssignChanges(false);
            await fetchComments(ticket.iIdTask);
        } else {
            alert("Error al asignar el ticket. Verifica tu conexión.");
        }
    } catch (error) {
        console.error("Error asignando ticket:", error);
    } finally {
        setIsAssigning(false);
    }
  };

  // --- GUARDAR ESTATUS ---
  const handleSaveStatus = async () => {
    if (!ticket) return;
    setIsSavingStatus(true);
    try {
        const isCompleted = currentStatusId === 3 || currentStatusId === 4; 
        const payload = {
            sName: ticket.sName,
            sDescription: ticket.sDescription,
            iIdStatus: currentStatusId,
            iIdBranch: (ticket as any).branchId || (ticket as any).iIdBranch,
            iIdDepartment: (ticket as any).departmentId || (ticket as any).iIdDepartment,
            dTaskCompletionDate: isCompleted ? new Date().toISOString() : null,
            bActive: true
        };

        const success = await updateTicket(ticket.iIdTask, payload);
        if (success) {
            setHasChanges(false);
            setTicket({ 
                ...ticket, 
                iIdStatus: currentStatusId, 
                statusName: statuses.find(s => s.iIdStatus === currentStatusId)?.sStatus || ticket.statusName 
            });
        } else { alert("Error al guardar estatus"); }
    } catch (error) { console.error(error); } finally { setIsSavingStatus(false); }
  };

  const handleSaveDescription = async () => {
    if (!ticket) return;
    if (!descriptionEdit.trim() || !titleEdit.trim()) { alert("El título y la descripción no pueden estar vacíos."); return; }

    setIsSavingEdit(true);
    try {
        const payload = {
            sName: titleEdit,
            sDescription: descriptionEdit, 
            iIdStatus: ticket.iIdStatus,   
            iIdBranch: (ticket as any).branchId || (ticket as any).iIdBranch,
            iIdDepartment: (ticket as any).departmentId || (ticket as any).iIdDepartment,
            dTaskCompletionDate: ticket.dTaskCompletionDate,
            bActive: true
        };
        const success = await updateTicket(ticket.iIdTask, payload);
        if (success) {
            setTicket({ ...ticket, sDescription: descriptionEdit, sName: titleEdit });
            setIsEditingDescription(false); 
        } else { alert("Error al editar"); }
    } catch (error) { console.error(error); } finally { setIsSavingEdit(false); }
  };

  const handleCancelEdit = () => {
      setDescriptionEdit(ticket?.sDescription || "");
      setTitleEdit(ticket?.sName || "");
      setIsEditingDescription(false);
  };

  // --- MANEJO DE IMÁGENES EN COMENTARIOS ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const filesArray = Array.from(e.target.files);
          setCommentImages(prev => [...prev, ...filesArray]);
          scrollToBottom(); 
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
      setCommentImages(prev => prev.filter((_, i) => i !== index));
  };

  // --- DESCARGAR IMAGEN (TRUCO BLOB PARA BYPASSEAR CORS/CLOUDINARY) ---
  const handleDownloadImage = async (imgUrl: string) => {
      try {
          // Descargamos la imagen primero en memoria
          const response = await fetch(imgUrl);
          const blob = await response.blob();
          
          // Creamos una URL local del archivo descargado
          const blobUrl = window.URL.createObjectURL(blob);
          
          // Creamos el enlace invisible y forzamos la descarga
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `evidencia_${new Date().getTime()}.png`;
          document.body.appendChild(link);
          link.click();
          
          // Limpiamos
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
          console.error("Error al forzar descarga de imagen:", error);
          // Si el servidor bloquea la lectura por CORS, abrimos en nueva pestaña como fallback
          window.open(imgUrl, '_blank');
      }
  };

  // --- ENVIAR NUEVO COMENTARIO ---
  const handleSendComment = async () => {
      if((!commentText.trim() && commentImages.length === 0) || !ticket) return;
      setIsSubmittingComment(true);
      
      try {
          const token = localStorage.getItem('token');
          const formData = new FormData();
          
          formData.append("iIdTask", String(ticket.iIdTask));
          formData.append("ildTask", String(ticket.iIdTask));
          formData.append("iIdUser", String(currentUserId));
          formData.append("ildUser", String(currentUserId));
          
          formData.append("sComment", commentText.trim() || "Adjuntó imagen(es)");

          commentImages.forEach(file => {
              formData.append("Images", file);
          });

          const res = await fetch(toApiUrl("/TicketComments"), {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
          });

          if (res.ok) {
              setCommentText(""); 
              setCommentImages([]); 
              await fetchComments(ticket.iIdTask); 
              scrollToBottom(); 
          } else {
              const errorText = await res.text();
              console.error("Error del servidor:", errorText);
              alert("Error al enviar el comentario.");
          }
      } catch (error) { 
          console.error("Error en la petición:", error); 
      } finally { 
          setIsSubmittingComment(false); 
      }
  };

  // --- HELPERS VISUALES ---
  const formatDate = (d: string | null | undefined) => d ? new Date(d).toLocaleString("es-MX", { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "-";
  
  const formatCommentTime = (d: string | null | undefined) => {
      if (!d) return "";
      const dateStr = d.includes('Z') ? d : `${d}Z`; 
      const date = new Date(dateStr);
      return date.toLocaleDateString("es-MX", { day: '2-digit', month: 'short' }).toUpperCase() + ", " + date.toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getStatusColor = (id: number) => {
      switch(id) {
          case 1: return "info"; case 2: return "warning"; case 3: return "success"; 
          case 4: return "success"; case 6: return "danger"; default: return "neutral";
      }
  };

  // --- CONSTRUCCIÓN DEL CHAT ---
  const chatMessages = useMemo<ChatMessage[]>(() => {
      if (!ticket) return [];
      
      const systemBotMsg: ChatMessage = {
          id: 'bot-msg',
          isBot: true,
          isMine: false,
          author: 'Sistema Automático',
          time: formatCommentTime(ticket.dDateUserCreate),
          text: 'Ticket creado exitosamente. Se ha notificado al departamento correspondiente para su revisión.',
          avatarIcon: 'smart_toy',
          avatarBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
      };

      const dbMessages: ChatMessage[] = comments.map(c => {
          const authorId = c.ildUser || c.iIdUser;
          const isMine = authorId === currentUserId;
          
          const foundUser = usersList.find(u => (u.iIdUser === authorId) || (u.ildUser === authorId));
          const authorName = c.sUser || c.userName || c.employeeName || foundUser?.employeeName || foundUser?.sUser || (isMine ? currentUserName : `Usuario`);

          return {
              id: c.ildComment || c.iIdComment || Math.random(),
              isBot: false,
              isMine: isMine,
              author: isMine ? 'Tú' : authorName,
              time: formatCommentTime(c.dDateCreate),
              text: c.sComment,
              images: c.images || [], 
              initials: getInitials(authorName),
              avatarBg: isMine ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
          };
      });

      return [systemBotMsg, ...dbMessages];
  }, [ticket, comments, currentUserId, currentUserName, usersList]);

  if (isLoading) return <TicketDetailSkeleton />;
  if (!ticket) return <div className="p-10 text-center text-txt-muted">Ticket no encontrado.</div>;

  return (
    <>
    <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes floatEffect {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
            100% { transform: translateY(0px); }
        }
        .animate-float { animation: floatEffect 3s ease-in-out infinite; will-change: transform; backface-visibility: hidden; }

        /* Scrollbar personalizado */
        .comments-scroll::-webkit-scrollbar { width: 6px; }
        .comments-scroll::-webkit-scrollbar-track { background: transparent; }
        .comments-scroll::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.4); border-radius: 10px; }
        .comments-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(148, 163, 184, 0.7); }
    `}</style>

    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto pb-12 font-display text-txt-main"
    >
      
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex items-center justify-between h-auto sm:h-12 gap-4">
        <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} 
            className="flex items-center gap-3 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all duration-300 group shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
             <span className="material-symbols-rounded text-xl">arrow_back</span>
          </div>
          <span className="text-sm font-semibold hidden sm:block opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">Volver</span>
        </motion.button>

        {isCreator && (
            <AnimatePresence mode="wait">
                {!isEditingDescription ? (
                    <motion.button key="edit-btn" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsEditingDescription(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white hover:shadow-md transition-all duration-300 font-bold text-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0">
                        <span className="material-symbols-rounded text-lg">edit</span> Editar
                    </motion.button>
                ) : (
                    <div className="flex items-center gap-2 shrink-0" key="action-btns">
                        <motion.button initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} onClick={handleCancelEdit} className="px-4 py-2.5 rounded-full text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">Cancelar</motion.button>
                        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveDescription} disabled={isSavingEdit || !descriptionEdit.trim() || !titleEdit.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg disabled:opacity-50 disabled:pointer-events-none transition-all">
                            {isSavingEdit ? <span className="material-symbols-rounded animate-spin text-lg">progress_activity</span> : <><span className="material-symbols-rounded text-lg">save</span> <span className="hidden sm:block">Guardar</span></>}
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>
        )}
      </div>

      {/* HEADER TICKET DINÁMICO & SELECTORES PREMIUM */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
            
            {/* Titulo del Ticket */}
            <div className="flex flex-col gap-2 w-full lg:w-1/2">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                   <Badge variant="neutral" className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-0 uppercase tracking-widest text-[10px] font-bold px-3 py-1">{ticket.taskTypeName || "Incidencia"}</Badge>
                   <span className="text-slate-300 text-sm hidden sm:inline">•</span>
                   <span className="text-slate-400 text-xs sm:text-sm font-medium uppercase tracking-wide">{formatDate(ticket.dDateUserCreate)}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {isEditingDescription ? (
                        <input 
                            type="text" value={titleEdit} onChange={(e) => setTitleEdit(e.target.value)}
                            className="text-3xl md:text-5xl font-extrabold tracking-tight text-txt-main leading-tight bg-transparent border-b-2 border-blue-500 focus:outline-none w-full max-w-2xl py-1"
                            placeholder="Título del Ticket..."
                        />
                    ) : (
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight break-words" title={ticket.sName || "Sin Título"}>
                            {ticket.sName ? ticket.sName : <span className="text-slate-400 italic">Sin Título</span>}
                        </h1>
                    )}
                    <div className="flex items-baseline shrink-0 mt-1 md:mt-0">
                        <span className="text-2xl md:text-3xl font-medium text-slate-300 dark:text-slate-600 mr-1 opacity-70">#</span>
                        <span className="text-4xl md:text-6xl font-black text-blue-500 drop-shadow-md">{ticket.iIdTask}</span>
                    </div>
                </div>
            </div>

            {/* CONTENEDOR SELECTORES */}
            <motion.div 
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="relative z-30 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-5 py-4 sm:py-3 rounded-[24px] sm:rounded-[28px] border border-slate-200/50 dark:border-slate-700/50 shadow-sm w-full lg:w-auto self-start xl:self-center"
            >
                {isSupport ? (
                    <>
                        {/* BLOQUE ASIGNAR A (SOLO PARA DANI/SISTEMAS) */}
                        {canAssign && (
                            <div className="flex flex-col gap-2 sm:gap-1.5 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700/80 pb-4 sm:pb-0 sm:pr-5 w-full sm:w-auto">
                                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Asignar a</span>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <ModernAssignSelector 
                                        options={supportUsers} 
                                        selectedId={pendingAssignId} 
                                        onChange={(id) => {
                                            setPendingAssignId(id);
                                            setHasAssignChanges(id !== assignedUserId);
                                        }} 
                                    />
                                    <AnimatePresence mode="popLayout">
                                        {hasAssignChanges && (
                                            <motion.button 
                                                layout 
                                                initial={{ scale: 0, opacity: 0, width: 0 }}
                                                animate={{ scale: 1, opacity: 1, width: 48 }} 
                                                exit={{ scale: 0, opacity: 0, width: 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                                onClick={handleAssignUser} 
                                                disabled={isAssigning} 
                                                className="relative flex items-center justify-center w-12 h-12 min-w-12 min-h-12 aspect-square p-0 rounded-full bg-blue-600 text-white shadow-lg overflow-hidden shrink-0 hover:scale-105"
                                            >
                                                {isAssigning ? (
                                                    <span className="material-symbols-rounded animate-spin text-xl">progress_activity</span>
                                                ) : (
                                                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="material-symbols-rounded text-xl">check</motion.span>
                                                )}
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {/* BLOQUE ESTADO */}
                        <div className="flex flex-col gap-2 sm:gap-1.5 sm:pl-1 w-full sm:w-auto">
                            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Estado</span>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <ModernStatusSelector 
                                    options={statuses} 
                                    selectedId={currentStatusId} 
                                    onChange={(id) => {      
                                        setCurrentStatusId(id); 
                                        setHasChanges(id !== ticket.iIdStatus); 
                                    }} 
                                />
                                <AnimatePresence mode="popLayout">
                                    {hasChanges && (
                                        <motion.button 
                                            layout 
                                            initial={{ scale: 0, opacity: 0, width: 0 }}
                                            animate={{ scale: 1, opacity: 1, width: 48 }} 
                                            exit={{ scale: 0, opacity: 0, width: 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                            onClick={handleSaveStatus} 
                                            disabled={isSavingStatus} 
                                            className="relative flex items-center justify-center w-12 h-12 min-w-12 min-h-12 aspect-square p-0 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-lg overflow-hidden shrink-0 hover:scale-105"
                                        >
                                            {isSavingStatus ? (
                                                <span className="material-symbols-rounded animate-spin text-xl">progress_activity</span>
                                            ) : (
                                                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="material-symbols-rounded text-xl">save</motion.span>
                                            )}
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="px-5 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full font-bold text-sm text-slate-500 flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full bg-${getStatusColor(ticket.iIdStatus)}-500 animate-pulse`}></div>
                        <span className="uppercase tracking-wide">{ticket.statusName || "Estado desconocido"}</span>
                    </div>
                )}
            </motion.div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          <div className="xl:col-span-2 flex flex-col gap-6">
              
              <Card className={`p-0 bg-white dark:bg-[#1e293b]/90 backdrop-blur-xl border ${isEditingDescription ? 'border-blue-500/50 ring-1 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-600/60'} shadow-xl rounded-[24px] overflow-hidden transition-all duration-500`}>
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 shadow-inner">
                              <span className="material-symbols-rounded text-xl">subject</span>
                          </div>
                          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Descripción del Problema</h3>
                      </div>
                  </div>
                  <div className="p-6 sm:p-8">
                      {isEditingDescription ? (
                          <motion.textarea initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full bg-transparent text-lg md:text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed outline-none resize-none min-h-[150px] placeholder:text-slate-400" value={descriptionEdit} onChange={(e) => setDescriptionEdit(e.target.value)} />
                      ) : (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-base sm:text-lg md:text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                              {ticket.sDescription}
                          </motion.p>
                      )}
                  </div>
              </Card>

              {/* EVIDENCIAS */}
              <div>
                  <div className="flex items-center justify-between px-2 mb-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-rounded text-lg">image</span> Evidencia Adjunta
                      </h3>
                  </div>
                  {files.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {files.map((file) => {
                              const isImage = file.sFilePath.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i);
                              return (
                                  <motion.div key={file.iIdTaskFile || Math.random()} whileHover={{ scale: 1.02, y: -2 }} onClick={() => isImage ? setPreviewImage(file.sFilePath) : window.open(file.sFilePath, '_blank')} className="group flex items-center gap-4 p-4 rounded-[20px] border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#1e293b]/80 backdrop-blur-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 cursor-pointer overflow-hidden">
                                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shrink-0 flex items-center justify-center overflow-hidden relative shadow-inner">
                                          {isImage ? <img src={file.sFilePath} alt="evidencia" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" /> : <span className="material-symbols-rounded text-2xl text-slate-400">description</span>}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                          <p className="text-sm font-bold text-txt-main truncate group-hover:text-primary transition-colors">{file.sFileName || "Archivo Adjunto"}</p>
                                          <p className="text-xs text-slate-400 mt-0.5">{isImage ? "Clic para ver imagen" : "Clic para descargar"}</p>
                                      </div>
                                  </motion.div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="group flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700/80 rounded-2xl bg-slate-50/30 dark:bg-slate-800/20 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-500">
                          <span className="material-symbols-rounded text-4xl opacity-40 mb-3 group-hover:text-blue-500 group-hover:opacity-80 transition-colors duration-300 animate-float">cloud_off</span>
                          <span className="text-sm font-bold tracking-wide group-hover:text-slate-300 transition-colors duration-300">Sin archivos adjuntos</span>
                      </div>
                  )}
              </div>

              {/* COMENTARIOS */}
              <Card className="mt-2 p-0 bg-white dark:bg-[#1e293b]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/60 shadow-xl rounded-[24px] overflow-hidden flex flex-col transition-all duration-500 hover:border-slate-600/60">
                  <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg shadow-inner">
                              <span className="material-symbols-rounded text-xl">forum</span>
                          </div>
                          <h3 className="font-bold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest truncate">Actividad & Comentarios</h3>
                      </div>
                      {comments.length > 0 && (
                          <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800/50 shadow-sm whitespace-nowrap">
                              {comments.length} Resp.
                          </span>
                      )}
                  </div>

                  <div className="relative bg-slate-50/30 dark:bg-[#0f172a]/20">
                      <div ref={commentsScrollRef} className="flex flex-col gap-5 max-h-[400px] sm:max-h-[500px] overflow-y-auto overflow-x-hidden p-4 sm:p-6 comments-scroll">
                          <AnimatePresence>
                              {chatMessages.map((msg: ChatMessage) => (
                                    <motion.div key={msg.id} initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }} className={`flex w-full ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] group ${msg.isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className="shrink-0 mt-1">
                                                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-800 transition-transform duration-300 group-hover:scale-110 ${msg.avatarBg}`}>
                                                    {msg.isBot ? <span className="material-symbols-rounded text-sm sm:text-lg">{msg.avatarIcon}</span> : <span className="text-[10px] sm:text-[11px] font-bold">{msg.initials}</span>}
                                                </div>
                                            </div>
                                            <div className={`flex flex-col gap-1.5 ${msg.isMine ? 'items-end' : 'items-start'}`}>
                                                <div className={`flex items-center gap-2 px-1 ${msg.isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px] sm:max-w-none">{msg.author}</span>
                                                    <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">{msg.time}</span>
                                                </div>
                                                
                                                <div className={`flex flex-col gap-2 px-4 sm:px-5 py-2.5 sm:py-3 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg ${msg.isMine ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border border-blue-500/50 rounded-[20px] rounded-tr-[4px] shadow-md shadow-blue-500/20' : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-[20px] rounded-tl-[4px] shadow-md shadow-slate-900/10 backdrop-blur-md'}`}>
                                                    
                                                    {/* IMÁGENES DEL COMENTARIO */}
                                                    {msg.images && msg.images.length > 0 && (
                                                        <div className={`flex flex-wrap gap-2 ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                                                            {msg.images.map((imgUrl, idx) => (
                                                                <div key={idx} onClick={() => setPreviewImage(imgUrl)} className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden cursor-pointer border border-black/10 dark:border-white/10 shadow-sm relative group/img">
                                                                    <img src={imgUrl} alt="Comentario adjunto" className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110" />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                                                                        <span className="material-symbols-rounded text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-md">zoom_in</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* TEXTO CON ENLACES */}
                                                    {msg.text && (
                                                        <div className="text-[13px] sm:text-sm font-medium leading-relaxed whitespace-pre-wrap m-0">
                                                            {linkifyText(msg.text)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                              ))}
                          </AnimatePresence>
                      </div>
                  </div>

                  <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] flex flex-col gap-3">
                      
                      {/* PREVISUALIZACIÓN DE IMÁGENES A SUBIR */}
                      <AnimatePresence>
                        {commentImages.length > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 px-1">
                                {commentImages.map((file, idx) => (
                                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 group shadow-sm">
                                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                        <button onClick={() => removeImage(idx)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-rose-500/80">
                                            <span className="material-symbols-rounded text-xl">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="relative shadow-md rounded-2xl bg-white dark:bg-slate-900/60 backdrop-blur-md border border-slate-300 dark:border-slate-700/80 group focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all duration-300 flex items-end">
                          
                          {/* INPUT OCULTO DE ARCHIVOS */}
                          <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                          
                          <button onClick={() => fileInputRef.current?.click()} className="p-3 sm:p-4 text-slate-400 hover:text-blue-500 transition-colors h-full flex items-end shrink-0" title="Adjuntar imagen">
                              <span className="material-symbols-rounded text-xl sm:text-2xl">add_photo_alternate</span>
                          </button>

                          <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }} placeholder="Escribe una respuesta o pega un enlace..." className="w-full bg-transparent pl-1 pr-14 py-3 sm:py-4 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none resize-none min-h-[70px] sm:min-h-[90px] placeholder:text-slate-400" />
                          
                          <div className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 flex items-center">
                              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSendComment} disabled={(!commentText.trim() && commentImages.length === 0) || isSubmittingComment} className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl flex items-center justify-center shadow-md transition-all">
                                  {isSubmittingComment ? <span className="material-symbols-rounded animate-spin text-base sm:text-lg">progress_activity</span> : <span className="material-symbols-rounded text-base sm:text-lg ml-0.5 sm:ml-1">send</span>}
                              </motion.button>
                          </div>
                      </div>
                  </div>
              </Card>
          </div>

          <div className="flex flex-col h-full">
              <Card className="bg-white dark:bg-[#1e293b]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/60 hover:border-slate-600/60 p-6 rounded-[24px] shadow-xl transition-all duration-500 h-fit sticky top-6">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                      <span className="material-symbols-rounded text-slate-400">info</span>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Información General</h3>
                  </div>
                  <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-4 group">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                              <span className="text-xs font-bold">{ticket.userRaisedName?.substring(0,2).toUpperCase() || "??"}</span>
                          </div>
                          <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Solicitado por</p>
                              <p className="text-sm font-bold text-txt-main">{ticket.userRaisedName || "Desconocido"}</p>
                          </div>
                      </div>
                      <div className="space-y-5">
                          <DetailRow icon="store" label="Sucursal" value={ticket.branchName || "No especificada"} color="text-blue-500" bg="bg-blue-500/10" />
                          <DetailRow icon="domain" label="Departamento" value={ticket.departmentName || "General"} color="text-purple-500" bg="bg-purple-500/10" />
                      </div>
                  </div>
              </Card>
          </div>
      </div>

      <AnimatePresence>
      {previewImage && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-2xl" onClick={() => setPreviewImage(null)}>
            
            {/* CONTROLES DEL MODAL DE IMAGEN */}
            <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
                <motion.button 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.9 }} 
                    onClick={(e) => { e.stopPropagation(); handleDownloadImage(previewImage); }} 
                    className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all border border-white/10 shadow-xl backdrop-blur-sm"
                    title="Descargar imagen"
                >
                    <span className="material-symbols-rounded text-2xl">download</span>
                </motion.button>

                <motion.button 
                    whileHover={{ rotate: 90, scale: 1.1 }} 
                    whileTap={{ scale: 0.9 }} 
                    onClick={() => setPreviewImage(null)} 
                    className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-rose-500/80 rounded-full text-white transition-all border border-white/10 shadow-xl backdrop-blur-sm"
                    title="Cerrar previsualización"
                >
                    <span className="material-symbols-rounded text-2xl">close</span>
                </motion.button>
            </div>

            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="flex-1 w-full h-full flex items-center justify-center p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
                <img src={previewImage} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </motion.div>
    </>
  );
};

const DetailRow = ({ icon, label, value, color, bg }: any) => (
    <div className="flex items-center gap-4 group p-2 -mx-2 rounded-[16px] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-default">
        <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
            <span className="material-symbols-rounded text-xl opacity-90 group-hover:opacity-100 drop-shadow-sm">{icon}</span>
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">{label}</p>
            <p className="text-sm font-bold text-txt-main group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{value}</p>
        </div>
    </div>
);

// --- COMPONENTE DE ASIGNACIÓN: PÍLDORA UNIFICADA (Ancho y Alto Fijo) ---
const ModernAssignSelector = ({ options, selectedId, onChange }: { options: ApiUser[], selectedId: number, onChange: (id: number) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(o => (o.iIdUser === selectedId) || (o.ildUser === selectedId));
    const displayName = selectedOption ? (selectedOption.employeeName || selectedOption.sUser || "Usuario") : "Asignar a...";

    return (
        <div className="relative w-full sm:w-auto" ref={containerRef}>
            <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                onClick={() => setIsOpen(!isOpen)} 
                className={`flex items-center gap-3 px-4 h-[46px] w-full sm:w-[200px] shrink-0 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 justify-between shadow-sm ${isOpen ? 'ring-2 ring-blue-500/30 border-blue-500/50' : ''}`}
            >
                <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                    {selectedOption ? (
                        <div className={`w-6 h-6 shrink-0 rounded-full bg-gradient-to-br ${getAvatarGradient(selectedId)} text-white flex items-center justify-center text-[9px] font-bold shadow-sm`}>
                            {getInitials(displayName)}
                        </div>
                    ) : (
                        <span className="material-symbols-rounded shrink-0 text-slate-400 text-[18px]">person_add</span>
                    )}
                    <span className={`font-bold text-[13px] tracking-wide truncate text-left flex-1 ${selectedOption ? 'text-txt-main' : 'text-slate-500'}`}>
                        {displayName}
                    </span>
                </div>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="material-symbols-rounded shrink-0 text-slate-400 text-[18px]">expand_more</motion.span>
            </motion.button>
            <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} 
                    className="absolute left-0 mt-2 w-full sm:w-64 max-w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[100] origin-top p-2">
                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto overflow-x-hidden comments-scroll pr-1">
                        {options.map((opt) => {
                            const optId = opt.iIdUser || opt.ildUser || 0;
                            const isSelected = selectedId === optId;
                            const optName = opt.employeeName || opt.sUser || "Usuario";
                            return (
                                <motion.button key={optId} whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.98 }} 
                                    onClick={() => { onChange(optId); setIsOpen(false); }} 
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                    <div className={`w-7 h-7 shrink-0 rounded-full bg-gradient-to-br ${getAvatarGradient(optId)} text-white flex items-center justify-center text-[10px] font-bold shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                                        {getInitials(optName)}
                                    </div>
                                    <span className={`text-xs font-bold tracking-wide truncate flex-1 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{optName}</span>
                                    {isSelected && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="material-symbols-rounded shrink-0 text-blue-500 text-lg ml-auto">check</motion.span>}
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

// --- COMPONENTE ESTADO: PÍLDORA UNIFICADA (Ancho y Alto Fijo) ---
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

    const getStatusStyle = (id: number) => {
        switch(id) {
            case 1: return { bg: "bg-amber-500", label: "Pendiente" };
            case 2: return { bg: "bg-blue-500", label: "Abierto" };
            case 3: return { bg: "bg-indigo-500", label: "En Proceso" };
            case 4: return { bg: "bg-emerald-500", label: "Completado" };
            case 5: return { bg: "bg-teal-500", label: "Solucionado" };
            case 6: return { bg: "bg-rose-500", label: "Cancelado" };
            default: return { bg: "bg-slate-500", label: "Desconocido" };
        }
    };

    const currentStyle = getStatusStyle(selectedId);
    const selectedOption = options.find(o => o.iIdStatus === selectedId);

    return (
        <div className="relative w-full sm:w-auto" ref={containerRef}>
            <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                onClick={() => setIsOpen(!isOpen)} 
                className={`flex items-center gap-3 px-4 h-[46px] w-full sm:w-[200px] shrink-0 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 justify-between shadow-sm ${isOpen ? 'ring-2 ring-blue-500/30 border-blue-500/50' : ''}`}
            >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <span className={`w-2.5 h-2.5 shrink-0 rounded-full ${currentStyle.bg} animate-pulse`}></span>
                    <span className="font-bold text-[13px] text-txt-main tracking-widest uppercase truncate text-left flex-1">
                        {selectedOption ? selectedOption.sStatus : currentStyle.label}
                    </span>
                </div>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="material-symbols-rounded shrink-0 text-slate-400 text-[18px]">expand_more</motion.span>
            </motion.button>
            <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} 
                    className="absolute left-0 mt-2 w-full sm:w-56 max-w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[100] origin-top p-2">
                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto overflow-x-hidden comments-scroll pr-1">
                        {options.filter(opt => opt.iIdStatus !== 4).map((opt) => {
                            const style = getStatusStyle(opt.iIdStatus);
                            const isSelected = selectedId === opt.iIdStatus;
                            return (
                                <motion.button key={opt.iIdStatus} whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }} onClick={() => { onChange(opt.iIdStatus); setIsOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group ${isSelected ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                    <div className={`w-2 h-2 shrink-0 rounded-full ${style.bg} transition-all duration-300 ${isSelected ? 'scale-125' : 'opacity-50 group-hover:opacity-100'}`}></div>
                                    <span className={`text-xs font-bold uppercase tracking-wider flex-1 truncate ${isSelected ? 'text-txt-main' : 'text-slate-500'}`}>{opt.sStatus}</span>
                                    {isSelected && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="material-symbols-rounded shrink-0 text-blue-500 text-lg ml-auto">check</motion.span>}
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

const TicketDetailSkeleton = () => (
    <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto pb-12 animate-pulse px-4 sm:px-0">
        <div className="h-12 sm:h-20 w-full mb-4 sm:mb-8 rounded-[30px] bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="h-64 w-full rounded-[30px] bg-slate-200 dark:bg-slate-800" />
                <div className="h-64 w-full rounded-[30px] bg-slate-200 dark:bg-slate-800 mt-4" />
            </div>
            <div>
                <div className="h-64 w-full rounded-[30px] bg-slate-200 dark:bg-slate-800" />
            </div>
        </div>
    </div>
);
