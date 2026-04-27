"use client";

import { useState } from "react";

import { EmployeesClient } from "./EmployeesClient";
import { RosterClient } from "./RosterClient";

type Tab = "managers" | "employees";

/**
 * Tabbed wrapper for /enterprise/roster — splits "people" into two
 * concepts:
 *
 *   Admin / Managers — Clerk-authed members of this org. They can
 *     log into untilThen and create capsules. (Existing surface.)
 *
 *   Employees — a per-org datastore of people the org may want
 *     to gift to / collect contributions from. They don't need
 *     untilThen accounts; the org admin maintains the list as a
 *     convenience source for capsule contributor + recipient
 *     pickers.
 */
export function RosterTabs({
  orgId,
  viewerRole,
}: {
  orgId: string;
  viewerRole: "OWNER" | "ADMIN";
}) {
  const [tab, setTab] = useState<Tab>("managers");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1">
        <TabButton active={tab === "managers"} onClick={() => setTab("managers")}>
          Admin / Managers
        </TabButton>
        <TabButton active={tab === "employees"} onClick={() => setTab("employees")}>
          Employees
        </TabButton>
      </div>

      {tab === "managers" ? (
        <RosterClient orgId={orgId} viewerRole={viewerRole} />
      ) : (
        <EmployeesClient orgId={orgId} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] font-bold transition-colors ${
        active
          ? "bg-navy text-white"
          : "bg-white border border-navy/15 text-navy hover:border-navy/30"
      }`}
    >
      {children}
    </button>
  );
}
