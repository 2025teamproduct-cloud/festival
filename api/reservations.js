import { Redis } from '@upstash/redis';
import { randomUUID } from 'node:crypto';

const MAX_TEAMS_PER_SLOT = 5;
const RESERVATION_KEY = 'festival:reservations:v1';
const LOCK_KEY = 'festival:reservations:lock';
const SLOTS = new Set(['10:00', '11:00', '13:00', '14:00', '15:00']);

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Upstash Redis environment variables are not configured');
  }
  return Redis.fromEnv();
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

export default async function handler(req, res) {
  try {
    const redis = getRedis();
    const reservations = (await redis.get(RESERVATION_KEY)) || [];

    if (req.method === 'GET') {
      const counts = Object.fromEntries([...SLOTS].map((slot) => [
        slot,
        reservations.filter((reservation) => reservation.slotId === slot).length,
      ]));
      return json(res, 200, { counts, capacity: MAX_TEAMS_PER_SLOT });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    if (req.body?.action === 'verify') {
      const number = clean(req.body.number, 20).toUpperCase();
      const name = clean(req.body.name, 80);
      const reservation = reservations.find((item) => item.number === number && item.name === name);
      if (!reservation) {
        return json(res, 404, { message: '整理番号と予約時の名前が一致しません。' });
      }
      return json(res, 200, { reservation: { number: reservation.number, slotId: reservation.slotId } });
    }

    const slotId = clean(req.body?.slotId, 20);
    const name = clean(req.body?.name, 80);
    const partnerName = clean(req.body?.partnerName, 80);
    if (!SLOTS.has(slotId) || !name || !partnerName) {
      return json(res, 400, { message: '参加枠、代表者名、同行者名を入力してください。' });
    }

    const lockToken = randomUUID();
    const locked = await redis.set(LOCK_KEY, lockToken, { nx: true, ex: 5 });
    if (!locked) {
      return json(res, 409, { message: '予約処理が集中しています。少し待って再度お試しください。' });
    }

    try {
      const latest = (await redis.get(RESERVATION_KEY)) || [];
      const slotReservations = latest.filter((reservation) => reservation.slotId === slotId);
      if (slotReservations.length >= MAX_TEAMS_PER_SLOT) {
        return json(res, 409, { message: 'この回は満席です。別の回を選択してください。' });
      }

      const reservation = {
        number: createNumber(),
        slotId,
        name,
        partnerName,
        createdAt: new Date().toISOString(),
      };
      await redis.set(RESERVATION_KEY, [...latest, reservation]);
      return json(res, 201, { reservation });
    } finally {
      await redis.del(LOCK_KEY);
    }
  } catch (error) {
    console.error(error);
    return json(res, 500, { message: '予約システムに接続できません。管理者にご確認ください。' });
  }
}