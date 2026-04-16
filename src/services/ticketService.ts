import { API_BASE_URL } from "../config/api";

const API_URL = API_BASE_URL;

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

// --- CRUD PRINCIPAL ---

export const getTickets = async (): Promise<Ticket[]> => {
  const token = localStorage.getItem('token');
  if (!token) return [];
  try {
    const response = await fetch(`${API_URL}/tickets`, { method: "GET", headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Error");
    return await response.json();
  } catch (error) { return []; }
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
    return data.result || data; 
  } catch (error) { return null; }
};

export const updateTicket = async (id: number, data: any): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const response = await fetch(`${API_URL}/tickets/${id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(data) });
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
