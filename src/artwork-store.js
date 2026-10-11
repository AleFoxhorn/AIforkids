// Image blobs live in IndexedDB, separate from editable collage board metadata.
const dbReady = new Promise((resolve, reject) => {
  const request = indexedDB.open('wonderpatch-artworks', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('artworks', { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
dbReady.catch(() => {});
export async function artworks(action, value) {
  const db = await dbReady;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('artworks', action === 'put' ? 'readwrite' : 'readonly');
    const request = action === 'put' ? tx.objectStore('artworks').put(value) : tx.objectStore('artworks').getAll();
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
