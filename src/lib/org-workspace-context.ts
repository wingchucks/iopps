"use client";

import { createContext, useContext } from "react";

/** Set only inside OrgRoute after the server confirmed organization access. Display-only. */
export interface OrgWorkspace {
  name: string;
}

export const OrgWorkspaceContext = createContext<OrgWorkspace | null>(null);

export function useOrgWorkspace(): OrgWorkspace | null {
  return useContext(OrgWorkspaceContext);
}
