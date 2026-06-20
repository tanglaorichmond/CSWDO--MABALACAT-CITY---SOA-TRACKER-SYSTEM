import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { Stakeholder } from "../types";

const STAKEHOLDER_COLLECTION = "stakeholders";

export const subscribeToStakeholders = (callback: (stakeholders: Stakeholder[]) => void) => {
  const q = query(collection(db, STAKEHOLDER_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Stakeholder));
    callback(list);
  }, (error) => {
    console.error("Stakeholders subscription failed:", error);
  });
};

export const getStakeholders = async (): Promise<Stakeholder[]> => {
  const q = query(collection(db, STAKEHOLDER_COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  } as Stakeholder));
};

// ... existing imports ...
export const createStakeholder = async (data: Omit<Stakeholder, "id" | "createdAt">): Promise<Stakeholder> => {
  const docRef = await addDoc(collection(db, STAKEHOLDER_COLLECTION), {
    ...data,
    createdAt: new Date().toISOString()
  });
  const newDoc = await getDoc(docRef);
  return { id: docRef.id, ...newDoc.data() } as Stakeholder;
};

export const bulkAddStakeholders = async (stakeholders: Omit<Stakeholder, "id" | "createdAt">[]) => {
  for (const st of stakeholders) {
    await createStakeholder(st);
  }
};
// ... existing update/delete functions ...

export const updateStakeholder = async (id: string, data: Partial<Omit<Stakeholder, "id" | "createdAt">>): Promise<void> => {
  const docRef = doc(db, STAKEHOLDER_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteStakeholder = async (id: string): Promise<void> => {
  const docRef = doc(db, STAKEHOLDER_COLLECTION, id);
  await deleteDoc(docRef);
};

export const clearAllStakeholders = async () => {
  const q = query(collection(db, STAKEHOLDER_COLLECTION));
  const querySnapshot = await getDocs(q);
  const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
};
