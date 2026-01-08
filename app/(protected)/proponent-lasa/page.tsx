"use client";

import Notfoundpage from "@/components/Notfoundpage";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addList } from "@/lib/redux/listSlice";
import { getLasaRows } from "@/lib/services/lasa";
import { LasaRowWithRelations } from "@/types/database";
import { format } from "date-fns";
import { Lock, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ViewModal } from "../planning/lasa/ViewModal";

export default function Page() {
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [viewLasaId, setViewLasaId] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const list = useAppSelector(
    (state) => state.list.value
  ) as LasaRowWithRelations[];

  // Fetch LASA data where user is proponent
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!user?.system_user_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      dispatch(addList([])); // Reset the list

      try {
        const data = await getLasaRows({
          proponentId: String(user.system_user_id),
        });

        if (!isMounted) return;

        dispatch(addList(data || []));
        setTotalCount(data?.length || 0);
      } catch (error) {
        console.error("Error fetching proponent LASA rows:", error);
        toast.error("Failed to load LASA rows");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user?.system_user_id, dispatch, refetchTrigger]);

  const handleView = (item: LasaRowWithRelations) => {
    setViewLasaId(item.id);
    setModalViewOpen(true);
  };

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

  if (!user) {
    return <Notfoundpage />;
  }

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text">My LASA Assignments</h1>
        <div className="app__title_actions">
          <p className="text-sm text-muted-foreground">
            LASA rows where you are assigned as proponent
          </p>
        </div>
      </div>
      <div className="app__content">
        {loading ? (
          <TableSkeleton />
        ) : totalCount === 0 ? (
          <div className="app__empty_state">
            <div className="app__empty_state_icon">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="app__empty_state_title">No LASA assignments found</p>
            <p className="app__empty_state_description">
              You are not currently assigned as proponent for any LASA rows
            </p>
          </div>
        ) : (
          <div className="app__table_container">
            <div className="app__table_wrapper">
              <table className="app__table">
                <thead className="app__table_thead">
                  <tr>
                    <th className="app__table_th">Project Title</th>
                    <th className="app__table_th">Fund Source</th>
                    <th className="app__table_th">Planned Amount</th>
                    <th className="app__table_th">SARO Number</th>
                    <th className="app__table_th">Fiscal Year</th>
                    <th className="app__table_th">PPMP Link</th>
                    <th className="app__table_th_right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app__table_tbody">
                  {list.map((item: LasaRowWithRelations) => {
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleView(item)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View Modal */}
        <ViewModal
          isOpen={modalViewOpen}
          onClose={() => {
            setModalViewOpen(false);
            setViewLasaId(null);
          }}
          lasaId={viewLasaId}
        />
      </div>
    </div>
  );
}

