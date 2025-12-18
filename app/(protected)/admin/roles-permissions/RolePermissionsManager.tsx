"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase/client";
import { Permission, Role, RolePermission } from "@/types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export const RolePermissionsManager = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch roles and permissions on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rolesRes, permissionsRes, rolePermissionsRes] =
          await Promise.all([
            supabase
              .from("roles")
              .select("*")
              .eq("is_active", true)
              .order("name"),
            supabase
              .from("permissions")
              .select("*")
              .order("module")
              .order("resource")
              .order("action"),
            supabase
              .from("role_permissions")
              .select("*, role:roles(*), permission:permissions(*)"),
          ]);

        if (rolesRes.error) throw rolesRes.error;
        if (permissionsRes.error) throw permissionsRes.error;
        if (rolePermissionsRes.error) throw rolePermissionsRes.error;

        setRoles(rolesRes.data || []);
        setPermissions(permissionsRes.data || []);
        setRolePermissions(rolePermissionsRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load roles and permissions");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const selectedRolePermissions = rolePermissions
    .filter((rp) => rp.role_id === selectedRoleId)
    .map((rp) => rp.permission_id);

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handlePermissionToggle = async (
    permissionId: number,
    checked: boolean
  ) => {
    if (!selectedRoleId) {
      toast.error("Please select a role first");
      return;
    }

    setSaving(true);
    try {
      if (checked) {
        // Add permission
        const { error } = await supabase.from("role_permissions").insert({
          role_id: selectedRoleId,
          permission_id: permissionId,
        });

        if (error) {
          if (error.code === "23505") {
            // Already exists, ignore
          } else {
            throw error;
          }
        } else {
          setRolePermissions([
            ...rolePermissions,
            {
              id: Date.now(), // Temporary ID
              role_id: selectedRoleId,
              permission_id: permissionId,
            } as RolePermission,
          ]);
        }
      } else {
        // Remove permission
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", selectedRoleId)
          .eq("permission_id", permissionId);

        if (error) throw error;

        setRolePermissions(
          rolePermissions.filter(
            (rp) =>
              !(
                rp.role_id === selectedRoleId &&
                rp.permission_id === permissionId
              )
          )
        );
      }
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Failed to update permission");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkToggle = async (module: string, checked: boolean) => {
    if (!selectedRoleId) {
      toast.error("Please select a role first");
      return;
    }

    const modulePermissions = groupedPermissions[module] || [];
    const toAdd = modulePermissions.filter(
      (p) => !selectedRolePermissions.includes(p.id)
    );
    const toRemove = modulePermissions.filter((p) =>
      selectedRolePermissions.includes(p.id)
    );

    setSaving(true);
    try {
      if (checked) {
        // Add all permissions in module
        if (toAdd.length > 0) {
          const { error } = await supabase.from("role_permissions").insert(
            toAdd.map((p) => ({
              role_id: selectedRoleId,
              permission_id: p.id,
            }))
          );

          if (error) throw error;

          setRolePermissions([
            ...rolePermissions,
            ...toAdd.map(
              (p) =>
                ({
                  id: Date.now() + p.id, // Temporary ID
                  role_id: selectedRoleId,
                  permission_id: p.id,
                } as RolePermission)
            ),
          ]);
        }
      } else {
        // Remove all permissions in module
        if (toRemove.length > 0) {
          const permissionIds = toRemove.map((p) => p.id);
          const { error } = await supabase
            .from("role_permissions")
            .delete()
            .eq("role_id", selectedRoleId)
            .in("permission_id", permissionIds);

          if (error) throw error;

          setRolePermissions(
            rolePermissions.filter(
              (rp) =>
                !(
                  rp.role_id === selectedRoleId &&
                  toRemove.some((p) => p.id === rp.permission_id)
                )
            )
          );
        }
      }
      toast.success(
        `Permissions ${checked ? "assigned" : "removed"} successfully`
      );
    } catch (error) {
      console.error("Error bulk updating permissions:", error);
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-4">Select Role</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roles available
                </p>
              ) : (
                roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedRoleId === role.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent border-border"
                    }`}
                  >
                    <div className="font-medium text-sm">{role.name}</div>
                    <div
                      className={`text-xs mt-1 ${
                        selectedRoleId === role.id
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {role.code}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Permissions List */}
        <div className="lg:col-span-2">
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">
                {selectedRole
                  ? `Permissions for ${selectedRole.name}`
                  : "Select a role to manage permissions"}
              </h3>
              {selectedRole && (
                <div className="text-xs text-muted-foreground">
                  {selectedRolePermissions.length} of {permissions.length}{" "}
                  permissions
                </div>
              )}
            </div>

            {!selectedRole ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>
                  Please select a role from the left to manage its permissions
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto">
                {Object.entries(groupedPermissions).map(
                  ([module, modulePerms]) => {
                    const allSelected = modulePerms.every((p) =>
                      selectedRolePermissions.includes(p.id)
                    );
                    const someSelected = modulePerms.some((p) =>
                      selectedRolePermissions.includes(p.id)
                    );

                    return (
                      <div key={module} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold uppercase">
                            {module}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={allSelected}
                              onChange={(e) =>
                                handleBulkToggle(module, e.target.checked)
                              }
                              disabled={saving}
                            />
                            <span className="text-xs text-muted-foreground">
                              Select All
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {modulePerms.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-accent/50"
                            >
                              <Checkbox
                                checked={selectedRolePermissions.includes(
                                  permission.id
                                )}
                                onChange={(e) =>
                                  handlePermissionToggle(
                                    permission.id,
                                    e.target.checked
                                  )
                                }
                                disabled={saving}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">
                                  {permission.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {permission.resource} • {permission.action}
                                </div>
                                {permission.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {permission.description}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs font-mono text-muted-foreground">
                                {permission.code}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
