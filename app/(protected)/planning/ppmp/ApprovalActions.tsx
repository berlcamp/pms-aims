"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ExtendedUser } from "@/lib/redux/userSlice";
import { approvePPMP, markAsReviewed, returnPPMP } from "@/lib/services/ppmp";
import {
  checkPPMPApprovalPermission,
  checkPPMPReviewPermission,
} from "@/lib/utils/ppmp-permissions";
import { PPMP } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, FileCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

interface ApprovalActionsProps {
  ppmp: PPMP;
  user: ExtendedUser | null;
  onActionComplete?: () => void;
}

const approveSchema = z.object({
  remarks: z.string().optional(),
});

const returnSchema = z.object({
  remarks: z.string().min(1, "Remarks are required when returning PPMP"),
});

type ApproveFormData = z.infer<typeof approveSchema>;
type ReturnFormData = z.infer<typeof returnSchema>;

export function ApprovalActions({
  ppmp,
  user,
  onActionComplete,
}: ApprovalActionsProps) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approveForm = useForm<ApproveFormData>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      remarks: "",
    },
  });

  const returnForm = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      remarks: "",
    },
  });

  const canApprove = checkPPMPApprovalPermission(ppmp, user);
  const canReview = checkPPMPReviewPermission(ppmp, user);

  const handleApprove = async (data: ApproveFormData) => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    setIsSubmitting(true);
    try {
      await approvePPMP(ppmp.id, String(user.id), data.remarks);
      toast.success("PPMP approved successfully");
      setShowApproveModal(false);
      approveForm.reset();
      onActionComplete?.();
    } catch (error) {
      console.error("Approve error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to approve PPMP"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async (data: ReturnFormData) => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    setIsSubmitting(true);
    try {
      await returnPPMP(ppmp.id, String(user.id), data.remarks);
      toast.success("PPMP returned for revision");
      setShowReturnModal(false);
      returnForm.reset();
      onActionComplete?.();
    } catch (error) {
      console.error("Return error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to return PPMP"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    setIsSubmitting(true);
    try {
      await markAsReviewed(ppmp.id, String(user.id));
      toast.success("PPMP marked as reviewed");
      setShowReviewModal(false);
      onActionComplete?.();
    } catch (error) {
      console.error("Review error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as reviewed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canApprove && !canReview) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {canApprove && ppmp.status === "FOR_APPROVAL" && (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowApproveModal(true)}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowReturnModal(true)}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Return for Revision
          </Button>
        </>
      )}

      {canReview && ppmp.status === "APPROVED_BY_OFFICE" && (
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowReviewModal(true)}
          className="gap-2"
        >
          <FileCheck className="h-4 w-4" />
          Mark as Reviewed
        </Button>
      )}

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve PPMP</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this PPMP? This action will lock
              the PPMP and route it to Procurement.
            </DialogDescription>
          </DialogHeader>
          <Form {...approveForm}>
            <form onSubmit={approveForm.handleSubmit(handleApprove)}>
              <FormField
                control={approveForm.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter any remarks or comments"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowApproveModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Approving..." : "Approve PPMP"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return PPMP for Revision</DialogTitle>
            <DialogDescription>
              Return this PPMP to the submitter for revision. Remarks are
              required.
            </DialogDescription>
          </DialogHeader>
          <Form {...returnForm}>
            <form onSubmit={returnForm.handleSubmit(handleReturn)}>
              <FormField
                control={returnForm.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Remarks <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Explain why the PPMP is being returned for revision"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReturnModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Returning..." : "Return for Revision"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark PPMP as Reviewed</DialogTitle>
            <DialogDescription>
              Mark this PPMP as reviewed by Procurement. This will change the
              status to &quot;Submitted to Procurement&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReviewModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReview}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Marking..." : "Mark as Reviewed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
