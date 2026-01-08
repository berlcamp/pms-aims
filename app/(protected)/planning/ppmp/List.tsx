"use client";

import { StatusBadge } from "@/components/ppmp/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppSelector } from "@/lib/redux/hook";
import { PPMPWithRelations } from "@/types/database";
import { format } from "date-fns";
import { Eye, FileText, MoreVertical, Pencil } from "lucide-react";

type ItemType = PPMPWithRelations;

interface ListProps {
  onView?: (item: ItemType) => void;
  onEdit?: (item: ItemType) => void;
  onPrint?: (item: ItemType) => void;
}

export const List = ({ onView, onEdit, onPrint }: ListProps) => {
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
            {list.map((item: ItemType) => (
              <tr key={item.id} className="app__table_tr">
                <td className="app__table_td">
                  <div className="app__table_cell_text">
                    <div className="app__table_cell_title font-mono text-sm">
                      {item.ppmp_number}
                    </div>
                    <div className="app__table_cell_subtitle text-xs">
                      v{item.version}
                    </div>
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
                        {item.status === "DRAFT" && !item.is_locked && (
                          <DropdownMenuItem
                            onClick={() => onEdit?.(item)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onPrint?.(item)}
                          className="cursor-pointer"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Print
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
