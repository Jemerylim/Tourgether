// The signed-in session lives in localStorage under one key. Everything that reads or
// changes it goes through here, so the storage choice can change in one place.
const KEY = "authToken";

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (token) => localStorage.setItem(KEY, token);
export const clearToken = () => localStorage.removeItem(KEY);
export const isSignedIn = () => Boolean(getToken());
