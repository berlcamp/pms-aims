"use client";

import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";

export default function Page() {
  const loading = false;
  const totalCount = 0;

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text">RFQ / Bidding</h1>
        <div className="app__title_actions">
          {/* Filter placeholder - to be implemented */}
          {/* Create button placeholder - to be implemented */}
          <Button variant="green" size="sm" disabled>
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
            Create RFQ
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="app__empty_state_title">No RFQ / Bidding records found</p>
            <p className="app__empty_state_description">
              Get started by creating a new RFQ / Bidding record
            </p>
          </div>
        ) : (
          <div className="app__table_container">
            <div className="app__table_wrapper">
              <table className="app__table">
                <thead className="app__table_thead">
                  <tr>
                    <th className="app__table_th">RFQ Number</th>
                    <th className="app__table_th">Date</th>
                    <th className="app__table_th">Description</th>
                    <th className="app__table_th">Office</th>
                    <th className="app__table_th">Status</th>
                    <th className="app__table_th_right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app__table_tbody">
                  {/* Data rows will be populated here */}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
