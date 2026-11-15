import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getFirestoreDb() {
  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !privateKey
    ) {
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
  return res
    .status(status)
    .setHeader('Content-Type', 'application/json')
    .json(body);
}

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function documentId(value) {
  const id = cleanString(value, 128);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw invalid('データのIDが正しくありません。');
  }
  return id;
}

function normalizeProduct(value) {
  const price = Number(value?.price);
  const name = cleanString(value?.name, 120);
  if (!name || !Number.isSafeInteger(price) || price < 0) {
    throw invalid('商品名または価格が正しくありません。');
  }
  return { id: documentId(value?.id), name, price };
}

function normalizeReceipt(value) {
  const id = documentId(value?.id);
  const date = cleanString(value?.date, 10);
  const time = cleanString(value?.time, 8);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    throw invalid('会計日時が正しくありません。');
  }
  if (!Array.isArray(value?.items) || value.items.length > 100) {
    throw invalid('会計明細が正しくありません。');
  }

  const items = value.items.map((item) => {
    const name = cleanString(item?.name, 120);
    const price = Number(item?.price);
    const qty = Number(item?.qty);
    if (!name || !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(qty) || qty < 1) {
      throw invalid('会計明細が正しくありません。');
    }
    return { name, price, qty };
  });

  const receipt = { id, date, time, items };
  for (const field of ['total', 'paid', 'change']) {
    if (value[field] == null) {
      receipt[field] = null;
    } else if (Number.isSafeInteger(Number(value[field])) && Number(value[field]) >= 0) {
      receipt[field] = Number(value[field]);
    } else {
      throw invalid('会計金額が正しくありません。');
    }
  }
  return receipt;
}

function normalizeClosing(value) {
  const date = cleanString(value?.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw invalid('レジ締めの日付が正しくありません。');
  }
  const amount = (input) => {
    const text = input == null ? '' : String(input);
    if (!/^\d{0,12}$/.test(text)) {
      throw invalid('レジ締め金額が正しくありません。');
    }
    return text;
  };
  return { date, float: amount(value.float), actual: amount(value.actual) };
}

async function writeInChunks(db, operations) {
  for (let start = 0; start < operations.length; start += 400) {
    const batch = db.batch();
    operations.slice(start, start + 400).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

async function collectionData(collection) {
  const snapshot = await collection.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function handler(req, res) {
  try {
    const store = cleanString(req.method === 'GET' ? req.query?.store : req.body?.store, 20);
    if (store !== 'asumin' && store !== 'yuna') {
      return json(res, 400, { message: '店舗を正しく指定してください。' });
    }

    const db = getFirestoreDb();
    const storeRef = db.collection('registers').doc(store);
    const collections = {
      products: storeRef.collection('products'),
      receipts: storeRef.collection('receipts'),
      closing: storeRef.collection('closing'),
    };

    if (req.method === 'GET') {
      const [products, receipts, closing] = await Promise.all([
        collectionData(collections.products),
        collectionData(collections.receipts),
        collectionData(collections.closing),
      ]);
      return json(res, 200, { products, receipts, closing });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    const body = req.body || {};
    switch (body.action) {
      case 'product-save': {
        const product = normalizeProduct(body.product);
        await collections.products.doc(product.id).set(product);
        break;
      }
      case 'product-delete':
        await collections.products.doc(documentId(body.id)).delete();
        break;
      case 'receipt-save': {
        const receipt = normalizeReceipt(body.receipt);
        await collections.receipts.doc(receipt.id).set(receipt);
        break;
      }
      case 'receipt-delete':
        await collections.receipts.doc(documentId(body.id)).delete();
        break;
      case 'closing-save': {
        const closing = normalizeClosing(body.closing);
        await collections.closing.doc(closing.date).set(closing);
        break;
      }
      case 'receipts-replace': {
        if (!Array.isArray(body.receipts)) {
          throw invalid('会計データの形式が正しくありません。');
        }
        const receipts = body.receipts.map(normalizeReceipt);
        const receiptIds = new Set(receipts.map((receipt) => receipt.id));
        if (receiptIds.size !== receipts.length) {
          throw invalid('会計データに重複したIDがあります。');
        }
        const existing = await collections.receipts.get();
        const operations = [
          ...existing.docs
            .filter((doc) => !receiptIds.has(doc.id))
            .map((doc) => (batch) => batch.delete(doc.ref)),
          ...receipts.map((receipt) => (batch) =>
            batch.set(collections.receipts.doc(receipt.id), receipt)),
        ];
        await writeInChunks(db, operations);
        break;
      }
      case 'wipe': {
        const snapshots = await Promise.all(
          Object.values(collections).map((collection) => collection.get())
        );
        const operations = snapshots.flatMap((snapshot) =>
          snapshot.docs.map((doc) => (batch) => batch.delete(doc.ref))
        );
        await writeInChunks(db, operations);
        break;
      }
      case 'migrate': {
        const [productsSnapshot, receiptsSnapshot, closingSnapshot] = await Promise.all([
          collections.products.get(),
          collections.receipts.get(),
          collections.closing.get(),
        ]);
        if (
          productsSnapshot.size ||
          receiptsSnapshot.size ||
          closingSnapshot.size
        ) {
          return json(res, 200, { migrated: false });
        }

        const products = Array.isArray(body.products)
          ? body.products.map(normalizeProduct)
          : [];
        const receipts = Array.isArray(body.receipts)
          ? body.receipts.map(normalizeReceipt)
          : [];
        const closing = body.closing && typeof body.closing === 'object'
          ? Object.entries(body.closing).map(([date, data]) =>
            normalizeClosing({ ...data, date }))
          : [];
        const operations = [
          ...products.map((product) => (batch) =>
            batch.set(collections.products.doc(product.id), product)),
          ...receipts.map((receipt) => (batch) =>
            batch.set(collections.receipts.doc(receipt.id), receipt)),
          ...closing.map((entry) => (batch) =>
            batch.set(collections.closing.doc(entry.date), entry)),
        ];
        await writeInChunks(db, operations);
        return json(res, 200, { migrated: true });
      }
      default:
        return json(res, 400, { message: '操作を正しく指定してください。' });
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    if (error.status === 400) {
      return json(res, 400, { message: error.message });
    }
    console.error(error);
    return json(res, 500, { message: 'Firestoreに保存できませんでした。' });
  }
}

export default handler;
