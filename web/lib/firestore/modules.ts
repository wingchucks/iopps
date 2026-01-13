// Module management Firestore operations
import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  collection,
  checkFirebase,
  employerCollection,
  vendorsCollection,
  servicesCollection,
  jobsCollection,
  schoolsCollection,
  conferencesCollection,
  powwowsCollection,
  businessGrantsCollection,
} from "./shared";
import type { OrganizationModule, ModuleSettings, EmployerProfile } from "@/lib/types";

/**
 * Get enabled modules for an organization
 */
export async function getEnabledModules(userId: string): Promise<OrganizationModule[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const ref = doc(firestore, employerCollection, userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return [];

    const data = snap.data() as EmployerProfile;

    // Return enabledModules if set, otherwise detect from data
    if (data.enabledModules && data.enabledModules.length > 0) {
      return data.enabledModules;
    }

    // Fallback: detect modules from existing data
    return detectModulesFromData(userId);
  } catch (error) {
    console.error("Error getting enabled modules:", error);
    return [];
  }
}

/**
 * Detect which modules should be enabled based on existing data
 */
export async function detectModulesFromData(userId: string): Promise<OrganizationModule[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  const modules: OrganizationModule[] = [];

  try {
    // Check HIRE - has jobs
    const jobsQuery = query(
      collection(firestore, jobsCollection),
      where("employerId", "==", userId)
    );
    const jobsSnap = await getDocs(jobsQuery);
    if (!jobsSnap.empty) {
      modules.push('hire');
    }

    // Check SELL - has vendor profile or services
    const vendorQuery = query(
      collection(firestore, vendorsCollection),
      where("userId", "==", userId)
    );
    const vendorSnap = await getDocs(vendorQuery);

    const servicesQuery = query(
      collection(firestore, servicesCollection),
      where("userId", "==", userId)
    );
    const servicesSnap = await getDocs(servicesQuery);

    if (!vendorSnap.empty || !servicesSnap.empty) {
      modules.push('sell');
    }

    // Check EDUCATE - has school profile
    const schoolQuery = query(
      collection(firestore, schoolsCollection),
      where("employerId", "==", userId)
    );
    const schoolSnap = await getDocs(schoolQuery);
    if (!schoolSnap.empty) {
      modules.push('educate');
    }

    // Check HOST - has conferences or pow wows
    const conferencesQuery = query(
      collection(firestore, conferencesCollection),
      where("employerId", "==", userId)
    );
    const conferencesSnap = await getDocs(conferencesQuery);

    const powwowsQuery = query(
      collection(firestore, powwowsCollection),
      where("employerId", "==", userId)
    );
    const powwowsSnap = await getDocs(powwowsQuery);

    if (!conferencesSnap.empty || !powwowsSnap.empty) {
      modules.push('host');
    }

    // Check FUNDING - has business grants
    try {
      const grantsQuery = query(
        collection(firestore, businessGrantsCollection),
        where("createdBy", "==", userId)
      );
      const grantsSnap = await getDocs(grantsQuery);
      if (!grantsSnap.empty) {
        modules.push('funding');
      }
    } catch {
      // business_grants collection may not have security rules yet - skip silently
    }

    return modules;
  } catch (error) {
    console.error("Error detecting modules:", error);
    return [];
  }
}

/**
 * Enable a module for an organization
 */
export async function enableModule(
  userId: string,
  module: OrganizationModule
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    const ref = doc(firestore, employerCollection, userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data() as EmployerProfile;
    const currentModules = data.enabledModules || [];

    if (!currentModules.includes(module)) {
      const updatedModules = [...currentModules, module];
      const moduleSettings: ModuleSettings = data.moduleSettings || {};

      // Initialize module settings if not present
      if (!moduleSettings[module]) {
        moduleSettings[module] = {
          enabled: true,
          setupComplete: false,
        };
      } else {
        moduleSettings[module]!.enabled = true;
      }

      await updateDoc(ref, {
        enabledModules: updatedModules,
        moduleSettings,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error enabling module:", error);
    throw error;
  }
}

/**
 * Disable a module for an organization
 */
export async function disableModule(
  userId: string,
  module: OrganizationModule
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    const ref = doc(firestore, employerCollection, userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data() as EmployerProfile;
    const currentModules = data.enabledModules || [];

    const updatedModules = currentModules.filter(m => m !== module);
    const moduleSettings: ModuleSettings = data.moduleSettings || {};

    if (moduleSettings[module]) {
      moduleSettings[module]!.enabled = false;
    }

    await updateDoc(ref, {
      enabledModules: updatedModules,
      moduleSettings,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error disabling module:", error);
    throw error;
  }
}

/**
 * Set the last active module for quick navigation
 */
export async function setLastActiveModule(
  userId: string,
  module: OrganizationModule
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    const ref = doc(firestore, employerCollection, userId);
    await updateDoc(ref, {
      lastActiveModule: module,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error setting last active module:", error);
  }
}

/**
 * Get module settings for an organization
 */
export async function getModuleSettings(userId: string): Promise<ModuleSettings | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    const ref = doc(firestore, employerCollection, userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const data = snap.data() as EmployerProfile;
    return data.moduleSettings || null;
  } catch (error) {
    console.error("Error getting module settings:", error);
    return null;
  }
}

/**
 * Update module settings
 */
export async function updateModuleSettings(
  userId: string,
  module: OrganizationModule,
  settings: Partial<ModuleSettings[OrganizationModule]>
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    const ref = doc(firestore, employerCollection, userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data() as EmployerProfile;
    const moduleSettings: ModuleSettings = data.moduleSettings || {};

    moduleSettings[module] = {
      ...moduleSettings[module],
      ...settings,
    } as ModuleSettings[OrganizationModule];

    await updateDoc(ref, {
      moduleSettings,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating module settings:", error);
    throw error;
  }
}

/**
 * Initialize modules for a new or existing organization
 * Detects data and sets up enabledModules accordingly
 */
export async function initializeModules(userId: string): Promise<OrganizationModule[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    // Detect modules from existing data
    const detectedModules = await detectModulesFromData(userId);

    // Build module settings
    const moduleSettings: ModuleSettings = {};
    for (const module of detectedModules) {
      moduleSettings[module] = {
        enabled: true,
        setupComplete: true, // Assume complete if data exists
      };
    }

    // Update the employer profile
    const ref = doc(firestore, employerCollection, userId);
    await updateDoc(ref, {
      enabledModules: detectedModules,
      moduleSettings,
      updatedAt: serverTimestamp(),
    });

    return detectedModules;
  } catch (error) {
    console.error("Error initializing modules:", error);
    return [];
  }
}
