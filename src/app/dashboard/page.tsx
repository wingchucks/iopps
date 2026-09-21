import { redirect } from "next/navigation";
// The existing setup resolver authenticates and selects the account workspace.
export default function DashboardAlias() { redirect("/setup"); }
