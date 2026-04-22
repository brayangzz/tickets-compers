import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getLocalStorageJSON } from "../../utils/storage";
import { getUserRoleId, readStoredSession } from "../../utils/auth";

interface Props {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: Props) => {
  const { token, user, isValid } = readStoredSession();
  const rolesMap = getLocalStorageJSON<Record<string, number>>("rolesMap", {});

  if (!isValid || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleId = getUserRoleId(user);

    const allowedIds = allowedRoles
      .map((roleName) => rolesMap[roleName])
      .filter((id) => id !== undefined);

    if (allowedIds.length > 0 && !allowedIds.includes(userRoleId)) {
      return <Navigate to="/my-tasks" replace />;
    }
  }

  return <Outlet />;
};
