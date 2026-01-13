"use client";

import { StatusBadge } from "@/components/ppmp/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppSelector } from "@/lib/redux/hook";
import { PPMPWithRelations } from "@/types/database";
import { Eye, MoreVertical, Sparkles } from "lucide-react";

type ItemType = PPMPWithRelations;

interface ListProps {
  onView?: (item: ItemType) => void;
  latestOnlyList?: ItemType[];
  versionGroups?: Map<string, ItemType[]>;
  latestVersions?: Map<string, string>;
}

export const List = ({
  onView,
  latestOnlyList,
  versionGroups,
  latestVersions,
}: ListProps) => {
  const list = useAppSelector((state) => state.list.value) as ItemType[];

  // Get display items - use latestOnlyList if provided, otherwise fall back to flat list
  const displayItems = latestOnlyList || list;

  // Helper to get all versions for a PPMP
  const getAllVersions = (item: ItemType): ItemType[] => {
    if (!versionGroups) return [item];

    // Find the root ID for this item
    let rootId = item.id;
    if (item.parent_ppmp_id) {
      // Find root by traversing up
      let current: ItemType | undefined = list.find(
        (p) => p.id === item.parent_ppmp_id
      );
      while (current) {
        const currentParentId = current.parent_ppmp_id;
        if (!currentParentId) {
          rootId = current.id;
          break;
        }
        const parent = list.find((p) => p.id === currentParentId);
        if (!parent) {
          rootId = current.id;
          break;
        }
        current = parent;
      }
    }

    const versions = versionGroups.get(rootId) || [item];
    return [...versions].sort((a, b) => a.version - b.version); // Sort oldest to newest
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isLatestVersion = (item: ItemType): boolean => {
    if (!latestVersions) return true; // If no grouping, assume all are latest
    const latestId = latestVersions.get(item.id);
    return latestId === item.id;
  };

  return (
    <div className="app__table_container">
      <div className="app__table_wrapper">
        <table className="app__table">
          <thead className="app__table_thead">
            <tr>
              <th className="app__table_th">PPMP Number</th>
              <th className="app__table_th">Project Title</th>
              <th className="app__table_th">Office/School</th>
              <th className="app__table_th">Type</th>
              <th className="app__table_th">Status</th>
              <th className="app__table_th">Fiscal Year</th>
              <th className="app__table_th">Total Budget</th>
              <th className="app__table_th_right">Actions</th>
            </tr>
          </thead>
          <tbody className="app__table_tbody">
            {displayItems.map((item: ItemType) => {
              const isLatest = isLatestVersion(item);
              const allVersions = getAllVersions(item);

              return (
                <tr key={item.id} className="app__table_tr">
                  <td className="app__table_td">
                    <div className="app__table_cell_text">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="app__table_cell_title font-mono text-sm">
                            {item.ppmp_number}
                          </div>
                          {isLatest && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0 h-5 flex items-center gap-1"
                            >
                              <Sparkles className="h-3 w-3" />
                              Latest
                            </Badge>
                          )}
                        </div>
                      </div>
                      {allVersions.length > 1 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {allVersions.map((version) => {
                            const isCurrentVersion = version.id === item.id;
                            return (
                              <button
                                key={version.id}
                                onClick={() => onView?.(version)}
                                className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                                  isCurrentVersion
                                    ? "bg-primary text-primary-foreground font-medium cursor-default"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer"
                                }`}
                                title={`View version ${version.version}`}
                              >
                                V{version.version}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="app__table_td">
                    <div className="app__table_cell_text">
                      <div className="app__table_cell_title">
                        {item.project_title || "-"}
                      </div>
                      <div className="app__table_cell_subtitle">
                        {item.project_type}
                      </div>
                    </div>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm">
                      {item.office?.name || item.school?.name || "-"}
                    </span>
                  </td>
                  <td className="app__table_td">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                      {item.ppmp_type}
                    </span>
                  </td>
                  <td className="app__table_td">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm">{item.fiscal_year}</span>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm font-medium">
                      {formatCurrency(item.total_budget_amount)}
                    </span>
                  </td>
                  <td className="app__table_td_actions">
                    <div className="app__table_action_container">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => onView?.(item)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
