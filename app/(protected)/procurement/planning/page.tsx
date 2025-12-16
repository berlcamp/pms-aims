/**
 * Procurement Planning - PPMP/APP List Page
 * Displays list of procurement proposals (PPMP/APP)
 */

"use client";

import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { PER_PAGE } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { useCurrentTenant } from "@/lib/tenant/hooks";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APPModal } from "./APPModal";
import { Filter } from "./Filter";
import { List } from "./List";

export default function ProcurementPlanningPage() {
  const router = useRouter();
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [appModalOpen, setAppModalOpen] = useState(false);

  // Check if user is Procurement Officer
  const isProcurementOfficer =
    user?.type?.toLowerCase() === "procurement officer" ||
    user?.type?.toLowerCase() === "procurement_officer";
  const [loading, setLoading] = useState(true); // Start with true to prevent double skeleton
  const [filter, setFilter] = useState<{
    keyword: string;
    type?: "PPMP" | "APP";
    status?: string;
    fiscalYear?: string;
  }>({
    keyword: "",
  });

  const filterKeywordRef = useRef(filter.keyword);
  const isInitialMount = useRef(true);

  // Compute combined loading state to prevent double skeleton
  const isLoading = useMemo(() => {
    return tenantLoading || loading;
  }, [tenantLoading, loading]);

  // Clear Redux list on initial mount to prevent showing stale data from other pages
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Clear list immediately on mount to prevent showing stale data
      dispatch(addList([]));
    }
  }, [dispatch]);

  // Wrapper function to reset page when filter changes
  const handleFilterChange = useCallback(
    (newFilter: {
      keyword: string;
      type?: "PPMP" | "APP";
      status?: string;
      fiscalYear?: string;
    }) => {
      setFilter(newFilter);
      // Reset to page 1 when filter keyword changes
      if (filterKeywordRef.current !== newFilter.keyword) {
        filterKeywordRef.current = newFilter.keyword;
        setPage(1);
      }
    },
    []
  );

  // Fetch data on page load
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      // Wait for tenant to finish loading before proceeding
      if (tenantLoading) {
        // Keep loading state true while tenant is loading
        return;
      }
      // If tenant is null after loading, user might not have division_id
      if (!tenant) {
        console.warn("Tenant is null - user may not have division_id assigned");
        setLoading(false);
        return;
      }

      // Ensure loading is true before fetching (it should already be true from initialization)
      setLoading(true);
      try {
        let query = supabase
          .from("procurement_proposals")
          .select("*", { count: "exact" })
          .eq("division_id", tenant.divisionId)
          .is("deleted_at", null);

        // Apply filters
        if (filter.keyword) {
          query = query.or(
            `proposal_number.ilike.%${filter.keyword}%,title.ilike.%${filter.keyword}%,description.ilike.%${filter.keyword}%`
          );
        }

        if (filter.type) {
          query = query.eq("type", filter.type);
        }

        if (filter.status) {
          query = query.eq("status", filter.status);
        }

        if (filter.fiscalYear) {
          query = query.eq("fiscal_year", parseInt(filter.fiscalYear));
        }

        if (tenant.schoolId) {
          query = query.eq("school_id", tenant.schoolId);
        }

        const { data, count, error } = await query
          .order("created_at", { ascending: false })
          .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

        // Only update state if component is still mounted
        if (!isMounted) return;

        if (error) {
          console.error("Failed to load proposals:", error);
        } else {
          // Update the list of proposals in Redux store
          dispatch(addList(data || []));
          setTotalCount(count || 0);
        }
      } catch (error) {
        console.error("Failed to load proposals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [page, filter, dispatch, tenant, tenantLoading]);

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text">Procurement Planning</h1>
        <div className="app__title_actions">
          <Filter filter={filter} setFilter={handleFilterChange} />
          <div className="flex gap-2">
            <Button
              variant="green"
              onClick={() => router.push("/procurement/planning/ppmp/new")}
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
              New PPMP
            </Button>
            {isProcurementOfficer && (
              <Button
                variant="blue"
                onClick={() => setAppModalOpen(true)}
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
                New APP
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="app__content">
        {isLoading ? (
          <TableSkeleton
            columns={[
              { label: "Proposal Number", align: "left" },
              { label: "Type", align: "left", type: "badge" },
              { label: "Title", align: "left" },
              { label: "Category", align: "left", type: "badge" },
              { label: "Fiscal Year", align: "left" },
              { label: "Amount", align: "left" },
              { label: "Status", align: "left", type: "badge" },
              { label: "Actions", align: "right", type: "button" },
            ]}
          />
        ) : !tenant ? (
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="app__empty_state_title">
              Unable to load tenant information
            </p>
            <p className="app__empty_state_description">
              Please ensure your account has a division assigned.
            </p>
          </div>
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
            <p className="app__empty_state_title">No proposals found</p>
            <p className="app__empty_state_description">
              {filter.keyword ||
              filter.type ||
              filter.status ||
              filter.fiscalYear
                ? "Try adjusting your search criteria"
                : "Get started by creating your first proposal"}
            </p>
          </div>
        ) : (
          <List />
        )}

        {/* Pagination */}
        {totalCount > 0 && totalCount > PER_PAGE && (
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
        {isProcurementOfficer && (
          <APPModal
            isOpen={appModalOpen}
            onClose={() => setAppModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
