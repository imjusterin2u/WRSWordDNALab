// firebase.js — Word DNA Lab
// Shared Firebase config + Firestore + Realtime Database helpers

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc,
  collection, getDocs, addDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getDatabase, ref, set, get, onValue, update, remove, push, off
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const rdb = getDatabase(app, 'https://worddnalab-default-rtdb.firebaseio.com');

// ── STUDENTS (Firestore) ──────────────────────────────────────────────────────
export async function getStudents() {
  const snap = await getDocs(collection(db, "students"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addStudent(name, substep = "2.4") {
  const ref2 = await addDoc(collection(db, "students"), {
    name, substep, createdAt: serverTimestamp(), currentZone: 1, zones: {}
  });
  return ref2.id;
}

export async function updateStudent(studentId, data) {
  await updateDoc(doc(db, "students", studentId), data);
}

export async function deleteStudent(studentId) {
  await deleteDoc(doc(db, "students", studentId));
}

export async function getStudent(studentId) {
  const snap = await getDoc(doc(db, "students", studentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ── PROGRESS (Firestore) ──────────────────────────────────────────────────────
export async function saveZoneProgress(studentId, zoneNum, stars, score) {
  const r = doc(db, "students", studentId);
  const key = `zones.zone${zoneNum}`;
  const snap = await getDoc(r);
  const existing = snap.data()?.zones?.[`zone${zoneNum}`]?.attempts || 0;
  await updateDoc(r, {
    [`${key}.stars`]:      stars,
    [`${key}.lastScore`]:  score.correct,
    [`${key}.total`]:      score.total,
    [`${key}.lastPlayed`]: serverTimestamp(),
    [`${key}.attempts`]:   existing + 1,
    [`${key}.errors`]:     score.errors || [],
    currentZone: Math.max(zoneNum + 1, score.currentZone || zoneNum + 1)
  });
}

export async function saveScoop(studentId, zoneNum, sentenceIndex, correct) {
  const r = doc(db, "students", studentId);
  const snap = await getDoc(r);
  const existing = snap.data()?.zones?.[`zone${zoneNum}`]?.scoops || [];
  existing.push({ sentenceIndex, correct, ts: Date.now() });
  await updateDoc(r, { [`zones.zone${zoneNum}.scoops`]: existing });
}

// ── HEAD TO HEAD (Realtime Database) ─────────────────────────────────────────

// Generate a 4-digit room code
export function generateRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Create a room
export async function createRoom(code, player1, player2, substep, zone) {
  await set(ref(rdb, `rooms/${code}`), {
    created: Date.now(),
    status: 'waiting',   // waiting | active | complete
    substep, zone,
    player1: { name: player1.name, id: player1.id || null, score: 0, answer: null, ready: false },
    player2: { name: player2.name, id: player2.id || null, score: 0, answer: null, ready: false },
    currentQ: 0,
    questionKey: null,
    winner: null
  });
}

// Join a room as player 2
export async function joinRoom(code, playerNum, playerInfo) {
  const r = ref(rdb, `rooms/${code}/player${playerNum}`);
  await update(r, { name: playerInfo.name, id: playerInfo.id || null, ready: true });
}

// Listen to room changes
export function listenRoom(code, callback) {
  const r = ref(rdb, `rooms/${code}`);
  onValue(r, snap => callback(snap.val()));
  return () => off(r);
}

// Submit an answer in a room
export async function submitRoomAnswer(code, playerNum, answer, correct) {
  await update(ref(rdb, `rooms/${code}`), {
    [`player${playerNum}/answer`]: answer,
    [`player${playerNum}/correct`]: correct,
    [`player${playerNum}/answeredAt`]: Date.now()
  });
}

// Award point and advance question
export async function advanceRoomQuestion(code, scoringPlayer, nextQ, questionKey) {
  const updates = {
    currentQ: nextQ,
    questionKey,
    [`player1/answer`]: null,
    [`player1/correct`]: null,
    [`player1/answeredAt`]: null,
    [`player2/answer`]: null,
    [`player2/correct`]: null,
    [`player2/answeredAt`]: null,
  };
  if (scoringPlayer) updates[`player${scoringPlayer}/score`] = { '.sv': 'timestamp' }; // placeholder
  await update(ref(rdb, `rooms/${code}`), updates);
}

// Increment player score
export async function incrementScore(code, playerNum) {
  const r = ref(rdb, `rooms/${code}/player${playerNum}/score`);
  const snap = await get(r);
  await set(r, (snap.val() || 0) + 1);
}

// Set room status
export async function setRoomStatus(code, status) {
  await update(ref(rdb, `rooms/${code}`), { status });
}

// Delete room when done
export async function deleteRoom(code) {
  await remove(ref(rdb, `rooms/${code}`));
}

// Check if room exists
export async function roomExists(code) {
  const snap = await get(ref(rdb, `rooms/${code}`));
  return snap.exists();
}

export { db, rdb };
