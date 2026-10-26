type PermissionRecord = {
  id: string;
  name: string;
  description: string | null;
};

type RoleRecord = {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ permission: PermissionRecord }>;
};

type AdminRecord = {
  id: string;
  displayName: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  roles: Array<{ role: { id: string; name: string } }>;
};

export function presentAdminPermission(permission: PermissionRecord) {
  return permission;
}

export function presentAdminRole(role: RoleRecord) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.name === "SUPER_ADMIN",
    permissions: role.permissions
      .map(({ permission }) => presentAdminPermission(permission))
      .sort((left, right) => left.name.localeCompare(right.name))
  };
}

export function presentAdministratorAccess(admin: AdminRecord) {
  return {
    id: admin.id,
    displayName: admin.displayName,
    email: admin.email,
    status: admin.status,
    roles: admin.roles
      .map(({ role }) => role)
      .sort((left, right) => left.name.localeCompare(right.name))
  };
}
