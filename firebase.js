// firebase.js — Word DNA Lab
// Shared Firebase config + Firestore helpers

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAsMC0OVOWSdho7Dvr1HIt2920vt3Vc5Tk",
  authDomain: "worddnalab.firebaseapp.com",
  projectId: "worddnalab",
  storageBucket: "worddnalab.firebasestorage.app",
  messagingSenderId: "959229904034",
  appId: "1:959229904034:web:3e9a8ecf7deaff75afc3fb"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── STUDENTS ──────────────────────────────────────────────────────────────────

// Get all students (for dropdown)
export async function getStudents() {
  const snap = await getDocs(collection(db, "students"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Add a new student
export async function addStudent(name, substep = "2.4") {
  const ref = await addDoc(collection(db, "students"), {
    name,
    substep,
    createdAt: serverTimestamp(),
    currentZone: 1,
    zones: {}
  });
  return ref.id;
}

// Get one student's full record
export async function getStudent(studentId) {
  const snap = await getDoc(doc(db, "students", studentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────

// Save zone completion
// stars: 1|2|3  score: {correct, total, errors:[]}
export async function saveZoneProgress(studentId, zoneNum, stars, score) {
  const ref = doc(db, "students", studentId);
  const key = `zones.zone${zoneNum}`;
  await updateDoc(ref, {
    [`${key}.stars`]:       stars,
    [`${key}.lastScore`]:   score.correct,
    [`${key}.total`]:       score.total,
    [`${key}.lastPlayed`]:  serverTimestamp(),
    [`${key}.attempts`]:    (score.attempts || 1),
    [`${key}.errors`]:      score.errors || [],
    currentZone: Math.max(zoneNum + 1, score.currentZone || zoneNum + 1)
  });
}

// Save a scooping event (visual only — just flags it happened)
export async function saveScoop(studentId, zoneNum, sentenceIndex, correct) {
  const ref = doc(db, "students", studentId);
  const key = `zones.zone${zoneNum}.scoops`;
  const snap = await getDoc(ref);
  const existing = snap.data()?.[`zones`]?.[`zone${zoneNum}`]?.scoops || [];
  existing.push({ sentenceIndex, correct, ts: Date.now() });
  await updateDoc(ref, { [key]: existing });
}

// Update current zone pointer
export async function updateCurrentZone(studentId, zoneNum) {
  await updateDoc(doc(db, "students", studentId), { currentZone: zoneNum });
}

export { db };
