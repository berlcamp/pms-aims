"use client";

import Notfoundpage from "@/components/Notfoundpage";
import { TableSkeleton } from "@/components/TableSkeleton";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addList } from "@/lib/redux/listSlice";
import { getBudgetAllocationsByProponent } from "@/lib/services/budget-allocations";
import { BudgetAllocationWithRelations } from "@/types/database";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ViewModal } from "../../budget-allocations/ViewModal";
import { List } from "./List";

export default function Page() {
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [viewAllocationId, setViewAllocationId] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);

  // Fetch Budget Allocations data where user is proponent
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
        const data = await getBudgetAllocationsByProponent(
          String(user.system_user_id)
        );

        if (!isMounted) return;

        dispatch(addList(data || []));
        setTotalCount(data?.length || 0);
      } catch (error) {
        console.error("Error fetching proponent budget allocations:", error);
        toast.error("Failed to load budget allocations");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user?.system_user_id, dispatch]);

  const handleView = (item: BudgetAllocationWithRelations) => {
    setViewAllocationId(item.id);
    setModalViewOpen(true);
  };

  if (!user) {
    return <Notfoundpage />;
  }

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text">My Budget Allocation Assignments</h1>
        <div className="app__title_actions">
          <p className="text-sm text-muted-foreground">
            Budget allocations where you are assigned as proponent
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
            <p className="app__empty_state_title">
              No budget allocation assignments found
            </p>
            <p className="app__empty_state_description">
              You are not currently assigned as proponent for any budget
              allocations.
            </p>
          </div>
        ) : (
          <List onView={handleView} />
        )}

        {/* View Modal */}
        <ViewModal
          isOpen={modalViewOpen}
          onClose={() => {
            setModalViewOpen(false);
            setViewAllocationId(null);
          }}
          allocationId={viewAllocationId}
        />
      </div>
    </div>
  );
}
