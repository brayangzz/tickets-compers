import { API_BASE_URL } from "../config/api";

const API_URL = API_BASE_URL;
const TICKETS_CACHE_PREFIX = "app_tickets_cache_v1_";
const TICKETS_CACHE_TTL_MS = 60_000;

type TicketsCacheEntry = {
  timestamp: number;
  data: Ticket[];
};

const ticketsInFlight = new Map<string, Promise<Ticket[]>>();

// --- INTERFACES ---

export interface Ticket {
  // Obligatorias
  iIdTask: number;
  sName?: string; // <--- ¡AQUÍ AGREGAMOS EL TÍTULO!
  iIdTaskType: number;
  sDescription: string;
  iIdStatus: number;
  
  // Datos del creador
  iIdUserRaisedTask: number;
  userRaisedName: string | null;
  dTaskStartDate: string;
  dDateUserCreate: string;
  
  // Descriptivos
  branchId: number;
  branchName: string | null;    
  departmentId: number;
  departmentName: string | null; 
  statusName: string | null;    
  taskTypeName: string | null;  

  // Opcionales (para evitar errores de TypeScript si faltan)
  iIdBranch?: number;      
  iIdDepartment?: number;  
  dTaskCompletionDate?: string | null; 
  bActive?: boolean;       
}

export interface CreateTicketPayload {
  sName: string; // <--- ¡AGREGADO PARA CREAR TICKETS!
  sDescription: string;
  iIdTaskType: number;
  iIdStatus: number;
  iIdBranch: number;
  iIdDepartment: number;
  dTaskStartDate: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

const getTicketsCacheKey = () => {
  const userRaw = localStorage.getItem("user");
  let userId = "anonymous";

  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw) as {
        iIdUser?: number | string;
        idUser?: number | string;
        ildUser?: number | string;
      };
      const resolvedId = Number(parsed.iIdUser || parsed.idUser || parsed.ildUser || 0);
      if (resolvedId > 0) userId = String(resolvedId);
    } catch {
      userId = "anonymous";
    }
  }

  return `${TICKETS_CACHE_PREFIX}${userId}`;
};

const readTicketsCache = (cacheKey: string): Ticket[] | null => {
  const raw = sessionStorage.getItem(cacheKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as TicketsCacheEntry;

    if (!parsed || typeof parsed.timestamp !== "number" || !Array.isArray(parsed.data)) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    if (Date.now() - parsed.timestamp > TICKETS_CACHE_TTL_MS) {
      return null;
    }

    return parsed.data;
  } catch {
    sessionStorage.removeItem(cacheKey);
    return null;
  }
};

const writeTicketsCache = (cacheKey: string, data: Ticket[]) => {
  const entry: TicketsCacheEntry = {
    timestamp: Date.now(),
    data,
  };
  sessionStorage.setItem(cacheKey, JSON.stringify(entry));
};

export const invalidateTicketsCache = () => {
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key && key.startsWith(TICKETS_CACHE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
  ticketsInFlight.clear();
};

// --- CRUD PRINCIPAL ---

export const getTickets = async (): Promise<Ticket[]> => {
  const token = localStorage.getItem('token');
  if (!token) {
    invalidateTicketsCache();
    return [];
  }

  const cacheKey = getTicketsCacheKey();
  const cached = readTicketsCache(cacheKey);
  if (cached !== null) return cached;

  const pendingRequest = ticketsInFlight.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const requestPromise = (async (): Promise<Ticket[]> => {
    try {
      const response = await fetch(`${API_URL}/tickets`, { method: "GET", headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Error");

      const rawData = await response.json();
      const resolvedData = Array.isArray(rawData)
        ? rawData
        : (rawData?.result || rawData?.data || []);

      const tickets = Array.isArray(resolvedData) ? (resolvedData as Ticket[]) : [];
      writeTicketsCache(cacheKey, tickets);
      return tickets;
    } catch (error) {
      return [];
    } finally {
      ticketsInFlight.delete(cacheKey);
    }
  })();

  ticketsInFlight.set(cacheKey, requestPromise);
  return requestPromise;
};

export const getTicketById = async (id: number): Promise<Ticket | null> => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const response = await fetch(`${API_URL}/tickets/${id}`, { method: "GET", headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Error");
    const data = await response.json();
    return data.result || data; 
  } catch (error) { return null; }
};

export const createTicket = async (ticket: CreateTicketPayload): Promise<any> => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const response = await fetch(`${API_URL}/tickets`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(ticket) });
    if (!response.ok) throw new Error("Error");
    const data = await response.json();
    invalidateTicketsCache();
    return data.result || data; 
  } catch (error) { return null; }
};

export const updateTicket = async (id: number, data: any): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const response = await fetch(`${API_URL}/tickets/${id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(data) });
    if (response.ok) invalidateTicketsCache();
    return response.ok;
  } catch (error) { return false; }
};

export const deleteTicket = async (id: number): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const response = await fetch(`${API_URL}/tickets/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al eliminar ticket");
    invalidateTicketsCache();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

// --- ARCHIVOS ---

export const getTicketFiles = async (taskId: number): Promise<any[]> => {
  const token = localStorage.getItem('token');
  if (!token) return [];
  try {
    const response = await fetch(`${API_URL}/task-files/${taskId}`, { method: "GET", headers: getAuthHeaders() });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : (data.result || []); 
  } catch (error) { return []; }
};

export const uploadTicketFile = async (taskId: number, file: File): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const formData = new FormData();
    formData.append('File', file); 
    const response = await fetch(`${API_URL}/task-files/${taskId}`, {
      method: "POST",
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return response.ok;
  } catch (error) { return false; }
};
