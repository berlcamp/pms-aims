"use client";

import Notfoundpage from "@/components/Notfoundpage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/lib/redux/hook";
import { useState } from "react";
import { PermissionsList } from "./PermissionsList";
import { RolePermissionsManager } from "./RolePermissionsManager";
import { RolesList } from "./RolesList";

export default function Page() {
  const user = useAppSelector((state) => state.user.user);
  const [activeTab, setActiveTab] = useState("roles");

  // Access control - only admin users can access this page
  if (user?.type !== "super admin") {
    return <Notfoundpage />;
  }

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text">Roles & Permissions</h1>
      </div>
      <div className="app__content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="assignments">Role Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-0">
            <RolesList />
          </TabsContent>

          <TabsContent value="permissions" className="mt-0">
            <PermissionsList />
          </TabsContent>

          <TabsContent value="assignments" className="mt-0">
            <RolePermissionsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
