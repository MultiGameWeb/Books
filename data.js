window.STORE_DEFAULTS = {
  settings: {
    brandName: 'Your Brand',
    tagline: 'Books for a Better Tomorrow',
    heroTitle: 'Discover Books That Inspire Change',
    heroText: 'Explore printed books to learn, grow and be inspired.',
    whatsapp: '919876543210',
    phone: '+91 98765 43210',
    locationLabel: 'Our Location',
    locationUrl: 'https://maps.google.com/',
    supportText: 'Have a question? We are here to help.'
  },
  books: [
    {id:'b1', title:'Book Title 01', author:'Author Name', price:299, format:'Paperback', category:'Self Help', rating:4.8, reviews:120, cover:'', featured:true, description:'A placeholder printed book for the first prototype.'},
    {id:'b2', title:'Book Title 02', author:'Author Name', price:349, format:'Hardcover', category:'Motivation', rating:4.7, reviews:98, cover:'', featured:true, description:'A placeholder printed book for the first prototype.'},
    {id:'b3', title:'Book Title 03', author:'Author Name', price:279, format:'Paperback', category:'Spirituality', rating:4.6, reviews:76, cover:'', featured:false, description:'A placeholder printed book for the first prototype.'},
    {id:'b4', title:'Book Title 04', author:'Author Name', price:249, format:'Paperback', category:'Education', rating:4.5, reviews:64, cover:'', featured:false, description:'A placeholder printed book for the first prototype.'},
    {id:'b5', title:'Book Title 05', author:'Author Name', price:239, format:'Paperback', category:'Children Books', rating:4.8, reviews:112, cover:'', featured:false, description:'A placeholder printed book for the first prototype.'},
    {id:'b6', title:'Book Title 06', author:'Author Name', price:289, format:'Hardcover', category:'Fiction', rating:4.4, reviews:85, cover:'', featured:false, description:'A placeholder printed book for the first prototype.'}
  ],
  gallery: [
    {id:'g1', title:'Book Collection', image:'', caption:'A look at our printed editions.'},
    {id:'g2', title:'Reading Corner', image:'', caption:'Cozy spaces made for readers.'},
    {id:'g3', title:'New Arrivals', image:'', caption:'Fresh books for your shelf.'}
  ]
};

window.getStore = function(){
  try { return JSON.parse(localStorage.getItem('bookStoreData')) || structuredClone(window.STORE_DEFAULTS); }
  catch { return structuredClone(window.STORE_DEFAULTS); }
};
window.saveStore = function(data){ localStorage.setItem('bookStoreData', JSON.stringify(data)); };
window.ensureStore = function(){ if(!localStorage.getItem('bookStoreData')) saveStore(structuredClone(STORE_DEFAULTS)); return getStore(); };
window.getCart = function(){ try{return JSON.parse(localStorage.getItem('bookCart'))||[]}catch{return [];} };
window.saveCart = function(cart){localStorage.setItem('bookCart', JSON.stringify(cart));};
