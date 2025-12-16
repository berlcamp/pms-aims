/**
 * Purchase Request List Page
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
import { PurchaseRequest } from "@/types/database";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PRListPage() {
  const { tenant } = useCurrentTenant();
  const [prs, setPRs] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    loadPRs();
  }, [tenant]);

  const loadPRs = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      let query = supabase
        .from("purchase_requests")
        .select("*")
        .eq("division_id", tenant.divisionId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (tenant.schoolId) {
        query = query.eq("school_id", tenant.schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPRs(data || []);
    } catch (error) {
      console.error("Failed to load PRs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Requests</h1>
          <p className="text-muted-foreground">Manage purchase requests</p>
        </div>
        <Link href="/procurement/pr/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New PR
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : prs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No purchase requests found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PR Number</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prs.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-medium">
                      {pr.pr_number}
                    </TableCell>
                    <TableCell>{pr.purpose}</TableCell>
                    <TableCell>₱{pr.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge>{pr.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/procurement/pr/${pr.id}`}>
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
