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
import { PPMPStatus, PPMPType } from "@/types/database";
import { Filter as FilterIcon, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

export interface PPMPFilter {
  keyword: string;
  status?: PPMPStatus | "ALL";
  fiscalYear?: number | "ALL";
  ppmpType?: PPMPType | "ALL";
  officeId?: string | "ALL";
  schoolId?: string | "ALL";
}

interface FilterProps {
  filter: PPMPFilter;
  setFilter: (filter: PPMPFilter) => void;
  availableOffices?: Array<{ id: string; name: string }>;
  availableSchools?: Array<{ id: string; name: string }>;
}

const currentYear = new Date().getFullYear();
const fiscalYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

export const Filter = ({
  filter,
  setFilter,
  availableOffices = [],
  availableSchools = [],
}: FilterProps) => {
  const [keyword, setKeyword] = useState(filter.keyword || "");
  const [status, setStatus] = useState<PPMPStatus | "ALL">(
    filter.status || "ALL"
  );
  const [fiscalYear, setFiscalYear] = useState<number | "ALL">(
    filter.fiscalYear || "ALL"
  );
  const [ppmpType, setPpmpType] = useState<PPMPType | "ALL">(
    filter.ppmpType || "ALL"
  );
  const [officeId, setOfficeId] = useState<string | "ALL">(
    filter.officeId || "ALL"
  );
  const [schoolId, setSchoolId] = useState<string | "ALL">(
    filter.schoolId || "ALL"
  );
  const [isOpen, setIsOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter({ ...filter, keyword });
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleStatusChange = (value: PPMPStatus | "ALL") => {
    setStatus(value);
    setFilter({ ...filter, status: value === "ALL" ? undefined : value });
  };

  const handleFiscalYearChange = (value: string) => {
    const year = value === "ALL" ? "ALL" : parseInt(value);
    setFiscalYear(year);
    setFilter({
      ...filter,
      fiscalYear: year === "ALL" ? undefined : year,
    });
  };

  const handlePpmpTypeChange = (value: PPMPType | "ALL") => {
    setPpmpType(value);
    setFilter({ ...filter, ppmpType: value === "ALL" ? undefined : value });
  };

  const handleOfficeChange = (value: string) => {
    setOfficeId(value);
    setFilter({
      ...filter,
      officeId: value === "ALL" ? undefined : value,
      schoolId: undefined, // Reset school when office changes
    });
    setSchoolId("ALL");
  };

  const handleSchoolChange = (value: string) => {
    setSchoolId(value);
    setFilter({
      ...filter,
      schoolId: value === "ALL" ? undefined : value,
    });
  };

  const handleReset = () => {
    setKeyword("");
    setStatus("ALL");
    setFiscalYear("ALL");
    setPpmpType("ALL");
    setOfficeId("ALL");
    setSchoolId("ALL");
    setFilter({
      keyword: "",
    });
  };

  const activeFilterCount =
    (status !== "ALL" ? 1 : 0) +
    (fiscalYear !== "ALL" ? 1 : 0) +
    (ppmpType !== "ALL" ? 1 : 0) +
    (officeId !== "ALL" ? 1 : 0) +
    (schoolId !== "ALL" ? 1 : 0) +
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
              Search PPMPs
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search by title or number..."
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

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              Status
            </label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="FOR_APPROVAL">For Approval</SelectItem>
                <SelectItem value="APPROVED_BY_OFFICE">
                  Approved by Office
                </SelectItem>
                <SelectItem value="SUBMITTED_TO_PROCUREMENT">
                  Submitted to Procurement
                </SelectItem>
                <SelectItem value="CONSOLIDATED">Consolidated</SelectItem>
                <SelectItem value="RETURNED_FOR_REVISION">
                  Returned for Revision
                </SelectItem>
              </SelectContent>
            </Select>
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

          {/* PPMP Type */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              PPMP Type
            </label>
            <Select value={ppmpType} onValueChange={handlePpmpTypeChange}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INDICATIVE">Indicative</SelectItem>
                <SelectItem value="FINAL">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Office */}
          {availableOffices.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Office
              </label>
              <Select value={officeId} onValueChange={handleOfficeChange}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Offices</SelectItem>
                  {availableOffices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* School */}
          {availableSchools.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                School
              </label>
              <Select value={schoolId} onValueChange={handleSchoolChange}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Schools</SelectItem>
                  {availableSchools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
