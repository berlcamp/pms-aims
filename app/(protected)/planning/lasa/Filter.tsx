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
import { UserSelect } from "@/components/UserSelect";
import { Filter as FilterIcon, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface LasaFilter {
  keyword: string;
  fiscalYear?: number | "ALL";
  proponentId?: string | null;
}

interface FilterProps {
  filter: LasaFilter;
  setFilter: (filter: LasaFilter) => void;
  divisionId?: string;
}

const currentYear = new Date().getFullYear();
const fiscalYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

export const Filter = ({ filter, setFilter, divisionId }: FilterProps) => {
  const [keyword, setKeyword] = useState(filter.keyword || "");
  const [fiscalYear, setFiscalYear] = useState<number | "ALL">(
    filter.fiscalYear || "ALL"
  );
  const [proponentId, setProponentId] = useState<string | null>(
    filter.proponentId || null
  );
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef(filter);

  // Keep filterRef in sync with filter prop
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter({ ...filterRef.current, keyword });
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // Handle proponent change
  useEffect(() => {
    setFilter({
      ...filterRef.current,
      proponentId: proponentId || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proponentId]);

  const handleFiscalYearChange = (value: string) => {
    const year = value === "ALL" ? "ALL" : parseInt(value);
    setFiscalYear(year);
    setFilter({
      ...filterRef.current,
      fiscalYear: year === "ALL" ? undefined : year,
    });
  };

  const handleReset = () => {
    setKeyword("");
    setFiscalYear("ALL");
    setProponentId(null);
    setFilter({
      keyword: "",
    });
  };

  const activeFilterCount =
    (fiscalYear !== "ALL" ? 1 : 0) + (proponentId ? 1 : 0) + (keyword ? 1 : 0);

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
              Search LASA Rows
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search by title, fund source, or SARO number..."
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

          {/* Proponent */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              Proponent
            </label>
            <UserSelect
              value={proponentId}
              onChange={setProponentId}
              placeholder="All Proponents"
              divisionId={divisionId}
              excludedTypes={[
                "superintendent",
                "office head",
                "budget officer",
                "procurement officer",
              ]}
            />
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
