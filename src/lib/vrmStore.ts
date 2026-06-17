const DB_NAME = "mocap-uploads";
const DB_VERSION = 1;
const STORE_NAME = "vrms";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface UploadedModel {
  id: string;
  name: string;
  createdAt: number;
}

export async function storeVrm(file: File): Promise<UploadedModel> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const data = await file.arrayBuffer();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await promisify(store.put({ id, name: file.name, createdAt: Date.now(), data }));
  db.close();
  return { id, name: file.name, createdAt: Date.now() };
}

export async function getAllUploads(): Promise<UploadedModel[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const entries = await promisify(store.getAll());
  db.close();
  return (entries as Array<{ id: string; name: string; createdAt: number }>).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export async function getVrmData(id: string): Promise<ArrayBuffer | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const entry = await promisify(store.get(id));
  db.close();
  return (entry as { data?: ArrayBuffer } | undefined)?.data ?? null;
}

export async function getVrmBlob(id: string): Promise<Blob | null> {
  const data = await getVrmData(id);
  return data ? new Blob([data], { type: "application/octet-stream" }) : null;
}

export async function deleteVrm(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await promisify(store.delete(id));
  db.close();
}
