"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import Notfoundpage from "@/components/Notfoundpage";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addList } from "@/lib/redux/listSlice";
import {
  deleteBudgetAllocation,
  getBudgetAllocationsByProponent,
} from "@/lib/services/budget-allocations";
import { BudgetAllocationWithRelations } from "@/types/database";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ViewModal } from "../../budget-allocations/ViewModal";
import { AddModal } from "./AddModal";
import { List } from "./List";

export default function Page() {
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [viewAllocationId, setViewAllocationId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] =
    useState<BudgetAllocationWithRelations | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

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
  }, [user?.system_user_id, dispatch, refetchTrigger]);

  const handleView = (item: BudgetAllocationWithRelations) => {
    setViewAllocationId(item.id);
    setModalViewOpen(true);
  };

  const handleDelete = (item: BudgetAllocationWithRelations) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteBudgetAllocation(itemToDelete.id);
      toast.success("Budget allocation deleted successfully");
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      // Refresh the list by triggering refetch
      setRefetchTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error deleting budget allocation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete budget allocation"
      );
    }
  };

  const handleCreateComplete = () => {
    // Refresh the list by triggering refetch
    setRefetchTrigger((prev) => prev + 1);
    setModalCreateOpen(false);
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
          <Button
            variant="green"
            onClick={() => {
              setModalCreateOpen(true);
            }}
            size="sm"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Allocation
          </Button>
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
              allocations. Create a new allocation to get started.
            </p>
          </div>
        ) : (
          <List onView={handleView} onDelete={handleDelete} />
        )}

        {/* Create Modal */}
        <AddModal
          isOpen={modalCreateOpen}
          onClose={() => {
            setModalCreateOpen(false);
          }}
          user={user}
          onSubmitComplete={handleCreateComplete}
        />

        {/* View Modal */}
        <ViewModal
          isOpen={modalViewOpen}
          onClose={() => {
            setModalViewOpen(false);
            setViewAllocationId(null);
          }}
          allocationId={viewAllocationId}
        />

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={(open) => {
            setDeleteConfirmOpen(open);
            if (!open) setItemToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Budget Allocation"
          description={
            itemToDelete
              ? `Are you sure you want to delete "${itemToDelete.allocation_name}"? This action cannot be undone.`
              : ""
          }
          confirmText="Delete"
        />
      </div>
    </div>
  );
}
