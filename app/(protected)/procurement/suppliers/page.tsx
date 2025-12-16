/**
 * Supplier List Page
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
import { Supplier } from "@/types/database";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SupplierListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name", { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage supplier registry</p>
        </div>
        <Link href="/procurement/suppliers/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Registry</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No suppliers found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>TIN</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>{supplier.email || supplier.phone}</TableCell>
                    <TableCell>{supplier.tin || "-"}</TableCell>
                    <TableCell>
                      {supplier.performance_rating ? (
                        <Badge>
                          {supplier.performance_rating.toFixed(1)}/5
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/procurement/suppliers/${supplier.id}`}>
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
