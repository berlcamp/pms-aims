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
import { BudgetAllocationWithRelations } from "@/types/database";
import { format } from "date-fns";
import { Eye, MoreVertical, Trash2 } from "lucide-react";

type ItemType = BudgetAllocationWithRelations;

interface ListProps {
  onView?: (item: ItemType) => void;
  onDelete?: (item: ItemType) => void;
}

export const List = ({ onView, onDelete }: ListProps) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Active
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            Closed
          </Badge>
        );
      case "draft":
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
            Draft
          </Badge>
        );
    }
  };

  return (
    <div className="app__table_container">
      <div className="app__table_wrapper">
        <table className="app__table">
          <thead className="app__table_thead">
            <tr>
              <th className="app__table_th">Allocation Name</th>
              <th className="app__table_th">Amount</th>
              <th className="app__table_th">Fund Source</th>
              <th className="app__table_th">Status</th>
              <th className="app__table_th">Fiscal Year</th>
              <th className="app__table_th">LASA</th>
              <th className="app__table_th_right">Actions</th>
            </tr>
          </thead>
          <tbody className="app__table_tbody">
            {list.map((item: ItemType) => {
              return (
                <tr key={item.id} className="app__table_tr">
                  <td className="app__table_td">
                    <div className="app__table_cell_text">
                      <div className="app__table_cell_title">
                        {item.allocation_name || "-"}
                      </div>
                      <div className="app__table_cell_subtitle text-xs">
                        Created {formatDate(item.created_at)}
                      </div>
                    </div>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm font-medium">
                      {formatCurrency(item.allocation_amount)}
                    </span>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm">{item.fund_source}</span>
                  </td>
                  <td className="app__table_td">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm">{item.fiscal_year}</span>
                  </td>
                  <td className="app__table_td">
                    {item.lasa ? (
                      <div className="app__table_cell_text">
                        <div className="app__table_cell_title text-xs">
                          {item.lasa.project_title}
                        </div>
                        <div className="app__table_cell_subtitle text-xs">
                          FY {item.lasa.fiscal_year}
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
                          <DropdownMenuItem
                            onClick={() => onDelete?.(item)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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
