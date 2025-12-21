"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { deleteItem } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { Division, Office, School, User } from "@/types/database";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { AddModal } from "./AddModal";

// Always update this on other pages
type ItemType = Office & {
  divisions?: Division | null;
  schools?: School | null;
  head_user?: User | null;
};
const table = "offices";

export const List = ({}) => {
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.list.value);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAddOpen, setModalAddOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

  // Handle opening the confirmation modal for deleting an office
  const handleDeleteConfirmation = (item: ItemType) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ItemType) => {
    setSelectedItem(item);
    setModalAddOpen(true);
  };

  // Delete Office
  const handleDelete = async () => {
    if (selectedItem) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", selectedItem.id);

      if (error) {
        if (error.code === "23503") {
          toast.error(`Selected record cannot be deleted.`);
        }
      } else {
        toast.success("Successfully deleted!");

        // delete item to Redux
        dispatch(deleteItem(selectedItem));
        setIsModalOpen(false);
      }
    }
  };

  return (
    <div className="app__table_container">
      <div className="app__table_wrapper">
        <table className="app__table">
          <thead className="app__table_thead">
            <tr>
              <th className="app__table_th">Name</th>
              <th className="app__table_th">Type</th>
              <th className="app__table_th">Head of Office</th>
              <th className="app__table_th_right">Actions</th>
            </tr>
          </thead>
          <tbody className="app__table_tbody">
            {list.map((item: ItemType) => (
              <tr key={item.id} className="app__table_tr">
                <td className="app__table_td">
                  <div className="app__table_cell_text">
                    <div className="app__table_cell_title">
                      {item.name || "-"}
                    </div>
                  </div>
                </td>
                <td className="app__table_td">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                    {item.office_type === "division_office"
                      ? "Division Office"
                      : "School"}
                  </span>
                </td>
                <td className="app__table_td">
                  {item.head_user ? (
                    <div className="app__table_cell_text">
                      <div className="app__table_cell_title">
                        {item.head_user.name || "-"}
                      </div>
                      {item.head_user.email && (
                        <div className="app__table_cell_subtitle">
                          {item.head_user.email}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
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

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this?"
      />
      <AddModal
        isOpen={modalAddOpen}
        editData={selectedItem}
        onClose={() => setModalAddOpen(false)}
      />
    </div>
  );
};
