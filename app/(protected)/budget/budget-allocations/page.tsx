"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import Notfoundpage from "@/components/Notfoundpage";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { PER_PAGE } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addList } from "@/lib/redux/listSlice";
import {
  deleteBudgetAllocation,
  getBudgetAllocations,
} from "@/lib/services/budget-allocations";
import { BudgetAllocationWithRelations } from "@/types/database";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AddModal } from "./AddModal";
import { BudgetAllocationFilter, Filter } from "./Filter";
import { List } from "./List";
import { ViewModal } from "./ViewModal";

export default function Page() {
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<
    string | null
  >(null);
  const [viewAllocationId, setViewAllocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] =
    useState<BudgetAllocationWithRelations | null>(null);
  const [filter, setFilter] = useState<BudgetAllocationFilter>({
    keyword: "",
  });
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const list = useAppSelector(
    (state) => state.list.value
  ) as BudgetAllocationWithRelations[];

  const filterKeyword = useMemo(() => filter.keyword, [filter.keyword]);

  const isBudgetOfficer = useMemo(() => {
    if (!user) return false;
    // Only budget officer can access Budget Allocations
    return user.type === "budget officer" || user.type === "super admin";
  }, [user]);

  const divisionId = useMemo(() => {
    return user?.division_id
      ? String(user.division_id)
      : process.env.NEXT_PUBLIC_DIVISION_ID || "";
  }, [user]);

  // Fetch Budget Allocations data
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      dispatch(addList([])); // Reset the list

      try {
        const divisionId = process.env.NEXT_PUBLIC_DIVISION_ID || "";

        const data = await getBudgetAllocations({
          divisionId,
          fiscalYear:
            filter.fiscalYear === "ALL" ? undefined : filter.fiscalYear,
          status: filter.status === "ALL" ? undefined : filter.status,
          lasaId: filter.lasaId ?? undefined,
          keyword: filterKeyword,
        });

        if (!isMounted) return;

        dispatch(addList(data || []));
        setTotalCount(data?.length || 0);
      } catch (error) {
        console.error("Error fetching budget allocations:", error);
        toast.error("Failed to load budget allocations");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [filterKeyword, filter, dispatch, refetchTrigger]);

  const handleView = (item: BudgetAllocationWithRelations) => {
    setViewAllocationId(item.id);
    setModalViewOpen(true);
  };

  const handleEdit = (item: BudgetAllocationWithRelations) => {
    setSelectedAllocationId(item.id);
    setModalCreateOpen(true);
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
    setSelectedAllocationId(null);
  };

  if (
    !user ||
    (user.type !== "budget officer" && user.type !== "super admin")
  ) {
    return <Notfoundpage />;
  }

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text">Budget Allocations</h1>
        <div className="app__title_actions">
          <Filter
            filter={filter}
            setFilter={setFilter}
            divisionId={divisionId}
          />
          {isBudgetOfficer && (
            <Button
              variant="green"
              onClick={() => {
                setSelectedAllocationId(null);
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
          )}
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
              No budget allocations found
            </p>
            <p className="app__empty_state_description">
              {filterKeyword
                ? "Try adjusting your search criteria"
                : isBudgetOfficer
                ? "Get started by creating a new budget allocation"
                : "No budget allocations available"}
            </p>
          </div>
        ) : (
          <List
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            user={user}
          />
        )}

        {/* Pagination */}
        {!filterKeyword && totalCount > 0 && totalCount > PER_PAGE && (
          <div className="app__pagination">
            <div className="app__pagination_info">
              Page <span className="font-medium">{page}</span> of{" "}
              <span className="font-medium">
                {Math.ceil(totalCount / PER_PAGE)}
              </span>
            </div>
            <div className="app__pagination_controls">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1 || loading}
                className="h-9 min-w-[80px]"
              >
                Previous
              </Button>
              <div className="app__pagination_page_numbers">
                {Array.from(
                  { length: Math.min(5, Math.ceil(totalCount / PER_PAGE)) },
                  (_, i) => {
                    const totalPages = Math.ceil(totalCount / PER_PAGE);
                    let pageNum: number;

                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={page === pageNum ? "default" : "outline"}
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className="h-9 w-9 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page * PER_PAGE >= totalCount || loading}
                className="h-9 min-w-[80px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        <AddModal
          isOpen={modalCreateOpen}
          onClose={() => {
            setModalCreateOpen(false);
            setSelectedAllocationId(null);
          }}
          editData={
            selectedAllocationId
              ? (list.find((item) => item.id === selectedAllocationId) as
                  | BudgetAllocationWithRelations
                  | undefined) || null
              : null
          }
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
