"use client";

import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Home,
  Loader2,
  Package,
  ShoppingCart,
  User,
  Users,
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
} from "@/components/ui/sidebar";
import { useAppSelector } from "@/lib/redux/hook";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import { useEffect, useState } from "react";

export function AppSidebar() {
  const user = useAppSelector((state) => state.user.user);
  const pathname = usePathname();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  // Reset loading state when pathname changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingPath(null);
  }, [pathname]);

  const handleLinkClick = (url: string) => {
    // Don't trigger if already on this page
    if (pathname === url) return;

    // Start progress bar and set loading state
    NProgress.start();
    setLoadingPath(url);
  };

  // Menu items.
  const allItems = [
    {
      title: "Home",
      url: "/home",
      icon: Home,
    },
    {
      title: "Procurement Planning",
      url: "/procurement/planning",
      icon: FileText,
    },
    {
      title: "Purchase Requests",
      url: "/procurement/pr",
      icon: ShoppingCart,
    },
    {
      title: "Purchase Orders",
      url: "/procurement/po",
      icon: Package,
    },
    {
      title: "Suppliers",
      url: "/procurement/suppliers",
      icon: Users,
    },
    {
      title: "Evaluation",
      url: "/procurement/evaluation",
      icon: ClipboardCheck,
    },
    {
      title: "Reports",
      url: "/procurement/reports",
      icon: BarChart3,
    },
  ];

  // Filter items for cashier users - only show Home and Retail Transactions
  const items =
    user?.type === "cashier"
      ? allItems.filter((item) => item.url === "/home")
      : allItems;

  const allSettingItems = [
    {
      title: "Staff",
      url: "/staff",
      icon: User,
    },
  ];

  // Filter items for cashier users - only show Home and Retail Transactions
  const settingItems =
    user?.type !== "super admin"
      ? allSettingItems.filter((item) => item.url !== "/branches")
      : allSettingItems;

  return (
    <Sidebar className="pt-13 border-r border-border/40">
      <SidebarContent className="bg-gradient-to-b from-background via-background to-muted/20 backdrop-blur-sm">
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => {
                const isActive = pathname === item.url;
                const isLoading = loadingPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        onClick={() => handleLinkClick(item.url)}
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ease-out",
                          "hover:bg-accent/50 hover:shadow-sm",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          isLoading && "opacity-60 cursor-wait",
                          isActive
                            ? "bg-accent text-accent-foreground shadow-sm font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}

                        <div
                          className={cn(
                            "flex items-center justify-center transition-transform duration-200",
                            isActive && "scale-110"
                          )}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          ) : (
                            <item.icon
                              className={cn(
                                "h-4 w-4 transition-colors duration-200",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-foreground"
                              )}
                            />
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-sm transition-colors duration-200",
                            isActive && "font-semibold"
                          )}
                        >
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

        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent className="pb-0">
            <SidebarMenu className="space-y-1">
              {settingItems
                .filter((item) => {
                  // Only show branches for super admin
                  if (item.url === "/branches") {
                    return user?.type === "super admin";
                  }
                  return true;
                })
                .map((item) => {
                  const isActive = pathname === item.url;
                  const isLoading = loadingPath === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          href={item.url}
                          onClick={() => handleLinkClick(item.url)}
                          className={cn(
                            "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ease-out",
                            "hover:bg-accent/50 hover:shadow-sm",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isLoading && "opacity-60 cursor-wait",
                            isActive
                              ? "bg-accent text-accent-foreground shadow-sm font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {/* Active indicator bar */}
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                          )}

                          <div
                            className={cn(
                              "flex items-center justify-center transition-transform duration-200",
                              isActive && "scale-110"
                            )}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 text-primary animate-spin" />
                            ) : (
                              <item.icon
                                className={cn(
                                  "h-4 w-4 transition-colors duration-200",
                                  isActive
                                    ? "text-primary"
                                    : "text-muted-foreground group-hover:text-foreground"
                                )}
                              />
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-sm transition-colors duration-200",
                              isActive && "font-semibold"
                            )}
                          >
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
