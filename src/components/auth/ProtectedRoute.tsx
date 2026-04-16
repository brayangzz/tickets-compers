import React from 'react';
import { Navigate, Outlet } from "react-router-dom";
import { clearAuthStoragePreserveTheme, getLocalStorageJSON } from "../../utils/storage";

interface Props {
  allowedRoles?: string[]; 
}

type ProtectedUser = {
  iIdRol?: number | string;
  ildRol?: number | string;
  idRole?: number | string;
};

export const ProtectedRoute = ({ allowedRoles }: Props) => {
  // 1. LEER DATOS CON LAS LLAVES CORRECTAS
  // Ahora usamos 'user' (que es lo que guarda el Login corregido)
  const token = localStorage.getItem('token');

  const user = getLocalStorageJSON<ProtectedUser | null>('user', null);
  const rolesMap = getLocalStorageJSON<Record<string, number>>('rolesMap', {});

  // 2. VERIFICACIÓN DE SESIÓN
  // Si no hay token o no hay datos de usuario, mandar al Login
  if (!token || !user) {
    // Limpieza de seguridad por si quedó basura a medias
    clearAuthStoragePreserveTheme();
    return <Navigate to="/login" replace />;
  }

  // 3. VERIFICACIÓN DE ROLES
  if (allowedRoles && allowedRoles.length > 0) {
    // A) Obtener el ID del Rol del usuario de forma segura
    // Tu API devuelve 'iIdRol' o 'ildRol' (según tus capturas)
    const userRoleId = Number(user.iIdRol || user.ildRol || user.idRole || 0);

    // B) Convertir los nombres permitidos (ej: "SOPORTE") a IDs (ej: 32)
    const allowedIds = allowedRoles
        .map(roleName => rolesMap[roleName]) // Busca en el mapa
        .filter(id => id !== undefined);     // Elimina los no encontrados

    // C) Validar
    // Si tenemos roles permitidos definidos, pero el usuario no tiene uno de ellos...
    if (allowedIds.length > 0 && !allowedIds.includes(userRoleId)) {
      // Redirigir a una zona segura genérica
      return <Navigate to="/my-tasks" replace />;
    }
  }

  // 4. ACCESO CONCEDIDO
  return <Outlet />;
};
