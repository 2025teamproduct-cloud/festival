import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

const MAX_TEAMS_PER_SLOT = 5;
const START_TIME_MINUTES = 10 * 60;
const END_TIME_MINUTES = 15 * 60;
const SLOT_INTERVAL_MINUTES = 10;
const SLOTS = new Set(Array.from(
  { length: (END_TIME_MINUTES - START_TIME_MINUTES) / SLOT_INTERVAL_MINUTES + 1 },
  (_, index) => {
    const totalMinutes = START_TIME_MINUTES + index * SLOT_INTERVAL_MINUTES;
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }
));

function getFirestoreDb() {
  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      throw new Error('Firebase Admin environment variables are not configured');
    }
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
  return getFirestore();
}

function json(res, status, body) {
  return res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function createNumber() {
  return `F-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function sortReservations(first, second) {
  return first.number.localeCompare(second.number, undefined, { numeric: true });
}

export default async function handler(req, res) {
  try {
    const db = getFirestoreDb();

    if (req.method === 'GET') {
      const slotSnapshots = await Promise.all([...SLOTS].map((slot) =>
        db.collection('slots').doc(slot).get()
      ));
      const counts = Object.fromEntries(slotSnapshots.map((snapshot) => [
        snapshot.id,
        snapshot.exists ? snapshot.data().reservedCount || 0 : 0,
      ]));
      const reservations = req.query?.view === 'staff'
        ? (await db.collection('reservations').get()).docs
          .map((snapshot) => {
            const reservation = snapshot.data();
            return {
              number: reservation.number,
              slotId: reservation.slotId,
              name: reservation.name,
              partnerName: reservation.partnerName,
              verified: reservation.verified === true,
            };
          })
          .sort(sortReservations)
        : undefined;
      return json(res, 200, { counts, capacity: MAX_TEAMS_PER_SLOT, reservations });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    if (req.body?.action === 'verify') {
      const number = clean(req.body.number, 20).toUpperCase();
      const name = clean(req.body.name, 80);
      const reservationSnapshot = await db.collection('reservations').doc(number).get();
      const reservation = reservationSnapshot.exists ? reservationSnapshot.data() : null;
      if (!reservation || reservation.name !== name) {
        return json(res, 404, { message: '整理番号と予約時の名前が一致しません。' });
      }
      await reservationSnapshot.ref.update({
        verified: true,
        verifiedAt: new Date().toISOString(),
      });
      return json(res, 200, {
        reservation: {
          number: reservation.number,
          slotId: reservation.slotId,
          name: reservation.name,
          partnerName: reservation.partnerName,
          verified: true,
        },
      });
    }

    if (req.body?.action === 'setVerified') {
      const number = clean(req.body.number, 20).toUpperCase();
      const verified = req.body.verified === true;
      const reservationRef = db.collection('reservations').doc(number);
      const reservationSnapshot = await reservationRef.get();
      if (!reservationSnapshot.exists) {
        return json(res, 404, { message: '整理番号が見つかりません。' });
      }
      await reservationRef.update({
        verified,
        verifiedAt: verified ? new Date().toISOString() : null,
      });
      return json(res, 200, { number, verified });
    }

    const slotId = clean(req.body?.slotId, 20);
    const name = clean(req.body?.name, 80);
    const partnerName = clean(req.body?.partnerName, 80);
    if (!SLOTS.has(slotId) || !name || !partnerName) {
      return json(res, 400, { message: '参加枠、代表者名、同行者名を入力してください。' });
    }

    const reservation = {
      number: createNumber(),
      slotId,
      name,
      partnerName,
      verified: false,
      createdAt: new Date().toISOString(),
    };
    const slotRef = db.collection('slots').doc(slotId);
    const reservationRef = db.collection('reservations').doc(reservation.number);

    await db.runTransaction(async (transaction) => {
      const slotSnapshot = await transaction.get(slotRef);
      const reservedCount = slotSnapshot.exists ? slotSnapshot.data().reservedCount || 0 : 0;
      if (reservedCount >= MAX_TEAMS_PER_SLOT) {
        const error = new Error('この回は満席です。別の回を選択してください。');
        error.code = 'FULL';
        throw error;
      }
      transaction.set(slotRef, {
        slotId,
        capacity: MAX_TEAMS_PER_SLOT,
        reservedCount: reservedCount + 1,
      }, { merge: true });
      transaction.create(reservationRef, reservation);
    });

    return json(res, 201, { reservation });
  } catch (error) {
    if (error.code === 'FULL') {
      return json(res, 409, { message: error.message });
    }
    console.error(error);
    return json(res, 500, { message: '予約システムに接続できません。管理者にご確認ください。' });
  }
}