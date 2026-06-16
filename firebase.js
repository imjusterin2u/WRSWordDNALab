// firebase.js — Word DNA Lab
// Shared Firebase config + Firestore helpers

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Config lives in config.js which is gitignored.
// Upload config.js manually to GitHub Pages — do not commit it.
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export async function getStudents() {
  const snap = await getDocs(collection(db, "students"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addStudent(name, substep = "2.4") {
  const ref = await addDoc(collection(db, "students"), {
    name, substep,
    createdAt: serverTimestamp(),
    currentZone: 1,
    zones: {}
  });
  return ref.id;
}

export async function getStudent(studentId) {
  const snap = await getDoc(doc(db, "students", studentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function saveZoneProgress(studentId, zoneNum, stars, score) {
  const ref = doc(db, "students", studentId);
  const key = `zones.zone${zoneNum}`;
  await updateDoc(ref, {
    [`${key}.stars`]:      stars,
    [`${key}.lastScore`]:  score.correct,
    [`${key}.total`]:      score.total,
    [`${key}.lastPlayed`]: serverTimestamp(),
    [`${key}.attempts`]:   (score.attempts || 1),
    [`${key}.errors`]:     score.errors || [],
    currentZone: Math.max(zoneNum + 1, score.currentZone || zoneNum + 1)
  });
}

export async function saveScoop(studentId, zoneNum, sentenceIndex, correct) {
  const ref = doc(db, "students", studentId);
  const snap = await getDoc(ref);
  const existing = snap.data()?.zones?.[`zone${zoneNum}`]?.scoops || [];
  existing.push({ sentenceIndex, correct, ts: Date.now() });
  await updateDoc(ref, { [`zones.zone${zoneNum}.scoops`]: existing });
}

export async function updateCurrentZone(studentId, zoneNum) {
  await updateDoc(doc(db, "students", studentId), { currentZone: zoneNum });
}

export { db };
