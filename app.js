(function(){
  ensureStore();
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let store=getStore();
  let books=store.books||[];

  const settings=()=>getStore().settings||{};
  function cart(){return getCart();}
  function updateCartCount(){const n=cart().reduce((a,x)=>a+Number(x.qty||0),0); $$('.cart-count').forEach(e=>e.textContent=n);}
  function toast(msg){const t=$('.toast'); if(!t)return; t.textContent=msg;t.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),1800)}
  function coverHTML(b){return b.cover?`<img src="${esc(b.cover)}" alt="${esc(b.title)}">`:`<div class="cover-fallback">${esc(b.title)}</div>`}
  function isAvailable(b){return Boolean(b && b.active!==false && Number(b.stock||0)>0);}
  function cartQty(id){return Number(cart().find(x=>x.id===id)?.qty||0);}

  function offerCalculation(items=cart(), bookList=books){
    const s=settings();
    if(!s.offerEnabled || s.offerType==='none' || !items.length) return {discount:0,label:'',details:'',type:'none'};
    const units=[];
    items.forEach(x=>{
      const b=bookList.find(y=>y.id===x.id); if(!b) return;
      for(let i=0;i<Number(x.qty||0);i++) units.push({id:b.id,title:b.title,price:Number(b.price||0)});
    });
    const subtotal=units.reduce((sum,u)=>sum+u.price,0);
    const minPurchase=Number(s.offerMinPurchase||0);

    if(s.offerType==='percent10'){
      if(subtotal < minPurchase) return {discount:0,label:'',details:`Buy for ${money(minPurchase)} to unlock 10% off`,type:'percent10'};
      const d=Math.round(subtotal*0.10*100)/100;
      return {discount:d,label:'10% OFF',details:`10% discount applied on ${money(subtotal)}`,type:'percent10'};
    }

    if(s.offerType==='bogo500'){
      const qualifying=units.filter(u=>u.price>=minPurchase).sort((a,b)=>b.price-a.price);
      if(!qualifying.length || units.length<2) return {discount:0,label:'Buy 1 Get 1',details:`Buy a book above ${money(minPurchase)} and get another book up to ${money(s.bogoFreeMaxPrice||500)} free.`,type:'bogo500'};
      const paid=qualifying[0];
      const candidates=units.filter((u,i)=>!(u===paid)).filter(u=>u.price<=Number(s.bogoFreeMaxPrice||500)).sort((a,b)=>a.price-b.price);
      if(!candidates.length) return {discount:0,label:'Buy 1 Get 1',details:`Add another book up to ${money(s.bogoFreeMaxPrice||500)} to claim the offer.`,type:'bogo500'};
      const d=Math.min(candidates[0].price,Number(s.bogoFreeMaxPrice||500));
      return {discount:d,label:'Buy 1 Get 1',details:`Free book up to ${money(s.bogoFreeMaxPrice||500)} included.`,type:'bogo500'};
    }

    if(s.offerType==='any2get1'){
      if(units.length<3) return {discount:0,label:'Buy Any 2, Get 1 Free',details:'Add 3 books to activate the free-book offer.',type:'any2get1'};
      const sorted=[...units].sort((a,b)=>b.price-a.price);
      const paidA=sorted[0], paidB=sorted[1];
      const free=sorted.slice(2).sort((a,b)=>a.price-b.price)[0];
      const cap=Math.max(paidA.price,paidB.price);
      const d=Math.min(free.price,cap);
      return {discount:d,label:'Buy Any 2, Get 1 Free',details:`Free book value up to ${money(cap)}.`,type:'any2get1'};
    }

    return {discount:0,label:'',details:'',type:'none'};
  }

  function shippingCalculation(subtotal, distanceKm){
    const s=settings();
    if(!s.deliveryEnabled) return {fee:0,label:'Delivery disabled'};
    if(s.freeShippingEnabled && subtotal>=Number(s.freeShippingThreshold||0)) return {fee:0,label:'FREE'};
    const km=Math.max(0,Number(distanceKm||1));
    const raw=km*Number(s.deliveryFeePerKm||0);
    const minimum=Number(s.deliveryMinimumFee||0);
    const fee=Math.max(minimum,Math.round(raw*100)/100);
    return {fee,label:money(fee)};
  }

  function add(id){
    const b=books.find(x=>x.id===id);if(!b)return;
    if(!isAvailable(b)){toast('This book is out of stock');return;}
    const c=cart();const found=c.find(x=>x.id===id);const current=Number(found?.qty||0);
    if(current>=Number(b.stock||0)){toast(`Only ${b.stock} copy/copies available`);return;}
    if(found)found.qty++;else c.push({id,qty:1});
    saveCart(c);updateCartCount();toast('Added to cart');
    render();
  }

  function render(){
    const grid=$('#bookGrid');if(!grid)return;
    store=getStore();books=store.books||[];
    const q=($('#searchInput')?.value||'').toLowerCase(); const cat=$('#category')?.value||''; const sort=$('#sort')?.value||'featured'; const max=Number($('#priceRange')?.value||2000);
    let list=books.filter(b=>b.active!==false).filter(b=>(!q||(b.title+' '+b.author+' '+b.category).toLowerCase().includes(q))&&(!cat||b.category===cat)&&b.price<=max);
    if(sort==='price-asc')list.sort((a,b)=>a.price-b.price); else if(sort==='price-desc')list.sort((a,b)=>b.price-a.price); else if(sort==='rating')list.sort((a,b)=>b.rating-a.rating); else list.sort((a,b)=>Number(b.featured)-Number(a.featured));
    $('#bookCount').textContent=`${list.length} Books`;
    grid.innerHTML=list.map(b=>{
      const qty=cartQty(b.id); const available=isAvailable(b);
      return `<article class="card book-card ${available?'':'is-out-of-stock'}">
        <div class="book-cover">${qty?`<span class="cart-book-badge">${qty}</span>`:''}${coverHTML(b)}</div>
        <div class="book-info"><h3>${esc(b.title)}</h3><div class="meta">${esc(b.author)}</div><div class="rating">★★★★★ <span class="meta">(${Number(b.reviews||0)})</span></div><div class="price">${money(b.price)}</div>
        <div class="format-row"><span class="tag">${esc(b.format)}</span><span class="tag">${esc(b.category)}</span></div>
        <div class="stock-row">${available?`<span class="stock-ok">● In Stock (${Number(b.stock)})</span>`:`<span class="stock-out">● Out of Stock</span>`}</div>
        <div class="btn-row"><button class="btn btn-primary" data-add="${esc(b.id)}" ${available?'':'disabled'}>${available?'Add to Cart':'Out of Stock'}</button><button class="btn btn-gold" data-buy="${esc(b.id)}" ${available?'':'disabled'}>Buy Now</button></div>
        ${b.amazonUrl?`<a class="btn btn-amazon" target="_blank" rel="noopener noreferrer" href="${esc(b.amazonUrl)}">Buy on Amazon ↗</a>`:''}
        </div></article>`;
    }).join('') || `<div class="panel empty" style="grid-column:1/-1"><div><div class="emoji">📚</div><h3>No books found</h3><p class="muted">Try another search or filter.</p></div></div>`;
    $$('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));
    $$('[data-buy]').forEach(b=>b.onclick=()=>{const target=books.find(x=>x.id===b.dataset.buy);if(!isAvailable(target))return;add(b.dataset.buy);location.href='cart.html'});
    const s=settings(); const offer=offerCalculation([],books); if($('#offerBanner')) $('#offerBanner').innerHTML=s.offerEnabled && s.offerType!=='none' ? `<strong>${esc(s.offerTitle||offer.label)}</strong><span>${esc(s.offerText||offer.details||'Offer available at checkout.')}</span>` : '';
  }

  function initBooks(){
    if(!$('#bookGrid'))return;
    store=getStore();books=store.books||[];
    const cats=[...new Set(books.map(b=>b.category).filter(Boolean))]; if($('#category')) $('#category').innerHTML='<option value="">All Categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    $('#searchInput')?.addEventListener('input',render); $('#sort')?.addEventListener('change',render); $('#category')?.addEventListener('change',render); $('#priceRange')?.addEventListener('input',e=>{$('#priceMax').textContent=money(e.target.value)+'+';render()}); render();
  }

  function cartRender(){
    if(!$('#cartList'))return;
    store=getStore();books=store.books||[]; const c=cart(); const byId=id=>books.find(b=>b.id===id); const list=$('#cartList');
    if(!c.length){list.innerHTML=`<div class="empty"><div><div class="emoji">🛒</div><h2>Your cart is empty</h2><p class="muted">Choose a book and come back here.</p><a class="btn btn-gold" href="index.html">Continue Shopping</a></div></div>`; $('#summary').innerHTML=`<h3>Order Summary</h3><p class="muted">Your cart is empty.</p><a class="btn btn-gold" href="index.html">Browse Books</a>`; return;}
    list.innerHTML=c.map(x=>{const b=byId(x.id);if(!b)return '';return `<div class="cart-item"><div class="cart-thumb">${coverHTML(b)}</div><div><h3 style="margin:0 0 4px">${esc(b.title)}</h3><div class="meta">${esc(b.author)} · ${esc(b.format)}</div><div class="meta">${money(b.price)} each</div><div class="stock-row">${isAvailable(b)?`<span class="stock-ok">${b.stock} available</span>`:`<span class="stock-out">Out of stock</span>`}</div></div><div class="qty"><button data-minus="${esc(b.id)}">−</button><b>${x.qty}</b><button data-plus="${esc(b.id)}">+</button></div><div class="price">${money(b.price*x.qty)} <button class="btn btn-danger" style="margin-left:8px;padding:7px 9px" data-remove="${esc(b.id)}">×</button></div></div>`}).join('');
    $$('#cartList [data-minus]').forEach(e=>e.onclick=()=>changeQty(e.dataset.minus,-1)); $$('#cartList [data-plus]').forEach(e=>e.onclick=()=>changeQty(e.dataset.plus,1)); $$('#cartList [data-remove]').forEach(e=>e.onclick=()=>removeItem(e.dataset.remove));
    const subtotal=c.reduce((s,x)=>{const b=byId(x.id);return s+(b?b.price*x.qty:0)},0); const offer=offerCalculation(c,books); const shipping=shippingCalculation(subtotal,1); const total=Math.max(0,subtotal-offer.discount+shipping.fee);
    $('#summary').innerHTML=`<h3>Order Summary</h3><div class="summary-line"><span>Items</span><b>${money(subtotal)}</b></div><div class="summary-line"><span>Offer</span><b>${offer.discount?'-'+money(offer.discount):'—'}</b></div><div class="summary-line"><span>Shipping</span><b>${shipping.label}</b></div>${offer.details?`<div class="notice">${esc(offer.details)}</div>`:''}<div class="summary-line summary-total"><span>Total</span><b>${money(total)}</b></div><button class="btn btn-gold" style="width:100%;margin-top:12px" id="toCheckout">Proceed to Checkout →</button>`;
    $('#toCheckout').onclick=()=>location.href='checkout.html';
  }
  function changeQty(id,d){const c=cart();const x=c.find(i=>i.id===id);const b=books.find(y=>y.id===id);if(!x||!b)return;x.qty+=d;if(x.qty<=0)return removeItem(id);if(x.qty>Number(b.stock||0)){x.qty=Number(b.stock||0);toast(`Only ${b.stock} available`)}saveCart(c);updateCartCount();cartRender()}
  function removeItem(id){saveCart(cart().filter(x=>x.id!==id));updateCartCount();cartRender()}
  function initCart(){ if(!$('#cartList'))return; $('#clearCart')?.addEventListener('click',()=>{saveCart([]);updateCartCount();cartRender()});cartRender(); }

  function checkout(){
    if(!$('#checkoutForm'))return;
    store=getStore();books=store.books||[];
    const c=cart();
    if(!c.length){location.href='index.html';return;}

    function renderCheckoutSummary(){
      const currentCart=cart();
      const subtotal=currentCart.reduce((sum,x)=>{const b=books.find(y=>y.id===x.id);return sum+(b?b.price*x.qty:0)},0);
      const distance=Math.max(0.1,Number($('#distanceKm')?.value||1));
      const offer=offerCalculation(currentCart,books);
      const shipping=shippingCalculation(subtotal,distance);
      const total=Math.max(0,subtotal-offer.discount+shipping.fee);
      $('#checkoutSummary').innerHTML=`<h3>Order Summary</h3>${currentCart.map(x=>{const b=books.find(b=>b.id===x.id);return b?`<div class="summary-line"><span>${esc(b.title)} × ${x.qty}</span><b>${money(b.price*x.qty)}</b></div>`:''}).join('')}<div class="summary-line"><span>Subtotal</span><b>${money(subtotal)}</b></div><div class="summary-line"><span>Offer</span><b>${offer.discount?'-'+money(offer.discount):'—'}</b></div><div class="summary-line"><span>Delivery</span><b>${shipping.label}</b></div>${offer.details?`<div class="notice">${esc(offer.details)}</div>`:''}<div class="summary-line summary-total"><span>Total</span><b>${money(total)}</b></div>`;
      $('#payBtn').textContent=`Pay ${money(total)} Securely`;
      if($('#deliveryHelp')) $('#deliveryHelp').textContent=settings().deliveryEnabled ? `Delivery fee: ${money(settings().deliveryFeePerKm||0)} per km. Minimum ${money(settings().deliveryMinimumFee||0)}.` : 'Delivery is currently disabled.';
    }

    renderCheckoutSummary();
    $('#distanceKm')?.addEventListener('input',renderCheckoutSummary);
    $('#checkoutForm').addEventListener('submit',e=>{
      e.preventDefault();
      store=getStore();books=store.books||[];
      const currentCart=cart();
      if(!currentCart.length){toast('Your cart is empty');return;}
      for(const item of currentCart){const b=books.find(x=>x.id===item.id);if(!b||!isAvailable(b)||item.qty>Number(b.stock||0)){toast('Please check book availability in your cart');return;}}
      const fd=new FormData(e.target);
      if(!fd.get('name')||!fd.get('phone')||!fd.get('address')||!fd.get('city')||!fd.get('state')||!fd.get('pincode')){toast('Please fill required fields');return;}
      const distanceKm=Math.max(0.1,Number(fd.get('distanceKm')||1));
      const subtotal=currentCart.reduce((sum,x)=>{const b=books.find(y=>y.id===x.id);return sum+(b?b.price*x.qty:0)},0);
      const off=offerCalculation(currentCart,books); const ship=shippingCalculation(subtotal,distanceKm); const finalTotal=Math.max(0,subtotal-off.discount+ship.fee);
      const order={id:'ORD-'+Date.now().toString().slice(-8),date:new Date().toLocaleString('en-IN'),customer:Object.fromEntries(fd.entries()),items:currentCart,total:finalTotal,subtotal,discount:off.discount,discountLabel:off.label,shipping:ship.fee,paymentStatus:'Demo'};
      localStorage.setItem('lastOrder',JSON.stringify(order));
      const existingOrders=JSON.parse(localStorage.getItem('bookOrders')||'[]');existingOrders.unshift(order);localStorage.setItem('bookOrders',JSON.stringify(existingOrders.slice(0,200)));
      books=books.map(b=>{const item=currentCart.find(x=>x.id===b.id);return item?{...b,stock:Math.max(0,Number(b.stock||0)-Number(item.qty||0))}:b});store.books=books;saveStore(store);saveCart([]);location.href='success.html';
    });
  }

  function success(){if(!$('#successBox'))return; const o=JSON.parse(localStorage.getItem('lastOrder')||'null');if(!o){location.href='index.html';return;} store=getStore();books=store.books||[];$('#successBox').innerHTML=`<div class="success-icon">✓</div><h1>Order Placed Successfully!</h1><p>Thank you for your order. Your books will be shipped soon.</p><div class="timeline"><div class="step"><b>Order Placed</b><br><span class="meta">${esc(o.date)}</span></div><div class="step"><b>Packed</b><br><span class="meta">Processing</span></div><div class="step"><b>Shipped</b><br><span class="meta">Tracking soon</span></div><div class="step"><b>Delivered</b><br><span class="meta">Est. 3–7 days</span></div></div>`;$('#orderDetails').innerHTML=`<h2>Order Details</h2><div class="summary-line"><span>Order ID</span><b>${esc(o.id)}</b></div>${(o.items||[]).map(x=>{const b=books.find(b=>b.id===x.id);return `<div class="summary-line"><span>${esc(b?.title||x.id)} × ${x.qty}</span><b>${money((b?.price||0)*x.qty)}</b></div>`}).join('')}<div class="summary-line"><span>Offer</span><b>${o.discount?'-'+money(o.discount):'—'}</b></div><div class="summary-line"><span>Delivery</span><b>${o.shipping?money(o.shipping):'FREE'}</b></div><div class="summary-line summary-total"><span>Total Paid</span><b>${money(o.total)}</b></div>`;$('#addressBox').innerHTML=`<h3>Shipping Address</h3><p style="line-height:1.6;margin-bottom:0">${esc(o.customer.name)}<br>${esc(o.customer.address)}<br>${esc(o.customer.city)}, ${esc(o.customer.state)} - ${esc(o.customer.pincode)}<br>Mobile: ${esc(o.customer.phone)}</p>`}

  function common(){
    updateCartCount(); const s=getStore().settings||{};
    $$('.brand-name').forEach(e=>e.textContent=s.brandName||'Your Brand');$$('.tagline').forEach(e=>e.textContent=s.tagline||'');
    $$('.whatsapp').forEach(e=>e.href=`https://wa.me/${String(s.whatsapp||'').replace(/\D/g,'')}`);$$('.phone').forEach(e=>e.href=`tel:${s.phone||''}`);$$('.location').forEach(e=>e.href=s.locationUrl||'#');
    $('#heroTitle')&&($('#heroTitle').textContent=s.heroTitle||'Discover Books That Inspire Change');$('#heroText')&&($('#heroText').textContent=s.heroText||'');$('#supportText')&&($('#supportText').textContent=s.supportText||'');
    $$('.delivery-status').forEach(e=>e.textContent=s.deliveryEnabled?'Delivery Available':'Delivery Currently Disabled');
  }

  initBooks();initCart();checkout();success();common();
})();
