"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PER_PAGE } from "@/lib/constants";
import { useAppDispatch } from "@/lib/redux/hook";
import { addList, deleteItem } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { Role, RootState } from "@/types";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { RoleModal } from "./RoleModal";
import { RolesFilter } from "./RolesFilter";

type ItemType = Role;
const table = "roles";

export const RolesList = () => {
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [modalAddOpen, setModalAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    keyword: "",
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

  const dispatch = useAppDispatch();
  const list = useSelector((state: RootState) => state.list.value);
  const filterKeywordRef = useRef(filter.keyword);

  const handleFilterChange = useCallback((newFilter: { keyword: string }) => {
    setFilter(newFilter);
    if (filterKeywordRef.current !== newFilter.keyword) {
      filterKeywordRef.current = newFilter.keyword;
      setPage(1);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    dispatch(addList([]));

    const fetchData = async () => {
      setLoading(true);
      let query = supabase.from(table).select("*", { count: "exact" });

      if (filter.keyword) {
        query = query.or(
          `code.ilike.%${filter.keyword}%,name.ilike.%${filter.keyword}%,description.ilike.%${filter.keyword}%`
        );
      }

      const { data, count, error } = await query
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)
        .order("id", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error(error);
        toast.error("Failed to fetch roles");
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
  }, [page, filter, dispatch]);

  const handleEdit = (item: ItemType) => {
    setSelectedItem(item);
    setModalAddOpen(true);
  };

  const handleDeleteConfirmation = (item: ItemType) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (selectedItem) {
      // Check if role is assigned to any users
      const { data: userRoles, error: checkError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role_id", selectedItem.id)
        .limit(1);

      if (checkError) {
        toast.error("Error checking role assignments");
        return;
      }

      if (userRoles && userRoles.length > 0) {
        toast.error("Cannot delete role. It is assigned to one or more users.");
        setIsDeleteModalOpen(false);
        return;
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", selectedItem.id);

      if (error) {
        if (error.code === "23503") {
          toast.error("Selected record cannot be deleted.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Successfully deleted!");
        dispatch(deleteItem(selectedItem));
        setIsDeleteModalOpen(false);
        setSelectedItem(null);
      }
    }
  };

  return (
    <div>
      <div className="app__title">
        <div className="app__title_actions">
          <RolesFilter filter={filter} setFilter={handleFilterChange} />
          <Button
            variant="green"
            onClick={() => {
              setSelectedItem(null);
              setModalAddOpen(true);
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
            Add Role
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <p className="app__empty_state_title">No roles found</p>
            <p className="app__empty_state_description">
              {filter.keyword
                ? "Try adjusting your search criteria"
                : "Get started by adding a new role"}
            </p>
          </div>
        ) : (
          <div className="app__table_container">
            <div className="app__table_wrapper">
              <table className="app__table">
                <thead className="app__table_thead">
                  <tr>
                    <th className="app__table_th">Code</th>
                    <th className="app__table_th">Name</th>
                    <th className="app__table_th">Description</th>
                    <th className="app__table_th">Level</th>
                    <th className="app__table_th">Status</th>
                    <th className="app__table_th_right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app__table_tbody">
                  {list.map((item: ItemType) => (
                    <tr key={item.id} className="app__table_tr">
                      <td className="app__table_td">
                        <span className="font-medium">{item.code}</span>
                      </td>
                      <td className="app__table_td">
                        <div className="app__table_cell_text">
                          <div className="app__table_cell_title">
                            {item.name}
                          </div>
                        </div>
                      </td>
                      <td className="app__table_td">
                        <span className="text-sm text-muted-foreground">
                          {item.description || "-"}
                        </span>
                      </td>
                      <td className="app__table_td">
                        <span className="app__badge">{item.level}</span>
                      </td>
                      <td className="app__table_td">
                        <span
                          className={`app__badge ${
                            item.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
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
                                onClick={() => handleEdit(item)}
                                className="cursor-pointer"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteConfirmation(item)}
                                variant="destructive"
                                className="cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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
        )}

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

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedItem(null);
          }}
          onConfirm={handleDelete}
          message="Are you sure you want to delete this role?"
        />
        <RoleModal
          isOpen={modalAddOpen}
          onClose={() => {
            setModalAddOpen(false);
            setSelectedItem(null);
          }}
          editData={selectedItem}
        />
      </div>
    </div>
  );
};
