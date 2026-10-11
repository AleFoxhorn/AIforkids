// Image blobs live in IndexedDB, separate from editable collage board metadata.
const dbReady = new Promise((resolve, reject) => {
  const request = indexedDB.open('wonderpatch-artworks', 2);
  request.onupgradeneeded = () => {
    for(const name of ['artworks','materials']) if(!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name,{keyPath:'id'});
  };
  request.onsuccess = () => {request.result.onversionchange=()=>request.result.close();resolve(request.result);};
  request.onblocked = () => reject(new Error('请关闭其他 WonderPatch 标签页后重试'));
  request.onerror = () => reject(request.error);
});
dbReady.catch(() => {});
export async function artworks(action, value, store='artworks') {
  const db = await dbReady;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, action === 'put' ? 'readwrite' : 'readonly');
    const request = action === 'put' ? tx.objectStore(store).put(value) : tx.objectStore(store).getAll();
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export const materialFiles=(action,value)=>artworks(action,value,'materials');
