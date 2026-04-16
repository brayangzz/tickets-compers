import { API_BASE_URL } from "../config/api";

const API_URL = API_BASE_URL;

// --- INTERFACES ---

export interface Branch {
  iIdBranch: number;
  sBranch: string;
  bActive: boolean;
}

export interface Department {
  iIdDepartment: number;
  sDepartment: string;
  bActive: boolean;
}

export interface Status {
  iIdStatus: number;
  sStatus: string;
  bActive: boolean;
}

// Agregamos esta interfaz que faltaba
export interface TaskType {
  iIdTaskType: number;
  sTaskType: string;
  bActive: boolean;
}

// --- HELPER GENÉRICO ---

const fetchCatalog = async <T>(endpoint: string): Promise<T[]> => {
  const token = localStorage.getItem('token');
  if (!token) return [];

  try {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    if (!response.ok) throw new Error(`Error fetching ${endpoint}`);
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

// --- EXPORTACIONES ---

export const getBranches = () => fetchCatalog<Branch>("general/branches");
export const getDepartments = () => fetchCatalog<Department>("general/departments");
export const getStatuses = () => fetchCatalog<Status>("general/status");

// Esta es la función que te faltaba y causaba el error en UserDashboard:
export const getTaskTypes = () => fetchCatalog<TaskType>("general/task-types");
