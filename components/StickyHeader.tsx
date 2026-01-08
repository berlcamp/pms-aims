"use client";

import HeaderDropdown from "./HeaderDropdownMenu";
import { NotificationBell } from "./NotificationBell";
import { SidebarTrigger } from "./ui/sidebar";

export default function StickyHeader() {
  return (
    <header className="fixed w-full top-0 z-40 bg-[#2e2e30] px-2 py-px border-b border-gray-600 flex justify-start items-center gap-2">
      <SidebarTrigger />

      {/* Left section: Logo */}
      <div className="flex items-center">
        <div className="text-white font-semibold flex items-center">
          <span>PMS & AIMS</span>
        </div>
      </div>

      <div className="flex-1"></div>

      {/* Right section: Notification bell and Settings dropdown */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <HeaderDropdown />
      </div>
    </header>
  );
}
