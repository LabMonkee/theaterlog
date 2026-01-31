export const STORAGE_KEY = 'theaterlog.reviews.v1';

export function loadReviews(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    return JSON.parse(raw);
  }catch(e){
    console.error('load error', e);
    return [];
  }
}

export function saveReviews(list){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }catch(e){
    console.error('save error', e);
  }
}