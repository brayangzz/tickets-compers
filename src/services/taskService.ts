import { API_BASE_URL } from "../config/api";

const API_URL = API_BASE_URL;

export interface PersonalTask {
  iIdTask: number;
  sName?: string;
  iIdTaskType: number;
  sDescription: string;
  iIdStatus: number;       
  iIdUserRaisedTask: number;
  dTaskStartDate: string | null;
  dTaskCompletionDate: string | null;
  bActive: boolean;
  dDateUserCreate: string;
  iIdUserCreate: number; 
  iIdBranch: number | null;
  iIdDepartment: number | null;
}

export interface CreateTaskPayload {
  sName: string; // <--- AÑADIDO: Título de la tarea
  sDescription: string;
  iIdTaskType: number;
  iIdStatus: number;
  dTaskStartDate: string;
}

// Interfaz para actualizar (Basada en tu Postman)
export interface UpdateTaskPayload {
  sName?: string;
  sDescription: string;
  iIdStatus: number;
  dTaskCompletionDate?: string | null;
  iIdTaskType?: number;
  dTaskStartDate?: string | null;
  iIdTask?: number;
  iIdUserRaisedTask?: number;
  iIdUserCreate?: number;
  iIdBranch?: number | null;
  iIdDepartment?: number | null;
  ildTaskType?: number;
  ildStatus?: number;
  ildTask?: number;
  ildUserRaisedTask?: number;
  ildUserCreate?: number;
  ildBranch?: number | null;
  ildDepartment?: number | null;
  bActive: boolean;
}

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
});

const normalizeText = (value?: string | null) => (value || "").trim();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const matchesExpectedTaskData = (task: PersonalTask, payload: UpdateTaskPayload) => {
  const sameName = payload.sName === undefined || normalizeText(task.sName) === normalizeText(payload.sName);
  const sameDescription = normalizeText(task.sDescription) === normalizeText(payload.sDescription);
  const sameStatus = Number(task.iIdStatus) === Number(payload.iIdStatus);
  return sameName && sameDescription && sameStatus;
};

const getPersonalTaskById = async (id: number, token: string): Promise<PersonalTask | null> => {
  try {
    const response = await fetch(`${API_URL}/tasks/personal`, {
      method: "GET",
      headers: getAuthHeaders(token),
      cache: "no-store"
    });
    if (!response.ok) return null;
    const data = await response.json();
    const list = Array.isArray(data) ? data : [];
    return list.find((task: PersonalTask) => task.iIdTask === id) || null;
  } catch {
    return null;
  }
};

const withLegacyAliases = (payload: UpdateTaskPayload): UpdateTaskPayload => ({
  ...payload,
  ildTaskType: payload.iIdTaskType,
  ildStatus: payload.iIdStatus,
  ildTask: payload.iIdTask,
  ildUserRaisedTask: payload.iIdUserRaisedTask,
  ildUserCreate: payload.iIdUserCreate,
  ildBranch: payload.iIdBranch,
  ildDepartment: payload.iIdDepartment
});

const parsePossibleBooleanResponse = (raw: string) => {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "true" || trimmed === "false") return trimmed === "true";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "boolean") return parsed;
    if (typeof parsed?.success === "boolean") return parsed.success;
    if (typeof parsed?.result === "boolean") return parsed.result;
  } catch {
    return null;
  }
  return null;
};

const buildTicketFallbackPayload = (payload: UpdateTaskPayload) => ({
  sName: payload.sName || "",
  sDescription: payload.sDescription,
  iIdStatus: payload.iIdStatus,
  iIdBranch: payload.iIdBranch ?? 0,
  iIdDepartment: payload.iIdDepartment ?? 0,
  dTaskCompletionDate: payload.dTaskCompletionDate ?? null,
  bActive: payload.bActive
});

export const getPersonalTasks = async (): Promise<PersonalTask[]> => {
  const token = localStorage.getItem('token');
  if (!token) return [];

  try {
    const response = await fetch(`${API_URL}/tasks/personal`, {
      method: "GET",
      headers: getAuthHeaders(token),
      cache: "no-store"
    });

    if (!response.ok) throw new Error("Error al obtener tareas");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

// --- CORRECCIÓN: Ahora devuelve <any> (el JSON de la API) en lugar de <boolean> ---
export const createPersonalTask = async (task: CreateTaskPayload): Promise<any> => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/tasks/personal`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(task)
    });

    if (!response.ok) throw new Error("Error al crear tarea");
    
    // IMPORTANTE: Extraemos y retornamos el JSON con los datos (y el ID) de la nueva tarea
    const data = await response.json();
    return data.result || data; 

  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updatePersonalTask = async (id: number, payload: UpdateTaskPayload): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const normalizedPayload = { ...payload, iIdTask: payload.iIdTask ?? id };
    const payloadWithAliases = withLegacyAliases(normalizedPayload);
    const ticketFallbackPayload = buildTicketFallbackPayload(normalizedPayload);

    const attempts: Array<{ label: string; execute: () => Promise<Response> }> = [
      {
        label: "put-standard-json",
        execute: () => fetch(`${API_URL}/tasks/personal/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(token),
          body: JSON.stringify(normalizedPayload)
        })
      },
      {
        label: "put-legacy-json",
        execute: () => fetch(`${API_URL}/tasks/personal/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(token),
          body: JSON.stringify(payloadWithAliases)
        })
      },
      {
        label: "put-ticket-fallback-json",
        execute: () => fetch(`${API_URL}/tickets/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(token),
          body: JSON.stringify(ticketFallbackPayload)
        })
      }
    ];

    for (const attempt of attempts) {
      const response = await attempt.execute();

      if (!response.ok) {
        console.warn(`[updatePersonalTask] intento ${attempt.label} falló con status ${response.status}`);
        continue;
      }

      const rawResponse = await response.text();
      const parsedBoolean = parsePossibleBooleanResponse(rawResponse);
      if (parsedBoolean === false) {
        console.warn(`[updatePersonalTask] intento ${attempt.label} respondió false explícito:`, rawResponse);
        continue;
      }

      // Damos un margen corto para backend con persistencia eventual.
      for (let i = 0; i < 6; i += 1) {
        if (i > 0) await sleep(350);
        const updatedTask = await getPersonalTaskById(id, token);
        if (!updatedTask || matchesExpectedTaskData(updatedTask, normalizedPayload)) {
          return true;
        }
      }

      console.warn(`[updatePersonalTask] intento ${attempt.label} respondió ok, pero sin reflejar cambios aún. Respuesta:`, rawResponse);
    }

    console.error("La API respondió sin error, pero no reflejó los cambios esperados para la tarea:", id);
    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const deletePersonalTask = async (id: number): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/tasks/personal/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(token),
    });

    if (!response.ok) throw new Error("Error al eliminar tarea");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};


export const createAssignedTask = async (payload: any) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tasks/assigned`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.result || data;
        }
        return null;
    } catch (error) {
        console.error("Error asignando tarea:", error);
        return null;
    }
};
