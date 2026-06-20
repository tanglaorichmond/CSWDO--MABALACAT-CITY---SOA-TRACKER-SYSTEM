import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot, query, limit, where, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile, UserRole } from "../types";

const USERS_COLLECTION = "users";

// Fetch user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
  return null;
}

// Fetch user profile by Google Email
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("email", "==", email.toLowerCase().trim()),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserProfile;
    }
  } catch (error) {
    console.error("Error fetching user by email:", error);
  }
  return null;
}

// Create or update user profile
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, profile.uid);
    await setDoc(userRef, profile, { merge: true });
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
}

// Pre-register user before they login for the first time
export async function registerPreUser(
  email: string,
  displayName: string,
  position: string,
  role: UserRole,
  canEdit?: boolean,
  canDelete?: boolean
): Promise<void> {
  // Use a temporary key
  const tempUid = "pre-" + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();
  const profile: UserProfile = {
    uid: tempUid,
    email: email.toLowerCase().trim(),
    displayName,
    position,
    role,
    canEdit,
    canDelete,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
  await saveUserProfile(profile);
}

// Subscribe to registration requests
export function subscribeToRegistrationRequests(
  callback: (requests: any[]) => void
): () => void {
  const collectionRef = collection(db, "registrationRequests");
  const q = query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const requests: any[] = snapshot.docs.map((doc) => ({
      ...doc.data(),
    }));
    callback(requests);
  });
}

// User requests registration
export async function requestRegistration(
  email: string,
  displayName: string,
  position: string,
  category: "Hospital" | "Funeral" | "Laboratory"
): Promise<void> {
  const requestId = "pending-" + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();
  const request = {
    uid: requestId,
    email: email.toLowerCase().trim(),
    displayName,
    position,
    category,
    role: "User",
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
  await setDoc(doc(db, "registrationRequests", requestId), request);
}

// Delete registration request
export async function deleteRegistrationRequest(uid: string): Promise<void> {
  await deleteDoc(doc(db, "registrationRequests", uid));
}

// Delete user profile
export async function deleteUserProfile(uid: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await deleteDoc(userRef);
  } catch (error) {
    console.error("Error deleting user profile:", error);
    throw error;
  }
}

// Update user details (position/role/permissions)
export async function updateUserProfileFields(
  uid: string,
  fields: Partial<Pick<UserProfile, "position" | "role" | "displayName" | "email" | "canEdit" | "canDelete" | "status" | "category">>
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      ...fields,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating user fields:", error);
    throw error;
  }
}

// Check if any users exist to auto-assign the first sign-up as administrator
export async function isFirstUser(): Promise<boolean> {
  try {
    const q = query(collection(db, USERS_COLLECTION), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  } catch (error) {
    console.error("Error checking first user:", error);
    return true; // Safe fallback to make sure they can get admin if Firestore fails or empty
  }
}

// Real-time listener for all users (Admin only)
export function subscribeToUsers(onUpdate: (users: UserProfile[]) => void) {
  const q = collection(db, USERS_COLLECTION);
  return onSnapshot(
    q,
    (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      // Sort users by displayName
      users.sort((a, b) => a.displayName.localeCompare(b.displayName));
      onUpdate(users);
    },
    (error) => {
      console.error("Error subscribing to users:", error);
    }
  );
}
