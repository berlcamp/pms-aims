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
import { getLasaRows } from "@/lib/services/lasa";
import { LasaRowWithRelations } from "@/types/database";
import { Filter as FilterIcon, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface BudgetAllocationFilter {
  keyword: string;
  fiscalYear?: number | "ALL";
  status?: "draft" | "active" | "closed" | "ALL";
  lasaId?: string | null;
}

interface FilterProps {
  filter: BudgetAllocationFilter;
  setFilter: (filter: BudgetAllocationFilter) => void;
  divisionId?: string;
}

const currentYear = new Date().getFullYear();
const fiscalYears = Array.from({ length: 5 }, (_, i) => currentYear + i);

export const Filter = ({ filter, setFilter, divisionId }: FilterProps) => {
  const [keyword, setKeyword] = useState(filter.keyword || "");
  const [fiscalYear, setFiscalYear] = useState<number | "ALL">(
    filter.fiscalYear || "ALL"
  );
  const [status, setStatus] = useState<"draft" | "active" | "closed" | "ALL">(
    filter.status || "ALL"
  );
  const [lasaId, setLasaId] = useState<string | null>(filter.lasaId || null);
  const [lasaOptions, setLasaOptions] = useState<LasaRowWithRelations[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef(filter);

  // Keep filterRef in sync with filter prop
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  // Fetch LASA options
  useEffect(() => {
    const fetchLasaOptions = async () => {
      if (!divisionId) return;
      try {
        const data = await getLasaRows({
          divisionId,
        });
        setLasaOptions(data || []);
      } catch (error) {
        console.error("Failed to fetch LASA options:", error);
      }
    };
    fetchLasaOptions();
  }, [divisionId]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter({ ...filterRef.current, keyword });
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // Handle fiscal year change
  const handleFiscalYearChange = (value: string) => {
    const year = value === "ALL" ? "ALL" : parseInt(value);
    setFiscalYear(year);
    setFilter({
      ...filterRef.current,
      fiscalYear: year === "ALL" ? undefined : year,
    });
  };

  // Handle status change
  const handleStatusChange = (value: string) => {
    const statusValue =
      value === "ALL"
        ? "ALL"
        : (value as "draft" | "active" | "closed" | "ALL");
    setStatus(statusValue);
    setFilter({
      ...filterRef.current,
      status: statusValue === "ALL" ? undefined : statusValue,
    });
  };

  // Handle LASA change
  useEffect(() => {
    setFilter({
      ...filterRef.current,
      lasaId: lasaId || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lasaId]);

  const handleReset = () => {
    setKeyword("");
    setFiscalYear("ALL");
    setStatus("ALL");
    setLasaId(null);
    setFilter({
      keyword: "",
    });
  };

  const activeFilterCount =
    (fiscalYear !== "ALL" ? 1 : 0) +
    (status !== "ALL" ? 1 : 0) +
    (lasaId ? 1 : 0) +
    (keyword ? 1 : 0);

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
          {/* Search */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              Search Budget Allocations
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search by name, fund source, or remarks..."
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

          {/* Fiscal Year */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              Fiscal Year
            </label>
            <Select
              value={fiscalYear === "ALL" ? "ALL" : String(fiscalYear)}
              onValueChange={handleFiscalYearChange}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Years</SelectItem>
                {fiscalYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              Status
            </label>
            <Select
              value={status === "ALL" ? "ALL" : status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* LASA */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              LASA
            </label>
            <Select
              value={lasaId || "ALL"}
              onValueChange={(value) =>
                setLasaId(value === "ALL" ? null : value)
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All LASA</SelectItem>
                {lasaOptions.map((lasa) => (
                  <SelectItem key={lasa.id} value={lasa.id}>
                    {lasa.project_title} ({lasa.fiscal_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Button */}
          {activeFilterCount > 0 && (
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-9 border-gray-300 hover:bg-gray-50"
              >
                <X size={14} className="mr-1.5" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
