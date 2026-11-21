//  /api/reservations.js
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';


// ========================================
// 基本設定
// ========================================

// 1枠の定員（人数）
const SLOT_CAPACITY = 20;

// 1回の予約の最大人数（代表者＋同行者）
const MAX_PARTY_SIZE = 20;

// 枠の間隔（分）
const SLOT_INTERVAL_MINUTES = 30;


// ========================================
// 学園祭日程
// ========================================

const FESTIVAL_DATES = {
  day1: '2026-11-21',
  day2: '2026-11-22',
};


// ========================================
// 日ごとの営業時間（両日 11:00〜16:00）
// ========================================

const DAY_SETTINGS = {
  day1: {
    startTimeMinutes: 11 * 60,
    endTimeMinutes: 16 * 60,
  },

  day2: {
    startTimeMinutes: 11 * 60,
    endTimeMinutes: 16 * 60,
  },
};


// ========================================
// 指定日の時間枠を作成
// ========================================

function createSlots(day) {
  const setting = DAY_SETTINGS[day];

  if (!setting) {
    return [];
  }

  return Array.from(
    {
      length:
        (setting.endTimeMinutes - setting.startTimeMinutes)
        / SLOT_INTERVAL_MINUTES
        + 1,
    },
    (_, index) => {

      const totalMinutes =
        setting.startTimeMinutes
        + index * SLOT_INTERVAL_MINUTES;

      const hours =
        String(
          Math.floor(totalMinutes / 60)
        ).padStart(2, '0');

      const minutes =
        String(
          totalMinutes % 60
        ).padStart(2, '0');

      return {
        id: `${hours}:${minutes}`,
        minutes: totalMinutes,
      };
    }
  );
}


// ========================================
// 日付が正しいか
// ========================================

function isValidDay(day) {
  return day === 'day1' || day === 'day2';
}


// ========================================
// 日本時間を取得
// ========================================

function getJapanDateTime() {
  const formatter =
    new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const parts =
    formatter.formatToParts(new Date());

  const result = {};

  parts.forEach((part) => {
    if (part.type !== 'literal') {
      result[part.type] = part.value;
    }
  });

  return {
    date:
      `${result.year}-${result.month}-${result.day}`,

    minutes:
      Number(result.hour) * 60
      + Number(result.minute),
  };
}


// ========================================
// 指定日の現在時刻より前の枠を除外
// ========================================
//
// 例：11/21 13:25 の場合
//   13:00 → 除外
//   13:30 → 対象
// 学園祭当日でない日は全枠が対象。
// ========================================

function getActiveSlots(day) {
  const slots = createSlots(day);

  const now = getJapanDateTime();

  if (now.date !== FESTIVAL_DATES[day]) {
    return slots;
  }

  return slots.filter(
    (slot) => slot.minutes >= now.minutes
  );
}


// ========================================
// Firestore初期化
// ========================================

function getFirestoreDb() {
  if (!getApps().length) {

    const privateKey =
      process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, '\n');

    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !privateKey
    ) {
      throw new Error(
        'Firebase Admin environment variables are not configured'
      );
    }

    initializeApp({
      credential: cert({
        projectId:
          process.env.FIREBASE_PROJECT_ID,

        clientEmail:
          process.env.FIREBASE_CLIENT_EMAIL,

        privateKey,
      }),
    });
  }

  return getFirestore();
}


// ========================================
// JSONレスポンス
// ========================================

function json(res, status, body) {
  return res
    .status(status)
    .setHeader(
      'Content-Type',
      'application/json'
    )
    .json(body);
}


// ========================================
// 入力値を整理
// ========================================

function clean(value, maxLength) {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength)
    : '';
}


function normalizeReservationNumber(value) {
  return clean(value, 20).toUpperCase();
}


// ========================================
// 整理番号作成
// ========================================

function createNumber() {
  return `F-${randomUUID()
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase()}`;
}


// ========================================
// 整理番号順
// ========================================

function sortReservations(first, second) {
  return first.number.localeCompare(
    second.number,
    undefined,
    {
      numeric: true,
      sensitivity: 'base',
    }
  );
}


// ========================================
// スロットのFirestoreドキュメントID
// 例：day1_11:00 / day2_11:30
// ========================================

function createSlotKey(day, slotId) {
  return `${day}_${slotId}`;
}


// ========================================
// 予約の公開用データ
// ========================================

function toPublicReservation(reservation) {
  return {
    number: reservation.number,
    day: reservation.day,
    slotId: reservation.slotId,
    name: reservation.name,
    partySize: reservation.partySize,
    partnerNames: reservation.partnerNames || [],
    verified: reservation.verified === true,
  };
}


// ========================================
// API
// ========================================

export default async function handler(req, res) {

  try {

    const db = getFirestoreDb();


    // ======================================
    // GET
    // ======================================

    if (req.method === 'GET') {

      const requestedDay =
        clean(req.query?.day, 10);

      const day =
        isValidDay(requestedDay)
          ? requestedDay
          : 'day1';


      const slots =
        createSlots(day);


      // --------------------------------------
      // 各枠の予約人数を1回のgetAllで取得
      // --------------------------------------

      const slotRefs =
        slots.map((slot) =>
          db
            .collection('slots')
            .doc(createSlotKey(day, slot.id))
        );

      const slotSnapshots =
        await db.getAll(...slotRefs);

      const counts =
        Object.fromEntries(
          slotSnapshots.map((snapshot, index) => [
            slots[index].id,

            snapshot.exists
              ? snapshot.data().reservedPeople || 0
              : 0,
          ])
        );


      // --------------------------------------
      // スタッフ画面：現在時刻を過ぎていない枠のみ
      // --------------------------------------

      let reservations;

      if (req.query?.view === 'staff') {

        const activeSlots =
          getActiveSlots(day);

        const reservationSnapshots =
          await Promise.all(
            activeSlots.map((slot) =>
              db
                .collection('reservations')
                .where(
                  'slotKey',
                  '==',
                  createSlotKey(day, slot.id)
                )
                .get()
            )
          );

        reservations =
          reservationSnapshots
            .flatMap((snapshot) =>
              snapshot.docs.map((doc) =>
                toPublicReservation(doc.data())
              )
            )
            .sort(sortReservations);
      }


      return json(
        res,
        200,
        {
          counts,

          capacity:
            SLOT_CAPACITY,

          maxPartySize:
            MAX_PARTY_SIZE,

          reservations,
        }
      );
    }


    // ======================================
    // POST以外は拒否
    // ======================================

    if (req.method !== 'POST') {

      return json(
        res,
        405,
        {
          message: 'Method Not Allowed',
        }
      );
    }


    // ======================================
    // 本人確認
    // ======================================

    if (req.body?.action === 'verify') {

      const number =
        normalizeReservationNumber(
          req.body.number
        );

      const name =
        clean(
          req.body.name,
          80
        );


      const reservationSnapshot =
        await db
          .collection('reservations')
          .doc(number)
          .get();


      const reservation =
        reservationSnapshot.exists
          ? reservationSnapshot.data()
          : null;


      if (
        !reservation ||
        reservation.name !== name
      ) {

        return json(
          res,
          404,
          {
            message:
              '整理番号と予約時の名前が一致しません。',
          }
        );
      }


      await reservationSnapshot.ref.update({
        verified: true,
        verifiedAt:
          new Date().toISOString(),
      });


      return json(
        res,
        200,
        {
          reservation: {
            ...toPublicReservation(reservation),
            verified: true,
          },
        }
      );
    }


    // ======================================
    // チェック状態変更
    // ======================================

    if (
      req.body?.action === 'setVerified'
    ) {

      const number =
        normalizeReservationNumber(
          req.body.number
        );

      const verified =
        req.body.verified === true;


      const reservationRef =
        db
          .collection('reservations')
          .doc(number);


      const reservationSnapshot =
        await reservationRef.get();


      if (!reservationSnapshot.exists) {

        return json(
          res,
          404,
          {
            message:
              '整理番号が見つかりません。',
          }
        );
      }


      await reservationRef.update({

        verified,

        verifiedAt:
          verified
            ? new Date().toISOString()
            : null,
      });


      return json(
        res,
        200,
        {
          number,
          verified,
        }
      );
    }


    // ======================================
    // 通常予約（枠は自動割り振り）
    // ======================================

    const day =
      clean(req.body?.day, 10);

    const name =
      clean(req.body?.name, 80);

    const partySize =
      Number(req.body?.partySize);

    const partnerNames =
      Array.isArray(req.body?.partnerNames)
        ? req.body.partnerNames.map(
            (value) => clean(value, 80)
          )
        : [];


    if (!isValidDay(day)) {

      return json(
        res,
        400,
        {
          message:
            '参加日を正しく選択してください。',
        }
      );
    }


    if (
      !Number.isInteger(partySize) ||
      partySize < 1 ||
      partySize > MAX_PARTY_SIZE
    ) {

      return json(
        res,
        400,
        {
          message:
            `参加人数は1〜${MAX_PARTY_SIZE}名で指定してください。`,
        }
      );
    }


    // 同行者は「人数 - 1」名、全員の名前が必要
    if (
      !name ||
      partnerNames.length !== partySize - 1 ||
      partnerNames.some((value) => !value)
    ) {

      return json(
        res,
        400,
        {
          message:
            '代表者名と、人数分の同行者名を入力してください。',
        }
      );
    }


    const number =
      createNumber();

    const createdAt =
      new Date().toISOString();

    const reservationRef =
      db
        .collection('reservations')
        .doc(number);


    // ======================================
    // Transaction：枠の自動割り振り＋予約作成
    // ======================================

    let reservation;

    await db.runTransaction(
      async (transaction) => {

        // リトライ時も毎回現在時刻で再計算
        const activeSlots =
          getActiveSlots(day);

        if (!activeSlots.length) {

          const error =
            new Error(
              '現在、予約できる回がありません。'
            );

          error.code = 'CLOSED';

          throw error;
        }


        const slotRefs =
          activeSlots.map((slot) =>
            db
              .collection('slots')
              .doc(createSlotKey(day, slot.id))
          );

        // 全候補枠を同じTransaction内で読み取る
        const slotSnapshots =
          await transaction.getAll(...slotRefs);


        /*
         * 割り振りルール：
         * 人数が収まる枠のうち、入れた後の余りが最も少ない枠
         * （＝最も20名に近づく枠）を選ぶ。
         * 余りが同じなら、早い時間の枠を優先する。
         */
        let best = null;

        slotSnapshots.forEach((snapshot, index) => {

          const reserved =
            snapshot.exists
              ? snapshot.data().reservedPeople || 0
              : 0;

          const remaining =
            SLOT_CAPACITY - reserved;

          if (remaining < partySize) {
            return;
          }

          const leftover =
            remaining - partySize;

          // 厳密な「<」なので、同率なら先に出てきた早い枠が残る
          if (!best || leftover < best.leftover) {
            best = {
              slot: activeSlots[index],
              ref: slotRefs[index],
              reserved,
              leftover,
            };
          }
        });


        if (!best) {

          const error =
            new Error(
              `${partySize}名で入れる回がありません。人数を減らすか、別の日をお試しください。`
            );

          error.code = 'FULL';

          throw error;
        }


        const slotKey =
          createSlotKey(day, best.slot.id);

        reservation = {
          number,
          day,
          slotId: best.slot.id,
          slotKey,
          name,
          partySize,
          partnerNames,
          verified: false,
          createdAt,
        };


        // 枠の予約人数を加算
        transaction.set(
          best.ref,
          {
            slotKey,
            day,
            slotId: best.slot.id,
            capacity: SLOT_CAPACITY,
            reservedPeople:
              best.reserved + partySize,
          },
          {
            merge: true,
          }
        );


        // 予約を作成
        transaction.create(
          reservationRef,
          reservation
        );
      }
    );


    // ======================================
    // 成功
    // ======================================

    return json(
      res,
      201,
      {
        reservation:
          toPublicReservation(reservation),
      }
    );


  } catch (error) {

    // ======================================
    // 満席・受付終了
    // ======================================

    if (
      error.code === 'FULL' ||
      error.code === 'CLOSED'
    ) {

      return json(
        res,
        409,
        {
          message:
            error.message,
        }
      );
    }


    // ======================================
    // その他エラー
    // ======================================

    console.error(error);

    return json(
      res,
      500,
      {
        message:
          '予約システムに接続できません。管理者にご確認ください。',
      }
    );
  }
}