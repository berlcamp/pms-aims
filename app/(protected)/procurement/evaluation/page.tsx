/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Pre-Procurement Evaluation Queue
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
import { useAppSelector } from "@/lib/redux/hook";
import { supabase } from "@/lib/supabase/client";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EvaluationQueuePage() {
  const user = useAppSelector((state) => state.user.user);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.system_user_id) return;
    loadEvaluations();
  }, [user]);

  const loadEvaluations = async () => {
    if (!user?.system_user_id) return;
    setLoading(true);
    try {
      // Get pending evaluations based on user's role and current stage
      const { data, error } = await supabase
        .from("pre_procurement_evaluations")
        .select(
          `
          *,
          proposal:procurement_proposals (
            id,
            proposal_number,
            title,
            total_amount
          )
        `
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (error) {
      console.error("Failed to load evaluations:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pre-Procurement Evaluation</h1>
        <p className="text-muted-foreground">
          Review and evaluate procurement proposals
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending evaluations.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evaluation Number</TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">
                      {evaluation.evaluation_number}
                    </TableCell>
                    <TableCell>
                      {evaluation.proposal?.proposal_number} -{" "}
                      {evaluation.proposal?.title}
                    </TableCell>
                    <TableCell>
                      ₱{evaluation.proposal?.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>Stage {evaluation.current_stage}</TableCell>
                    <TableCell>
                      <Badge>{evaluation.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/procurement/evaluation/${evaluation.id}`}>
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
