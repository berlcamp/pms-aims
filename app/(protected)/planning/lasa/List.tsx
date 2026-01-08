"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppSelector } from "@/lib/redux/hook";
import { ExtendedUser } from "@/lib/redux/userSlice";
import {
  checkLasaDeletePermission,
  checkLasaEditPermission,
} from "@/lib/utils/lasa-permissions";
import { LasaRowWithRelations } from "@/types/database";
import { format } from "date-fns";
import { Eye, MoreVertical, Pencil, Trash2, Lock } from "lucide-react";

type ItemType = LasaRowWithRelations;

interface ListProps {
  onView?: (item: ItemType) => void;
  onEdit?: (item: ItemType) => void;
  onDelete?: (item: ItemType) => void;
  user?: ExtendedUser | null;
}

export const List = ({ onView, onEdit, onDelete, user }: ListProps) => {
  const list = useAppSelector((state) => state.list.value) as ItemType[];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  return (
    <div className="app__table_container">
      <div className="app__table_wrapper">
        <table className="app__table">
          <thead className="app__table_thead">
            <tr>
              <th className="app__table_th">Project Title</th>
              <th className="app__table_th">Proponent</th>
              <th className="app__table_th">Fund Source</th>
              <th className="app__table_th">Planned Amount</th>
              <th className="app__table_th">SARO Number</th>
              <th className="app__table_th">Fiscal Year</th>
              <th className="app__table_th">PPMP Link</th>
              <th className="app__table_th_right">Actions</th>
            </tr>
          </thead>
          <tbody className="app__table_tbody">
            {list.map((item: ItemType) => {
              const canEdit = checkLasaEditPermission(item, user || null);
              const canDelete = checkLasaDeletePermission(item, user || null);

              return (
                <tr key={item.id} className="app__table_tr">
                  <td className="app__table_td">
                    <div className="app__table_cell_text">
                      <div className="app__table_cell_title flex items-center gap-2">
                        {item.project_title || "-"}
                        {item.is_locked && (
                          <Lock className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                      <div className="app__table_cell_subtitle text-xs">
                        Created {formatDate(item.created_at)}
                      </div>
                    </div>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm">
                      {item.proponent?.name || "-"}
                    </span>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm">{item.fund_source}</span>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm font-medium">
                      {formatCurrency(item.planned_amount)}
                    </span>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm">{item.saro_number || "-"}</span>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm">{item.fiscal_year}</span>
                  </td>
                  <td className="app__table_td">
                    {item.ppmp ? (
                      <div className="app__table_cell_text">
                        <div className="app__table_cell_title text-xs font-mono">
                          {item.ppmp.ppmp_number}
                        </div>
                        <div className="app__table_cell_subtitle text-xs">
                          {item.ppmp.status}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
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
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => onEdit?.(item)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => onDelete?.(item)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
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
