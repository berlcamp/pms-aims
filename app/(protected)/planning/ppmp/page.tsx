"use client";

import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { PER_PAGE } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { checkPPMPCreatePermission } from "@/lib/utils/ppmp-permissions";
import { Office, PPMPWithRelations, School } from "@/types/database";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CreateWizard } from "./CreateWizard";
import { Filter, PPMPFilter } from "./Filter";
import { List } from "./List";
import { ViewModal } from "./ViewModal";

export default function Page() {
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedPPMPId, setSelectedPPMPId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PPMPFilter>({
    keyword: "",
  });
  const [availableOffices, setAvailableOffices] = useState<Office[]>([]);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const list = useAppSelector(
    (state) => state.list.value
  ) as PPMPWithRelations[];

  const filterKeyword = useMemo(() => filter.keyword, [filter.keyword]);

  // Fetch offices and schools for filter
  useEffect(() => {
    const fetchOfficesAndSchools = async () => {
      // Fetch offices
      const { data: offices } = await supabase
        .from("offices")
        .select("*")
        .eq("division_id", process.env.NEXT_PUBLIC_DIVISION_ID)
        .eq("is_active", true)
        .order("name");

      if (offices) setAvailableOffices(offices as Office[]);

      // Fetch schools
      const { data: schools } = await supabase
        .from("schools")
        .select("*")
        .eq("division_id", process.env.NEXT_PUBLIC_DIVISION_ID)
        .eq("is_active", true)
        .order("name");

      if (schools) setAvailableSchools(schools as School[]);
    };

    fetchOfficesAndSchools();
  }, []);

  // Fetch PPMP data
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      dispatch(addList([])); // Reset the list

      let query = supabase
        .from("ppmp")
        .select(
          `
          *,
          lots:ppmp_lots(*),
          items:ppmp_items(*),
          attachments:ppmp_attachments(*),
          approval_history:ppmp_approval_history(*),
          office:offices(id, name, code),
          school:schools(id, name, code),
          submitted_by_user:users!ppmp_submitted_by_fkey(id, name, email),
          approved_by_user:users!ppmp_approved_by_fkey(id, name, email)
        `,
          { count: "exact" }
        )
        .eq("division_id", process.env.NEXT_PUBLIC_DIVISION_ID)
        .is("deleted_at", null);

      // Apply filters
      if (filterKeyword) {
        query = query.or(
          `project_title.ilike.%${filterKeyword}%,ppmp_number.ilike.%${filterKeyword}%`
        );
      }

      if (filter.status && filter.status !== "ALL") {
        query = query.eq("status", filter.status);
      }

      if (filter.fiscalYear && filter.fiscalYear !== "ALL") {
        query = query.eq("fiscal_year", filter.fiscalYear);
      }

      if (filter.ppmpType && filter.ppmpType !== "ALL") {
        query = query.eq("ppmp_type", filter.ppmpType);
      }

      if (filter.officeId && filter.officeId !== "ALL") {
        query = query.eq("office_id", filter.officeId);
      }

      if (filter.schoolId && filter.schoolId !== "ALL") {
        query = query.eq("school_id", filter.schoolId);
      }

      // Apply pagination
      if (!filterKeyword) {
        query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
      }

      const { data, count, error } = await query.order("created_at", {
        ascending: false,
      });

      if (!isMounted) return;

      if (error) {
        console.error("Error fetching PPMPs:", error);
        toast.error("Failed to load PPMPs");
      } else {
        dispatch(addList(data || []));
        setTotalCount(count || 0);
      }
      setLoading(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [page, filterKeyword, filter, dispatch]);

  const handleView = (item: PPMPWithRelations) => {
    setSelectedPPMPId(item.id);
    setModalViewOpen(true);
  };

  const handleEdit = (item: PPMPWithRelations) => {
    // For now, we'll use the CreateWizard in edit mode
    // In a full implementation, you might want a separate EditModal
    setSelectedPPMPId(item.id);
    setModalCreateOpen(true);
  };

  const handlePrint = () => {
    // TODO: Implement print functionality
    toast("Print functionality coming soon");
  };

  const handleCreateComplete = () => {
    // Refresh the list
    setPage(1);
    setModalCreateOpen(false);
    setSelectedPPMPId(null);
  };

  const handleViewClose = () => {
    setModalViewOpen(false);
    setSelectedPPMPId(null);
  };

  const canCreate = user ? checkPPMPCreatePermission(user) : false;

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text">PPMP</h1>
        <div className="app__title_actions">
          <Filter
            filter={filter}
            setFilter={setFilter}
            availableOffices={availableOffices}
            availableSchools={availableSchools}
          />
          {canCreate && (
            <Button
              variant="green"
              onClick={() => {
                setSelectedPPMPId(null);
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
              Create PPMP
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
            <p className="app__empty_state_title">No PPMPs found</p>
            <p className="app__empty_state_description">
              {filterKeyword
                ? "Try adjusting your search criteria"
                : canCreate
                ? "Get started by creating a new PPMP"
                : "No PPMPs available"}
            </p>
          </div>
        ) : (
          <List onView={handleView} onEdit={handleEdit} onPrint={handlePrint} />
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
        <CreateWizard
          isOpen={modalCreateOpen}
          onClose={() => {
            setModalCreateOpen(false);
            setSelectedPPMPId(null);
          }}
          editData={
            selectedPPMPId
              ? (list.find((item) => item.id === selectedPPMPId) as
                  | PPMPWithRelations
                  | undefined) || null
              : null
          }
          onSubmitComplete={handleCreateComplete}
        />

        {/* View Modal */}
        <ViewModal
          isOpen={modalViewOpen}
          onClose={handleViewClose}
          ppmpId={selectedPPMPId}
          user={user}
          onActionComplete={handleCreateComplete}
        />
      </div>
    </div>
  );
}
