import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";

// Páginas
import { Dashboard } from "./pages/Dashboard";
import { Users } from "./pages/Users";
import { CreateUser } from "./pages/CreateUser";
import { Tickets } from "./pages/Tickets";
import { TicketDetail } from "./pages/TicketDetail";
import { CreateTicket } from "./pages/CreateTicket";
import { UserDashboard } from "./pages/UserDashboard";
import { CreateTask } from "./pages/CreateTask";
import { TaskDetail } from "./pages/TaskDetail";
import { AssignedTasksList } from "./pages/AssignedTasksList";
import { MyAssignedTasksList } from "./pages/MyAssignedTasksList";
import { PersonalTasksList } from "./pages/PersonalTasksList";
import { CalendarPage } from "./pages/CalendarPage";
import { getLocalStorageJSON } from "./utils/storage";

// Seguridad
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// --- ENRUTADOR INTELIGENTE RAÍZ (TRAFFIC CONTROLLER) ---
// Decide qué pantalla inicial cargar según los permisos del usuario
const SmartHome = () => {
  const user = getLocalStorageJSON<{ iIdRol?: number | string; ildRol?: number | string; idRole?: number | string } | null>("user", null);
  let isPrivileged = false;
  
  if (user) {
    const userRoleId = Number(user.iIdRol || user.ildRol || user.idRole || 0);
    // Solo el ID 32 (Soporte TI) tiene acceso al Dashboard General de Tickets
    isPrivileged = [32].includes(userRoleId);
  }

  // Si es Soporte muestra el Dashboard principal, si no, lo redirige a sus tareas
  return isPrivileged ? <Dashboard /> : <Navigate to="/my-tasks" replace />;
};

export const router = createBrowserRouter([
  // 1. RUTA PÚBLICA
  {
    path: "/login",
    element: <Login />,
  },

  // 2. RUTAS PROTEGIDAS
  {
    path: "/",
    element: <ProtectedRoute />, // Guardián general (solo logueados)
    children: [
      {
        element: <AppLayout />,
        children: [
          
          // --- RUTA DE INICIO DINÁMICA ---
          { index: true, element: <SmartHome /> },

          // A) ZONA EXCLUSIVA (ADMINS / SOPORTE / DIRECCION GENERAL)
          // Aquí están las vistas de administración extra que ellos sí pueden ver
          {
            element: <ProtectedRoute allowedRoles={["SOPORTE", "DIRECCION GENERAL"]} />,
            children: [
              { path: "users", element: <Users /> },
              { path: "users/new", element: <CreateUser /> },
              { path: "reports", element: <div className="p-10 text-slate-400">🚧 Reportes</div> },
            ]
          },

          // B) ZONA COMÚN (PARA TODOS LOS LOGUEADOS)
          {
            children: [
              // --- SECCIÓN TICKETS (ACCESIBLE PARA TODOS) ---
              { path: "tickets", element: <Tickets /> },
              { path: "tickets/:id", element: <TicketDetail /> },
              { path: "tickets/new", element: <CreateTicket /> },

              // --- SECCIÓN TAREAS (ACCESIBLE PARA TODOS) ---
              { path: "my-tasks", element: <UserDashboard /> },
              { path: "my-tasks/new", element: <CreateTask /> },
              { path: "my-tasks/:id", element: <TaskDetail /> },
              { path: "my-tasks/assigned", element: <AssignedTasksList /> },
              { path: "my-tasks/delegated", element: <MyAssignedTasksList /> },
              { path: "my-tasks/personal", element: <PersonalTasksList /> },
              { path: "calendar", element: <CalendarPage /> },
              { path: "settings", element: <div className="p-10 text-slate-400">⚙️ Configuración</div> },
            ]
          }
        ]
      }
    ],
  },

  // Redirección por defecto
  { path: "*", element: <Navigate to="/login" /> }
]);
