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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const itemSchema = z.object({
  general_description: z.string().min(1, "General description is required"),
  project_objective: z.string().min(1, "Project objective is required"),
  project_type: z.enum(["goods", "infrastructure", "consulting_services"]),
  quantity_size: z.string().min(1, "Quantity and size is required"),
  recommended_mode_of_procurement: z
    .string()
    .min(1, "Recommended mode of procurement is required"),
  pre_procurement_conference: z.boolean().default(false),
  start_of_procurement_activity: z.string().min(1, "Start date is required"),
  end_of_procurement_activity: z.string().min(1, "End date is required"),
  expected_delivery_period: z
    .string()
    .min(1, "Expected delivery period is required"),
  estimated_budget: z
    .number()
    .min(0, "Estimated budget must be greater than or equal to 0"),
});

type ItemFormType = z.infer<typeof itemSchema>;

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ItemFormType) => void;
  editItem?: ItemFormType | null;
  editIndex?: number | null;
}

export const AddItemModal = ({
  isOpen,
  onClose,
  onSave,
  editItem,
  editIndex,
}: AddItemModalProps) => {
  const form = useForm<ItemFormType>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      general_description: "",
      project_objective: "",
      project_type: "goods",
      quantity_size: "",
      recommended_mode_of_procurement: "",
      pre_procurement_conference: false,
      start_of_procurement_activity: "",
      end_of_procurement_activity: "",
      expected_delivery_period: "",
      estimated_budget: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        form.reset(editItem);
      } else {
        form.reset({
          general_description: "",
          project_objective: "",
          project_type: "goods",
          quantity_size: "",
          recommended_mode_of_procurement: "",
          pre_procurement_conference: false,
          start_of_procurement_activity: "",
          end_of_procurement_activity: "",
          expected_delivery_period: "",
          estimated_budget: 0,
        });
      }
    }
  }, [isOpen, editItem, form]);

  const handleSubmit = (data: ItemFormType) => {
    onSave(data);
    form.reset();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editItem ? "Edit Item" : "Add Item"}
          </DialogTitle>
          <DialogDescription>
            {editItem
              ? "Update the item information below."
              : "Fill in the details to add a new procurement item."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="general_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      1. General Description{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="General description"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      2. Type of Project <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="goods">Goods</SelectItem>
                        <SelectItem value="infrastructure">
                          Infrastructure
                        </SelectItem>
                        <SelectItem value="consulting_services">
                          Consulting Services
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="project_objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Project Objective <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Project objective"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      3. Quantity and Size{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Quantity/Size"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recommended_mode_of_procurement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      4. Recommended Mode of Procurement{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="small_value_procurement">
                          Small Value
                        </SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                        <SelectItem value="agency_to_agency">
                          Agency-to-Agency
                        </SelectItem>
                        <SelectItem value="public_bidding">
                          Public Bidding
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_of_procurement_activity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      6. Start of Procurement Activity{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_of_procurement_activity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      7. End of Procurement Activity{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_delivery_period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      8. Expected Delivery Period{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 30 days"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      10. Estimated Budget (PhP){" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-10"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="pre_procurement_conference"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      5. Pre-Procurement Conference
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-10"
              >
                Cancel
              </Button>
              <Button type="submit" className="h-10 min-w-[100px]">
                {editItem ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
