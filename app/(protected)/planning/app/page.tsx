"use client";

import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { PER_PAGE } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { Office, PPMPWithRelations } from "@/types/database";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ViewModal } from "../ppmp/ViewModal";
import { Filter, PPMPFilter } from "./Filter";
import { List } from "./List";

export default function Page() {
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedPPMPId, setSelectedPPMPId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState<PPMPFilter>({
    keyword: "",
  });
  const [availableOffices, setAvailableOffices] = useState<Office[]>([]);

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const list = useAppSelector(
    (state) => state.list.value
  ) as PPMPWithRelations[];

  const filterKeyword = useMemo(() => filter.keyword, [filter.keyword]);

  // Group PPMPs by parent relationship and determine latest versions
  const groupedPPMPs = useMemo(() => {
    if (!list || list.length === 0)
      return {
        latestVersions: new Map<string, string>(),
        versionGroups: new Map<string, PPMPWithRelations[]>(),
        latestOnlyList: [],
      };

    const versionGroups = new Map<string, PPMPWithRelations[]>();
    const latestVersions = new Map<string, string>();

    // Group PPMPs by root ID (parent_ppmp_id or null for root)
    list.forEach((ppmp) => {
      const rootId = ppmp.parent_ppmp_id || ppmp.id;

      if (!versionGroups.has(rootId)) {
        versionGroups.set(rootId, []);
      }

      const group = versionGroups.get(rootId);
      if (group && !group.some((v) => v.id === ppmp.id)) {
        group.push(ppmp);
      }
    });

    // Determine latest version for each group (largest version number)
    versionGroups.forEach((versions, rootId) => {
      const sortedVersions = [...versions].sort(
        (a, b) => b.version - a.version
      );
      if (sortedVersions.length > 0) {
        const latestId = sortedVersions[0].id;
        latestVersions.set(rootId, latestId);
        // Also map each version to its latest
        versions.forEach((v) => {
          latestVersions.set(v.id, latestId);
        });
      }
    });

    // Create list with only latest versions for display
    const latestOnlyList: PPMPWithRelations[] = [];
    versionGroups.forEach((versions) => {
      const sortedVersions = [...versions].sort(
        (a, b) => b.version - a.version
      );
      if (sortedVersions.length > 0) {
        latestOnlyList.push(sortedVersions[0]); // Add only the latest version
      }
    });

    return {
      latestVersions,
      versionGroups,
      latestOnlyList,
    };
  }, [list]);

  // Fetch offices for filter
  useEffect(() => {
    const fetchOffices = async () => {
      const divisionId = process.env.NEXT_PUBLIC_DIVISION_ID
        ? parseInt(process.env.NEXT_PUBLIC_DIVISION_ID)
        : null;

      if (!divisionId) {
        console.error("NEXT_PUBLIC_DIVISION_ID is not set");
        return;
      }

      // Fetch offices
      const { data: offices } = await supabase
        .from("offices")
        .select("*")
        .eq("division_id", divisionId)
        .eq("is_active", true)
        .order("name");

      if (offices) setAvailableOffices(offices as Office[]);
    };

    fetchOffices();
  }, []);

  // Fetch PPMP data
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      dispatch(addList([])); // Reset the list

      const divisionId = process.env.NEXT_PUBLIC_DIVISION_ID
        ? parseInt(process.env.NEXT_PUBLIC_DIVISION_ID)
        : null;

      if (!divisionId) {
        console.error("NEXT_PUBLIC_DIVISION_ID is not set");
        setLoading(false);
        toast.error("Configuration error: Division ID not set");
        return;
      }

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
        .eq("division_id", divisionId)
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
  }, [page, filterKeyword, filter, dispatch, refreshKey]);

  const handleView = (item: PPMPWithRelations) => {
    setSelectedPPMPId(item.id);
    setModalViewOpen(true);
  };

  const handleViewClose = () => {
    setModalViewOpen(false);
    setSelectedPPMPId(null);
  };

  const handleActionComplete = () => {
    // Refresh the list by incrementing refreshKey to trigger useEffect
    setRefreshKey((prev) => prev + 1);
    setPage(1);
  };

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text">APP</h1>
        <div className="app__title_actions">
          <Filter
            filter={filter}
            setFilter={setFilter}
            availableOffices={availableOffices}
          />
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
                : "No PPMPs available"}
            </p>
          </div>
        ) : (
          <List
            onView={handleView}
            latestOnlyList={groupedPPMPs.latestOnlyList}
            versionGroups={groupedPPMPs.versionGroups}
            latestVersions={groupedPPMPs.latestVersions}
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

        {/* View Modal */}
        <ViewModal
          isOpen={modalViewOpen}
          onClose={handleViewClose}
          ppmpId={selectedPPMPId}
          user={user}
          onActionComplete={handleActionComplete}
        />
      </div>
    </div>
  );
}
