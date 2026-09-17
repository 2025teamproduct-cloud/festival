//  /api/reservations.js
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';


// ========================================
// 基本設定
// ========================================

// 1枠5組は変更しない
const MAX_TEAMS_PER_SLOT = 5;

const SLOT_INTERVAL_MINUTES = 10;


// ========================================
// 学園祭日程
// ========================================

const FESTIVAL_DATES = {
  day1: '2026-11-21',
  day2: '2026-11-22',
};


// ========================================
// 日ごとの営業時間
// ========================================

const DAY_SETTINGS = {
  day1: {
    startTimeMinutes: 10 * 60,
    endTimeMinutes: 17 * 60,
  },

  day2: {
    startTimeMinutes: 10 * 60,
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
// 例：
// 11/21 13:25の場合
//
// 13:10 → 除外
// 13:20 → 除外
// 13:30 → 表示
//
// 2日目を選択している場合は
// 11/21の現在時刻は関係ありません。
// ========================================

function getActiveSlots(day) {
  const slots = createSlots(day);

  const now = getJapanDateTime();

  // まだその日ではない場合
  // → 全枠を対象にする
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
// ========================================
//
// 1日目10:00
// → day1_10:00
//
// 2日目10:00
// → day2_10:00
//
// これにより1日目と2日目の予約枠を完全分離。
// ========================================

function createSlotKey(day, slotId) {
  return `${day}_${slotId}`;
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


      // --------------------------------------
      // 選択日の全枠
      // --------------------------------------

      const slots =
        createSlots(day);


      // --------------------------------------
      // 予約ページ用
      //
      // 各枠の予約数を取得
      // --------------------------------------

      const slotSnapshots =
        await Promise.all(
          slots.map((slot) => {

            const slotKey =
              createSlotKey(day, slot.id);

            return db
              .collection('slots')
              .doc(slotKey)
              .get();
          })
        );


      const counts =
        Object.fromEntries(
          slotSnapshots.map((snapshot, index) => {

            const slot =
              slots[index];

            return [
              slot.id,

              snapshot.exists
                ? snapshot.data().reservedCount || 0
                : 0,
            ];
          })
        );


      // --------------------------------------
      // スタッフ画面
      // --------------------------------------

      let reservations;


      if (req.query?.view === 'staff') {

        /*
         * ここが今回の重要部分。
         *
         * 現在時刻を過ぎた枠は、
         * Firestoreのreservationsから
         * そもそも取得しません。
         *
         * そのため、
         * 過去の大量の予約データを毎回
         * 全件読み込む必要がありません。
         */

        const activeSlots =
          getActiveSlots(day);


        const reservationSnapshots =
          await Promise.all(
            activeSlots.map((slot) => {

              const slotKey =
                createSlotKey(day, slot.id);

              /*
               * slotKeyは1つのフィールドにまとめているため、
               * 単一フィールドのwhereで取得できます。
               *
               * 例：
               * day1_10:00
               */
              return db
                .collection('reservations')
                .where(
                  'slotKey',
                  '==',
                  slotKey
                )
                .get();
            })
          );


        reservations =
          reservationSnapshots
            .flatMap(
              (snapshot) =>
                snapshot.docs.map(
                  (reservationSnapshot) => {

                    const reservation =
                      reservationSnapshot.data();

                    return {
                      number:
                        reservation.number,

                      day:
                        reservation.day,

                      slotId:
                        reservation.slotId,

                      name:
                        reservation.name,

                      partnerName:
                        reservation.partnerName,

                      verified:
                        reservation.verified === true,
                    };
                  }
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
            MAX_TEAMS_PER_SLOT,

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
            number:
              reservation.number,

            day:
              reservation.day,

            slotId:
              reservation.slotId,

            name:
              reservation.name,

            partnerName:
              reservation.partnerName,

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
    // 通常予約
    // ======================================

    const day =
      clean(
        req.body?.day,
        10
      );

    const slotId =
      clean(
        req.body?.slotId,
        20
      );

    const name =
      clean(
        req.body?.name,
        80
      );

    const partnerName =
      clean(
        req.body?.partnerName,
        80
      );


    // --------------------------------------
    // 日付チェック
    // --------------------------------------

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


    // --------------------------------------
    // 枠チェック
    // --------------------------------------

    const slots =
      createSlots(day);

    const selectedSlot =
      slots.find(
        (slot) =>
          slot.id === slotId
      );


    if (
      !selectedSlot ||
      !name ||
      !partnerName
    ) {

      return json(
        res,
        400,
        {
          message:
            '参加日、参加枠、代表者名、同行者名を入力してください。',
        }
      );
    }


    // --------------------------------------
    // 既に開始時刻を過ぎていないか
    // --------------------------------------

    const now =
      getJapanDateTime();

    const festivalDate =
      FESTIVAL_DATES[day];


    if (
      now.date === festivalDate &&
      selectedSlot.minutes < now.minutes
    ) {

      return json(
        res,
        409,
        {
          message:
            'この回は受付時間を過ぎています。別の回を選択してください。',
        }
      );
    }


    // --------------------------------------
    // 予約情報
    // --------------------------------------

    const slotKey =
      createSlotKey(
        day,
        slotId
      );


    const reservation = {

      number:
        createNumber(),

      // 追加：参加日
      day,

      slotId,

      // スタッフ側の効率的な取得用
      slotKey,

      name,

      partnerName,

      verified: false,

      createdAt:
        new Date().toISOString(),
    };


    // --------------------------------------
    // Firestore参照
    // --------------------------------------

    const slotRef =
      db
        .collection('slots')
        .doc(slotKey);


    const reservationRef =
      db
        .collection('reservations')
        .doc(reservation.number);


    // ======================================
    // Transaction
    // ======================================

    await db.runTransaction(
      async (transaction) => {

        const slotSnapshot =
          await transaction.get(
            slotRef
          );


        const reservedCount =
          slotSnapshot.exists
            ? slotSnapshot.data()
              .reservedCount || 0
            : 0;


        // ----------------------------------
        // 定員チェック
        // ----------------------------------

        if (
          reservedCount >=
          MAX_TEAMS_PER_SLOT
        ) {

          const error =
            new Error(
              'この回は満席です。別の回を選択してください。'
            );

          error.code = 'FULL';

          throw error;
        }


        // ----------------------------------
        // 枠の予約数を+1
        // ----------------------------------

        transaction.set(
          slotRef,
          {
            slotKey,

            day,

            slotId,

            capacity:
              MAX_TEAMS_PER_SLOT,

            reservedCount:
              reservedCount + 1,
          },
          {
            merge: true,
          }
        );


        // ----------------------------------
        // 予約を作成
        // ----------------------------------

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
        reservation,
      }
    );


  } catch (error) {

    // ======================================
    // 満席
    // ======================================

    if (error.code === 'FULL') {

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