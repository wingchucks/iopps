import { comparePartnerPromotion, withPartnerPromotion } from "@/lib/server/partner-promotion";
import {
  deriveOwnerType,
  serialize,
  type JsonRecord,
} from "@/lib/server/public-ownership";
import { isSchoolPubliclyVisible } from "@/lib/school-visibility";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function getPublicSchoolRecords(
  db: FirebaseFirestore.Firestore,
): Promise<JsonRecord[]> {
  const [typeSnap, tierSnap] = await Promise.all([
    db.collection("organizations").where("type", "==", "school").get(),
    db.collection("organizations").where("tier", "==", "school").get(),
  ]);

  const seen = new Set<string>();

  return [...typeSnap.docs, ...tierSnap.docs]
    .filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    })
    .map((doc) => serialize({ id: doc.id, ...doc.data() }) as JsonRecord)
    .filter((school) => deriveOwnerType(school) === "school")
    .filter((school) => isSchoolPubliclyVisible(school))
    .map((school) =>
      withPartnerPromotion({
        ...school,
        ownerType: "school",
        ownerId: text(school.id),
        ownerName: text(school.name),
        ownerSlug: text(school.slug) || text(school.id),
      }),
    )
    .sort(comparePartnerPromotion);
}

