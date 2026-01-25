// Use the real implementation, not the mock
jest.unmock('../services/accountState');

import {
  AccountState,
  determineAccountState,
  canAccessEmployerDashboard,
  isEmployerPending,
  isEmployerApproved,
} from "../services/accountState";
import type { EmployerProfile } from "../types";

describe("determineAccountState", () => {
  const createEmployerProfile = (status: "pending" | "approved" | "rejected"): EmployerProfile => ({
    id: "test-id",
    organizationName: "Test Org",
    indigenousOwned: false,
    status,
    createdAt: new Date(),
  });

  describe("Admin users", () => {
    it("should return ADMIN for admin role regardless of employer profile", () => {
      expect(determineAccountState("admin", null)).toBe(AccountState.ADMIN);
      expect(determineAccountState("admin", createEmployerProfile("pending"))).toBe(AccountState.ADMIN);
      expect(determineAccountState("admin", createEmployerProfile("approved"))).toBe(AccountState.ADMIN);
    });
  });

  describe("Vendor users", () => {
    it("should return VENDOR for vendor role", () => {
      expect(determineAccountState("vendor", null)).toBe(AccountState.VENDOR);
    });
  });

  describe("Employer role users", () => {
    it("should return EMPLOYER_APPROVED for employer role with approved profile", () => {
      expect(determineAccountState("employer", createEmployerProfile("approved"))).toBe(
        AccountState.EMPLOYER_APPROVED
      );
    });

    it("should return EMPLOYER_PENDING for employer role with pending profile", () => {
      expect(determineAccountState("employer", createEmployerProfile("pending"))).toBe(
        AccountState.EMPLOYER_PENDING
      );
    });

    it("should return EMPLOYER_PENDING for employer role with no profile (edge case)", () => {
      expect(determineAccountState("employer", null)).toBe(AccountState.EMPLOYER_PENDING);
    });
  });

  describe("User role with employer profile (pending employers)", () => {
    it("should return EMPLOYER_PENDING for user role with pending employer profile", () => {
      expect(determineAccountState("user", createEmployerProfile("pending"))).toBe(
        AccountState.EMPLOYER_PENDING
      );
    });

    it("should return EMPLOYER_APPROVED for user role with approved employer profile", () => {
      // This handles edge case where approval happened but role wasn't updated
      expect(determineAccountState("user", createEmployerProfile("approved"))).toBe(
        AccountState.EMPLOYER_APPROVED
      );
    });

    it("should return COMMUNITY for user role with rejected employer profile", () => {
      expect(determineAccountState("user", createEmployerProfile("rejected"))).toBe(
        AccountState.COMMUNITY
      );
    });
  });

  describe("Community users", () => {
    it("should return COMMUNITY for user role with no employer profile", () => {
      expect(determineAccountState("user", null)).toBe(AccountState.COMMUNITY);
    });

    it("should return COMMUNITY for empty role with no employer profile", () => {
      expect(determineAccountState("", null)).toBe(AccountState.COMMUNITY);
    });
  });
});

describe("canAccessEmployerDashboard", () => {
  it("should return true for EMPLOYER_APPROVED", () => {
    expect(canAccessEmployerDashboard(AccountState.EMPLOYER_APPROVED)).toBe(true);
  });

  it("should return true for EMPLOYER_PENDING", () => {
    expect(canAccessEmployerDashboard(AccountState.EMPLOYER_PENDING)).toBe(true);
  });

  it("should return true for ADMIN", () => {
    expect(canAccessEmployerDashboard(AccountState.ADMIN)).toBe(true);
  });

  it("should return false for COMMUNITY", () => {
    expect(canAccessEmployerDashboard(AccountState.COMMUNITY)).toBe(false);
  });

  it("should return false for VENDOR", () => {
    expect(canAccessEmployerDashboard(AccountState.VENDOR)).toBe(false);
  });
});

describe("isEmployerPending", () => {
  it("should return true only for EMPLOYER_PENDING", () => {
    expect(isEmployerPending(AccountState.EMPLOYER_PENDING)).toBe(true);
    expect(isEmployerPending(AccountState.EMPLOYER_APPROVED)).toBe(false);
    expect(isEmployerPending(AccountState.COMMUNITY)).toBe(false);
    expect(isEmployerPending(AccountState.ADMIN)).toBe(false);
    expect(isEmployerPending(AccountState.VENDOR)).toBe(false);
  });
});

describe("isEmployerApproved", () => {
  it("should return true for EMPLOYER_APPROVED", () => {
    expect(isEmployerApproved(AccountState.EMPLOYER_APPROVED)).toBe(true);
  });

  it("should return true for ADMIN", () => {
    expect(isEmployerApproved(AccountState.ADMIN)).toBe(true);
  });

  it("should return false for EMPLOYER_PENDING", () => {
    expect(isEmployerApproved(AccountState.EMPLOYER_PENDING)).toBe(false);
  });

  it("should return false for COMMUNITY", () => {
    expect(isEmployerApproved(AccountState.COMMUNITY)).toBe(false);
  });

  it("should return false for VENDOR", () => {
    expect(isEmployerApproved(AccountState.VENDOR)).toBe(false);
  });
});
