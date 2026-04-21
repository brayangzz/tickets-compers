import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { getLocalStorageJSON } from "./utils/storage";
import { Login } from "./pages/Login";

// Seguridad
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Paginas (lazy)
const Dashboard = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const Users = lazy(() => import("./pages/Users").then((module) => ({ default: module.Users })));
const CreateUser = lazy(() => import("./pages/CreateUser").then((module) => ({ default: module.CreateUser })));
const Tickets = lazy(() => import("./pages/Tickets").then((module) => ({ default: module.Tickets })));
const TicketDetail = lazy(() => import("./pages/TicketDetail").then((module) => ({ default: module.TicketDetail })));
const CreateTicket = lazy(() => import("./pages/CreateTicket").then((module) => ({ default: module.CreateTicket })));
const UserDashboard = lazy(() => import("./pages/UserDashboard").then((module) => ({ default: module.UserDashboard })));
const CreateTask = lazy(() => import("./pages/CreateTask").then((module) => ({ default: module.CreateTask })));
const TaskDetail = lazy(() => import("./pages/TaskDetail").then((module) => ({ default: module.TaskDetail })));
const AssignedTasksList = lazy(() => import("./pages/AssignedTasksList").then((module) => ({ default: module.AssignedTasksList })));
const MyAssignedTasksList = lazy(() => import("./pages/MyAssignedTasksList").then((module) => ({ default: module.MyAssignedTasksList })));
const PersonalTasksList = lazy(() => import("./pages/PersonalTasksList").then((module) => ({ default: module.PersonalTasksList })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then((module) => ({ default: module.CalendarPage })));

const RouteFallback = () => (
  <div className="min-h-[320px] w-full flex items-center justify-center">
    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-semibold">
      <span
        aria-hidden="true"
        className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-2 border-slate-300 border-t-slate-500 dark:border-slate-700 dark:border-t-slate-300"
      />
      Cargando...
    </div>
  </div>
);

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>
    {element}
  </Suspense>
);

// --- ENRUTADOR INTELIGENTE RAIZ (TRAFFIC CONTROLLER) ---
// Decide que pantalla inicial cargar segun los permisos del usuario
const SmartHome = () => {
  const user = getLocalStorageJSON<{ iIdRol?: number | string; ildRol?: number | string; idRole?: number | string } | null>("user", null);
  let isPrivileged = false;

  if (user) {
    const userRoleId = Number(user.iIdRol || user.ildRol || user.idRole || 0);
    // Solo el ID 32 (Soporte TI) tiene acceso al Dashboard General de Tickets
    isPrivileged = [32].includes(userRoleId);
  }

  // Si es Soporte muestra el Dashboard principal, si no, lo redirige a sus tareas
  return isPrivileged ? withSuspense(<Dashboard />) : <Navigate to="/my-tasks" replace />;
};

export const router = createBrowserRouter([
  // 1. RUTA PUBLICA
  {
    path: "/login",
    element: <Login />,
  },

  // 2. RUTAS PROTEGIDAS
  {
    path: "/",
    element: <ProtectedRoute />, // Guardian general (solo logueados)
    children: [
      {
        element: <AppLayout />,
        children: [

          // --- RUTA DE INICIO DINAMICA ---
          { index: true, element: <SmartHome /> },

          // A) ZONA EXCLUSIVA (ADMINS / SOPORTE / DIRECCION GENERAL)
          // Aqui estan las vistas de administracion extra que ellos si pueden ver
          {
            element: <ProtectedRoute allowedRoles={["SOPORTE", "DIRECCION GENERAL"]} />,
            children: [
              { path: "users", element: withSuspense(<Users />) },
              { path: "users/new", element: withSuspense(<CreateUser />) },
              { path: "reports", element: <div className="p-10 text-slate-400">🚧 Reportes</div> },
            ]
          },

          // B) ZONA COMUN (PARA TODOS LOS LOGUEADOS)
          {
            children: [
              // --- SECCION TICKETS (ACCESIBLE PARA TODOS) ---
              { path: "tickets", element: withSuspense(<Tickets />) },
              { path: "tickets/:id", element: withSuspense(<TicketDetail />) },
              { path: "tickets/new", element: withSuspense(<CreateTicket />) },

              // --- SECCION TAREAS (ACCESIBLE PARA TODOS) ---
              { path: "my-tasks", element: withSuspense(<UserDashboard />) },
              { path: "my-tasks/new", element: withSuspense(<CreateTask />) },
              { path: "my-tasks/:id", element: withSuspense(<TaskDetail />) },
              { path: "my-tasks/assigned", element: withSuspense(<AssignedTasksList />) },
              { path: "my-tasks/delegated", element: withSuspense(<MyAssignedTasksList />) },
              { path: "my-tasks/personal", element: withSuspense(<PersonalTasksList />) },
              { path: "calendar", element: withSuspense(<CalendarPage />) },
              { path: "settings", element: <div className="p-10 text-slate-400">⚙️ Configuración</div> },
            ]
          }
        ]
      }
    ],
  },

  // Redireccion por defecto
  { path: "*", element: <Navigate to="/login" /> }
]);
