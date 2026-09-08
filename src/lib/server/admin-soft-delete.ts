export function buildOrganizationSoftDeleteMetadata(adminId: string, deletedAt: string) {
  return {
    disabled: true,
    status: "disabled",
    deletedAt,
    deletedBy: adminId,
    updatedAt: deletedAt,
    isPublished: false,
    publicationStatus: "SUSPENDED",
    publicVisibility: "hidden",
    directoryVisible: false,
    isDirectoryVisible: false,
  };
}

export function buildSoftDeleteContentPatch(
  collectionId: string,
  deletedAt: string,
): Record<string, unknown> | null {
  switch (collectionId) {
    case "jobs":
      return { active: false, status: "deleted", updatedAt: deletedAt };
    case "posts":
      return { status: "deleted", updatedAt: deletedAt };
    case "events":
      return { active: false, status: "deleted", updatedAt: deletedAt };
    case "scholarships":
      return { active: false, status: "deleted", updatedAt: deletedAt };
    default:
      return null;
  }
}

export function buildAdminUserSoftDeleteUpdate(adminId: string, deletedAt: string) {
  return {
    status: "deleted",
    deletedAt,
    deletedBy: adminId,
    updatedAt: deletedAt,
  };
}

