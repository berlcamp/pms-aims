/**
 * Purchase Order List Page
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import { useCurrentTenant } from "@/lib/tenant/hooks";
import { PurchaseOrder } from "@/types/database";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function POListPage() {
  const { tenant } = useCurrentTenant();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    loadPOs();
  }, [tenant]);

  const loadPOs = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      let query = supabase
        .from("purchase_orders")
        .select("*")
        .eq("division_id", tenant.divisionId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (tenant.schoolId) {
        query = query.eq("school_id", tenant.schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPOs(data || []);
    } catch (error) {
      console.error("Failed to load POs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <p className="text-muted-foreground">Manage purchase orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : pos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No purchase orders found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">
                      {po.po_number}
                    </TableCell>
                    <TableCell>₱{po.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge>{po.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/procurement/po/${po.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
