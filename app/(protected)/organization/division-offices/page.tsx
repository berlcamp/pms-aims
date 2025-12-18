"use client";

import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";

import Notfoundpage from "@/components/Notfoundpage";
import { PER_PAGE } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddModal } from "./AddModal";
import { Filter } from "./Filter";
import { List } from "./List";

export default function Page() {
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [modalAddOpen, setModalAddOpen] = useState(false);
  const [loading, setLoading] = useState(true); // Initialize to true
  const [filter, setFilter] = useState({
    keyword: "",
  });

  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.user.user);
  const filterKeywordRef = useRef(filter.keyword);

  // Wrapper function to reset page when filter changes
  const handleFilterChange = useCallback((newFilter: { keyword: string }) => {
    setFilter(newFilter);
    // Reset to page 1 when filter keyword changes
    if (filterKeywordRef.current !== newFilter.keyword) {
      filterKeywordRef.current = newFilter.keyword;
      setPage(1);
    }
  }, []);

  // Fetch data on page load
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true); // Set loading before clearing list
      dispatch(addList([])); // Reset the list

      let query = supabase.from("divisions").select("*", { count: "exact" });

      // Search in both name and code fields
      if (filter.keyword) {
        query = query.or(
          `name.ilike.%${filter.keyword}%,code.ilike.%${filter.keyword}%,region.ilike.%${filter.keyword}%,province.ilike.%${filter.keyword}%`
        );
      }

      const { data, count, error } = await query
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)
        .order("id", { ascending: false });
      console.log("data", data);
      // Only update state if component is still mounted
      if (!isMounted) return;

      if (error) {
        console.error(error);
      } else {
        // Update the list of divisions in Redux store
        dispatch(addList(data));
        setTotalCount(count || 0);
      }
      setLoading(false);
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [page, filter, dispatch]); // Add `dispatch` to dependency array

  if (user?.type != "super admin") {
    return <Notfoundpage />;
  }

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text">Divisions</h1>
        <div className="app__title_actions">
          <Filter filter={filter} setFilter={handleFilterChange} />
          <Button
            variant="green"
            onClick={() => setModalAddOpen(true)}
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
            Add Division
          </Button>
        </div>
      </div>
      <div className="app__content">
        {/* Pass Redux data to List Table */}
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <p className="app__empty_state_title">No divisions found</p>
            <p className="app__empty_state_description">
              {filter.keyword
                ? "Try adjusting your search criteria"
                : "Get started by adding a new division"}
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
        <AddModal
          isOpen={modalAddOpen}
          onClose={() => setModalAddOpen(false)}
        />
      </div>
    </div>
  );
}
