export const storage = {
  get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  },

  set(obj) {
    return new Promise((resolve) => {
      chrome.storage.local.set(obj, () => {
        resolve();
      });
    });
  },

  remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve();
      });
    });
  },

  clear() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }
};
