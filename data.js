window.STORE_DEFAULTS = {
  settings: {
    brandName: 'Your Brand',
    tagline: 'Books for a Better Tomorrow',
    heroTitle: 'Discover Books That Inspire Change',
    heroText: 'Explore printed books to learn, grow and be inspired.',
    whatsapp: '919876543210',
    phone: '+91 98765 43210',
    locationLabel: 'Our Store Location',
    address: 'Your store address goes here.',
    locationUrl: 'https://maps.google.com/',
    supportText: 'Have a question? We are here to help.',
    deliveryEnabled: true,
    deliveryFeePerKm: 20,
    deliveryMinimumFee: 20,
    freeShippingEnabled: true,
    freeShippingThreshold: 999,
    codEnabled: true,
    offerEnabled: false,
    offerType: 'none',
    offerMinPurchase: 500,
    bogoFreeMaxPrice: 500,
    offerTitle: '',
    offerText: '',
    seoTitle: 'Your Brand | Printed Books',
    seoDescription: 'Shop printed books from Your Brand. Browse books, explore offers and order online.',
    seoKeywords: 'books, printed books, bookstore, Your Brand',
    seoImage: '',
    // TODO: prototype-only PIN, visible in source — replace with Firebase Authentication before production
    adminPin: '2468'
  },
  books: [
    {id:'b1', title:'Book Title 01', author:'Author Name', price:299, format:'Paperback', category:'Self Help', rating:4.8, reviews:120, cover:'', featured:true, stock:10, active:true, amazonUrl:'', description:'A placeholder printed book for the first prototype.'},
    {id:'b2', title:'Book Title 02', author:'Author Name', price:549, format:'Hardcover', category:'Motivation', rating:4.7, reviews:98, cover:'', featured:true, stock:8, active:true, amazonUrl:'', description:'A placeholder printed book for the first prototype.'},
    {id:'b3', title:'Book Title 03', author:'Author Name', price:279, format:'Paperback', category:'Spirituality', rating:4.6, reviews:76, cover:'', featured:false, stock:6, active:true, amazonUrl:'', description:'A placeholder printed book for the first prototype.'},
    {id:'b4', title:'Book Title 04', author:'Author Name', price:249, format:'Paperback', category:'Education', rating:4.5, reviews:64, cover:'', featured:false, stock:0, active:true, amazonUrl:'', description:'A placeholder printed book for the first prototype.'},
    {id:'b5', title:'Book Title 05', author:'Author Name', price:239, format:'Paperback', category:'Children Books', rating:4.8, reviews:112, cover:'', featured:false, stock:12, active:true, amazonUrl:'', description:'A placeholder printed book for the first prototype.'},
    {id:'b6', title:'Book Title 06', author:'Author Name', price:289, format:'Hardcover', category:'Fiction', rating:4.4, reviews:85, cover:'', featured:false, stock:5, active:true, amazonUrl:'', description:'A placeholder printed book for the first prototype.'}
  ],
  gallery: [
    {id:'g1', title:'Book Collection', image:'', caption:'A look at our printed editions.'},
    {id:'g2', title:'Reading Corner', image:'', caption:'Cozy spaces made for readers.'},
    {id:'g3', title:'New Arrivals', image:'', caption:'Fresh books for your shelf.'}
  ]
};

window.getStore = function(){
  try {
    const saved = JSON.parse(localStorage.getItem('bookStoreData'));
    if (!saved) return structuredClone(window.STORE_DEFAULTS);
    const merged = structuredClone(window.STORE_DEFAULTS);
    merged.settings = {...merged.settings, ...(saved.settings || {})};
    merged.books = Array.isArray(saved.books) ? saved.books : merged.books;
    merged.gallery = Array.isArray(saved.gallery) ? saved.gallery : merged.gallery;
    return merged;
  } catch { return structuredClone(window.STORE_DEFAULTS); }
};
window.saveStore = function(data){ localStorage.setItem('bookStoreData', JSON.stringify(data)); };
window.ensureStore = function(){ if(!localStorage.getItem('bookStoreData')) saveStore(structuredClone(STORE_DEFAULTS)); return getStore(); };
window.getCart = function(){ try{return JSON.parse(localStorage.getItem('bookCart'))||[]}catch{return [];} };
window.saveCart = function(cart){localStorage.setItem('bookCart', JSON.stringify(cart));};
window.getAnalytics = function(){
  try { return JSON.parse(localStorage.getItem('bookAnalytics')) || {pageViews:0,events:{},pages:{},bookViews:{},lastVisit:''}; }
  catch { return {pageViews:0,events:{},pages:{},bookViews:{},lastVisit:''}; }
};
window.trackEvent = function(name, data){
  try{
    const a=getAnalytics();
    a.events[name]=(a.events[name]||0)+1;
    if(name==='page_view'){
      a.pageViews++;
      const page=(data&&data.page)||location.pathname;
      a.pages[page]=(a.pages[page]||0)+1;
      a.lastVisit=new Date().toISOString();
    }
    if(name==='book_view' && data?.bookId) a.bookViews[data.bookId]=(a.bookViews[data.bookId]||0)+1;
    localStorage.setItem('bookAnalytics',JSON.stringify(a));
  }catch{}
};
