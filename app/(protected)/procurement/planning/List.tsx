"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch } from "@/lib/redux/hook";
import { deleteItem } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { RootState } from "@/types";
import { ProcurementProposal } from "@/types/database";
import { Download, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { APPModal } from "./APPModal";
import { ViewDetailsModal } from "./ViewDetailsModal";

const parseDocumentUrls = (
  documentUrl: string | null | undefined
): string[] => {
  if (!documentUrl) return [];
  try {
    const parsed = JSON.parse(documentUrl);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [documentUrl];
  } catch {
    return [documentUrl];
  }
};

type ItemType = ProcurementProposal;
const table = "procurement_proposals";

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-500";
    case "rejected":
      return "bg-red-500";
    case "under_evaluation":
      return "bg-yellow-500";
    case "returned":
      return "bg-orange-500";
    case "submitted":
      return "bg-blue-500";
    case "draft":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
};

const formatStatus = (status: string) => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const List = ({}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const list = useSelector((state: RootState) => state.list.value);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [modalViewOpen, setModalViewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);
  const [isNewVersion, setIsNewVersion] = useState(false);

  // Handle opening the confirmation modal for deleting a proposal
  const handleDeleteConfirmation = (item: ItemType) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ItemType) => {
    if (item.type === "PPMP") {
      router.push(`/procurement/planning/ppmp/${item.id}`);
    } else {
      setSelectedItem(item);
      setIsNewVersion(false);
      setAppModalOpen(true);
    }
  };

  const handleCreateVersion = (item: ItemType) => {
    if (item.type === "PPMP") {
      router.push(`/procurement/planning/ppmp/new?parentId=${item.id}`);
    } else {
      setSelectedItem(item);
      setIsNewVersion(true);
      setAppModalOpen(true);
    }
  };

  const handleView = (item: ItemType) => {
    setSelectedItem(item);
    setModalViewOpen(true);
  };

  const handleDownload = (item: ItemType, url?: string, index?: number) => {
    const documentUrls = parseDocumentUrls(item.document_url);

    if (documentUrls.length === 0) {
      toast.error("No document attached to this proposal");
      return;
    }

    // If specific URL provided, download that one
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      const fileName =
        url.split("/").pop() ||
        `proposal-${item.proposal_number || item.id}-${(index || 0) + 1}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // If single file, download it directly
    if (documentUrls.length === 1) {
      const link = document.createElement("a");
      link.href = documentUrls[0];
      link.target = "_blank";
      const fileName =
        documentUrls[0].split("/").pop() ||
        `proposal-${item.proposal_number || item.id}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    // If multiple files, they can select from dropdown (handled in UI)
  };

  // Delete Proposal
  const handleDelete = async () => {
    if (selectedItem) {
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", selectedItem.id);

      if (error) {
        if (error.code === "23503") {
          toast.error(`Selected record cannot be deleted.`);
        } else {
          toast.error(`Failed to delete: ${error.message}`);
        }
      } else {
        toast.success("Successfully deleted!");
        // Delete item from Redux
        dispatch(deleteItem(selectedItem));
        setIsModalOpen(false);
      }
    }
  };

  return (
    <>
      <div className="app__table_container">
        <div className="app__table_wrapper">
          <table className="app__table">
            <thead className="app__table_thead">
              <tr>
                <th className="app__table_th">Proposal Number</th>
                <th className="app__table_th">Type</th>
                <th className="app__table_th">Title</th>
                <th className="app__table_th">Category</th>
                <th className="app__table_th">Fiscal Year</th>
                <th className="app__table_th">Version</th>
                <th className="app__table_th">Amount</th>
                <th className="app__table_th">Status</th>
                <th className="app__table_th_right">Actions</th>
              </tr>
            </thead>
            <tbody className="app__table_tbody">
              {list.map((item: ItemType) => (
                <tr key={item.id} className="app__table_tr">
                  <td className="app__table_td">
                    <div className="app__table_cell_content">
                      <div className="app__table_cell_text">
                        <div className="app__table_cell_title">
                          {item.proposal_number || "-"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="app__table_td">
                    <span className="app__badge">{item.type || "-"}</span>
                  </td>
                  <td className="app__table_td">
                    <div className="app__table_cell_text">
                      <div className="app__table_cell_title">
                        {item.title || "-"}
                      </div>
                      {item.description && (
                        <div className="app__table_cell_subtitle">
                          {item.description.length > 50
                            ? `${item.description.substring(0, 50)}...`
                            : item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="app__table_td">
                    <span className="app__badge">{item.category || "-"}</span>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm">{item.fiscal_year || "-"}</span>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm font-medium">
                      v{item.version || 1}
                    </span>
                  </td>
                  <td className="app__table_td">
                    <span className="text-sm font-medium">
                      ₱{item.total_amount?.toLocaleString() || "0.00"}
                    </span>
                  </td>
                  <td className="app__table_td">
                    <Badge className={getStatusColor(item.status)}>
                      {formatStatus(item.status)}
                    </Badge>
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
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleView(item)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          {(() => {
                            const documentUrls = parseDocumentUrls(
                              item.document_url
                            );
                            if (documentUrls.length === 0) return null;

                            if (documentUrls.length === 1) {
                              return (
                                <DropdownMenuItem
                                  onClick={() => handleDownload(item)}
                                  className="cursor-pointer"
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                              );
                            }

                            // Multiple files - show submenu or individual items
                            return (
                              <>
                                <DropdownMenuSeparator />
                                {documentUrls.map((url, index) => {
                                  const fileName =
                                    url.split("/").pop() ||
                                    `Document ${index + 1}`;
                                  return (
                                    <DropdownMenuItem
                                      key={index}
                                      onClick={() =>
                                        handleDownload(item, url, index)
                                      }
                                      className="cursor-pointer text-xs"
                                    >
                                      <Download className="mr-2 h-3 w-3" />
                                      {fileName.length > 25
                                        ? `${fileName.substring(0, 25)}...`
                                        : fileName}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </>
                            );
                          })()}
                          <DropdownMenuItem
                            onClick={() => handleEdit(item)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCreateVersion(item)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Create New Version
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteConfirmation(item)}
                            className="cursor-pointer text-destructive focus:text-destructive"
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

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this proposal? This action cannot be undone."
      />
      {selectedItem?.type === "APP" && (
        <APPModal
          isOpen={appModalOpen}
          editData={isNewVersion ? null : selectedItem}
          parentVersion={isNewVersion ? selectedItem : undefined}
          onClose={() => {
            setAppModalOpen(false);
            setSelectedItem(null);
            setIsNewVersion(false);
          }}
        />
      )}
      <ViewDetailsModal
        isOpen={modalViewOpen}
        proposal={selectedItem}
        onClose={() => {
          setModalViewOpen(false);
          setSelectedItem(null);
        }}
      />
    </>
  );
};
