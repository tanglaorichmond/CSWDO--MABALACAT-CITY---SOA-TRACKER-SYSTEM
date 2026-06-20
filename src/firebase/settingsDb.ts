import { doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { SLASettings } from "../types";

const SETTINGS_DOC_PATH = "settings/sla";

export const subscribeToSLASettings = (onUpdate: (settings: SLASettings) => void) => {
  return onSnapshot(doc(db, SETTINGS_DOC_PATH), (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as SLASettings);
    }
  });
};

export const getSLASettings = async (): Promise<SLASettings | null> => {
  const snapshot = await getDoc(doc(db, SETTINGS_DOC_PATH));
  if (snapshot.exists()) {
    return snapshot.data() as SLASettings;
  }
  return null;
};
