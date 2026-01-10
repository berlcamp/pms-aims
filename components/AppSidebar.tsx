"use client";

import {
  Building2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Home,
  ListCheck,
  Loader2,
  School,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useAppSelector } from "@/lib/redux/hook";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import { useEffect, useMemo, useState } from "react";

export function AppSidebar() {
  const pathname = usePathname();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const user = useAppSelector((state) => state.user.user);

  // Check if we're on an organization submenu page
  const isOnOrganizationPage =
    pathname?.startsWith("/organization/schools") ||
    pathname?.startsWith("/organization/division-offices") ||
    pathname?.startsWith("/organization/offices");

  // Initialize organization submenu as open if on organization pages, otherwise closed
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(
    isOnOrganizationPage || false
  );

  // Reset loading state when pathname changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingPath(null);
  }, [pathname]);

  // Auto-expand Organization submenu if on Schools or Division Offices pages
  useEffect(() => {
    if (isOnOrganizationPage && !isOrganizationOpen) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setIsOrganizationOpen(true);
    }
  }, [isOnOrganizationPage, isOrganizationOpen]);

  const handleLinkClick = (url: string) => {
    // Don't trigger if already on this page
    if (pathname === url) return;

    // Start progress bar and set loading state
    NProgress.start();
    setLoadingPath(url);
  };

  // Navigation items
  const navItems = [
    {
      title: "Home",
      url: "/home",
      icon: Home,
    },
  ];

  // Check if user can access LASA (Budget Officer functionality)
  // Only budget officer can access LASA
  const isBudgetOfficer = useMemo(() => {
    if (!user) return false;
    return user.type === "budget officer" || user.type === "super admin";
  }, [user]);

  const planningItems = useMemo(() => {
    return [
      {
        title: "PPMP",
        url: "/planning/ppmp",
        icon: ListCheck,
      },
    ];
  }, []);

  const budgetItems = useMemo(() => {
    if (!isBudgetOfficer) return [];
    return [
      {
        title: "LASA (Budget Visibility)",
        url: "/budget/lasa",
        icon: ListCheck,
      },
      {
        title: "Budget Allocations",
        url: "/budget/budget-allocations",
        icon: DollarSign,
      },
    ];
  }, [isBudgetOfficer]);

  // Check if user can access User Accounts (Super Admin or Admin only)
  const isAdminOrSuperAdmin = useMemo(() => {
    if (!user) return false;
    return user.type === "super admin" || user.type === "admin";
  }, [user]);

  // Settings items
  const settingItems = useMemo(() => {
    const items: Array<{
      title: string;
      url: string;
      icon: typeof User;
    }> = [];

    // Only show User Accounts if user is super admin or admin
    if (isAdminOrSuperAdmin) {
      items.push({
        title: "User Accounts",
        url: "/staff",
        icon: User,
      });
    }

    return items;
  }, [isAdminOrSuperAdmin]);

  // Organization submenu items
  const organizationSubItems = [
    {
      title: "Schools",
      url: "/organization/schools",
      icon: School,
    },
    {
      title: "Offices",
      url: "/organization/offices",
      icon: Building2,
    },
  ];

  // Check if any organization submenu item is active
  const isOrganizationSubItemActive = organizationSubItems.some(
    (item) => pathname === item.url
  );

  return (
    <Sidebar className="pt-11 border-r border-gray-700/50">
      <SidebarContent className="bg-[#282828]">
        {/* Navigation Section */}
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.url;
                const isLoading = loadingPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        onClick={() => handleLinkClick(item.url)}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          "hover:!bg-[#383838]",
                          "focus-visible:outline-none",
                          isLoading && "opacity-60 cursor-wait",
                          isActive
                            ? "bg-[#383838] text-white"
                            : "text-white/90 hover:text-white"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                        ) : (
                          <item.icon
                            className={cn(
                              "h-4 w-4 transition-colors duration-200",
                              isActive
                                ? "text-white"
                                : "text-white/70 group-hover:text-white"
                            )}
                          />
                        )}
                        <span className="text-sm transition-colors duration-200">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Projects Section */}
        <SidebarGroup className="px-2 py-4 relative">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-white uppercase tracking-wider">
            Procument Planning
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {planningItems.map((item) => {
                const isActive = pathname === item.url;
                const isLoading = loadingPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        onClick={() => handleLinkClick(item.url)}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          "hover:!bg-[#383838]",
                          "focus-visible:outline-none",
                          isLoading && "opacity-60 cursor-wait",
                          isActive
                            ? "bg-[#383838] text-white"
                            : "text-white/90 hover:text-white"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                        ) : (
                          <item.icon
                            className={cn(
                              "h-4 w-4 transition-colors duration-200",
                              isActive
                                ? "text-white"
                                : "text-white/70 group-hover:text-white"
                            )}
                          />
                        )}
                        <span className="text-sm transition-colors duration-200">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Budget Planning Section */}
        {isBudgetOfficer && (
          <SidebarGroup className="px-2 py-4 relative">
            <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-white uppercase tracking-wider">
              Budget Planning
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {budgetItems.map((item) => {
                  const isActive = pathname === item.url;
                  const isLoading = loadingPath === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          href={item.url}
                          onClick={() => handleLinkClick(item.url)}
                          className={cn(
                            "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                            "hover:!bg-[#383838]",
                            "focus-visible:outline-none",
                            isLoading && "opacity-60 cursor-wait",
                            isActive
                              ? "bg-[#383838] text-white"
                              : "text-white/90 hover:text-white"
                          )}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                          ) : (
                            <item.icon
                              className={cn(
                                "h-4 w-4 transition-colors duration-200",
                                isActive
                                  ? "text-white"
                                  : "text-white/70 group-hover:text-white"
                              )}
                            />
                          )}
                          <span className="text-sm transition-colors duration-200">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Settings Section */}
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent className="pb-0">
            <SidebarMenu className="space-y-1">
              {/* Organization Menu Item with Submenu */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsOrganizationOpen(!isOrganizationOpen)}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:!bg-[#383838]",
                    "focus-visible:outline-none",
                    isOrganizationSubItemActive || isOrganizationOpen
                      ? "bg-[#383838] text-white"
                      : "text-white/90 hover:text-white"
                  )}
                >
                  <Building2
                    className={cn(
                      "h-4 w-4 transition-colors duration-200 flex-shrink-0",
                      isOrganizationSubItemActive || isOrganizationOpen
                        ? "text-white"
                        : "text-white/70 group-hover:text-white"
                    )}
                  />
                  <span className="text-sm font-medium transition-colors duration-200 flex-1">
                    Organization
                  </span>
                  <div className="flex-shrink-0 transition-transform duration-300 ease-in-out">
                    {isOrganizationOpen ? (
                      <ChevronDown className="h-4 w-4 text-white/70 group-hover:text-white" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white" />
                    )}
                  </div>
                </SidebarMenuButton>
                {isOrganizationOpen && (
                  <SidebarMenuSub className="mt-1.5 ml-2 pl-2 border-l border-white/10">
                    {organizationSubItems.map((subItem) => {
                      const isSubActive = pathname === subItem.url;
                      const isSubLoading = loadingPath === subItem.url;
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isSubActive}>
                            <Link
                              href={subItem.url}
                              onClick={() => handleLinkClick(subItem.url)}
                              className={cn(
                                "group relative flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-md transition-all duration-200",
                                "hover:!bg-[#383838]",
                                "focus-visible:outline-none",
                                isSubLoading && "opacity-60 cursor-wait",
                                isSubActive
                                  ? "!bg-[#383838] !text-white"
                                  : "text-white/75 hover:text-white hover:bg-white/5"
                              )}
                            >
                              {/* Active indicator bar */}
                              {isSubActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full" />
                              )}
                              {isSubLoading ? (
                                <Loader2 className="h-3.5 w-3.5 text-white/70 animate-spin flex-shrink-0" />
                              ) : (
                                <subItem.icon className="h-3.5 w-3.5 !text-white flex-shrink-0" />
                              )}
                              <span
                                className={cn(
                                  "text-sm transition-colors duration-200",
                                  isSubActive && "!text-white"
                                )}
                              >
                                {subItem.title}
                              </span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {settingItems.map((item) => {
                const isActive = pathname === item.url;
                const isLoading = loadingPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        onClick={() => handleLinkClick(item.url)}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          "hover:!bg-[#383838]",
                          "focus-visible:outline-none",
                          isLoading && "opacity-60 cursor-wait",
                          isActive
                            ? "bg-[#383838] text-white hover:text-white"
                            : "text-white/90 hover:text-white"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                        ) : (
                          <item.icon
                            className={cn(
                              "h-4 w-4 transition-colors duration-200",
                              isActive
                                ? "text-white"
                                : "text-white/70 group-hover:text-white"
                            )}
                          />
                        )}
                        <span className="text-sm transition-colors duration-200">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
