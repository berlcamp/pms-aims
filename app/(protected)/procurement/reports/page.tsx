/**
 * Procurement Reports Dashboard
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, FileText, Package, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  const reportCategories = [
    {
      title: "PR & PO Reports",
      description: "Purchase Request and Purchase Order summaries",
      reports: [
        { name: "PR Summary", href: "/procurement/reports/pr-summary" },
        { name: "PO Summary", href: "/procurement/reports/po-summary" },
      ],
      icon: FileText,
    },
    {
      title: "Financial Reports",
      description: "Fund utilization and financial analysis",
      reports: [
        {
          name: "Fund Utilization",
          href: "/procurement/reports/fund-utilization",
        },
        { name: "Item History", href: "/procurement/reports/item-history" },
      ],
      icon: DollarSign,
    },
    {
      title: "Supplier Reports",
      description: "Supplier performance and reliability",
      reports: [
        {
          name: "Supplier Performance",
          href: "/procurement/reports/supplier-performance",
        },
      ],
      icon: TrendingUp,
    },
    {
      title: "Planning Reports",
      description: "APP and PPMP consolidated reports",
      reports: [
        {
          name: "Consolidated APP/PPMP",
          href: "/procurement/reports/app-ppmp",
        },
      ],
      icon: Package,
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Procurement Reports</h1>
        <p className="text-muted-foreground">
          Generate and view procurement reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.title}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle>{category.title}</CardTitle>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.reports.map((report) => (
                    <Link
                      key={report.name}
                      href={report.href}
                      className="block p-2 rounded hover:bg-accent transition-colors"
                    >
                      {report.name}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
