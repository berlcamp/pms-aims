/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter as FilterIcon, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

export const Filter = ({
  filter,
  setFilter,
}: {
  filter: {
    keyword: string;
    type?: "PPMP" | "APP";
    status?: string;
    fiscalYear?: string;
  };
  setFilter: (filter: {
    keyword: string;
    type?: "PPMP" | "APP";
    status?: string;
    fiscalYear?: string;
  }) => void;
}) => {
  const [keyword, setKeyword] = useState(filter.keyword || "");
  const [type, setType] = useState<"PPMP" | "APP" | "all">(
    filter.type || "all"
  );
  const [status, setStatus] = useState(filter.status || "all");
  const [fiscalYear, setFiscalYear] = useState(filter.fiscalYear || "");
  const [isOpen, setIsOpen] = useState(false);

  // Count active filters
  const activeFilterCount =
    (keyword ? 1 : 0) +
    (type !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (fiscalYear ? 1 : 0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter({
        keyword,
        type: type !== "all" ? type : undefined,
        status: status !== "all" ? status : undefined,
        fiscalYear: fiscalYear || undefined,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, type, status, fiscalYear, setFilter]);

  const handleReset = () => {
    setKeyword("");
    setType("all");
    setStatus("all");
    setFiscalYear("");
    setFilter({
      keyword: "",
      type: undefined,
      status: undefined,
      fiscalYear: undefined,
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-gray-300 hover:bg-gray-50"
        >
          <FilterIcon className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              Search Proposals
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search by proposal number or title..."
                className="pl-9 pr-9 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 w-full"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              Type
            </label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as any)}
            >
              <SelectTrigger className="h-10 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PPMP">PPMP</SelectItem>
                <SelectItem value="APP">APP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_evaluation">
                  Under Evaluation
                </SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              Fiscal Year
            </label>
            <Input
              type="number"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              placeholder="e.g., 2025"
              className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
            />
          </div>

          {activeFilterCount > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-9 border-gray-300 hover:bg-gray-50"
              >
                <X size={14} className="mr-1.5" />
                Clear All
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
