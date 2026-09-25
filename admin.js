(function(){
  ensureStore();
  let store=getStore();
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const orders=()=>JSON.parse(localStorage.getItem('bookOrders')||'[]');
  const enquiries=()=>JSON.parse(localStorage.getItem('bookEnquiries')||'[]');
  function toast(m){const t=$('.toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),1600)}
  function save(){saveStore(store);store=getStore();toast('Saved')}
  function show(id){$$('.admin-section').forEach(x=>x.classList.toggle('hidden',x.id!==id));$$('.admin-side button').forEach(x=>x.classList.toggle('active',x.dataset.target===id));if(id==='dashboard')dashboard();if(id==='books')books();if(id==='orders')renderOrders();if(id==='gallery')renderGallery();if(id==='enquiries')renderEnquiries();if(id==='home')loadHome();if(id==='contact')loadContact();window.scrollTo({top:0,behavior:'smooth'})}
  $$('.admin-side button').forEach(b=>b.onclick=()=>show(b.dataset.target));
  $$('[data-quick]').forEach(b=>b.onclick=()=>show(b.dataset.quick));

  function dashboard(){
    const os=orders();const en=enquiries();
    $('#dashStats').innerHTML=`<div class="stat"><span class="meta">Books</span><b>${store.books.length}</b><small>in catalog</small></div><div class="stat"><span class="meta">Orders</span><b>${os.length}</b><small>prototype orders</small></div><div class="stat"><span class="meta">Enquiries</span><b>${en.length}</b><small>customer messages</small></div><div class="stat"><span class="meta">Gallery</span><b>${store.gallery.length}</b><small>media items</small></div>`;
    const recent=$('#recentOrders');
    recent.innerHTML=os.slice(0,5).map(o=>`<div class="mini-row"><div><b>${esc(o.id)}</b><div class="meta">${esc(o.customer?.name||'Guest')} · ${esc(o.date||'')}</div></div><strong>${money(o.total)}</strong></div>`).join('')||`<div class="empty-lite">No orders yet. Complete a mock checkout to see one here.</div>`;
  }

  function loadHome(){const s=store.settings;['brandName','tagline','heroTitle','heroText','supportText'].forEach(k=>{const e=$('#s_'+k);if(e)e.value=s[k]||''})}
  $('#settingsForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);for(const [k,v] of fd.entries())store.settings[k]=String(v);save()};

  function loadContact(){const s=store.settings;$('#s_whatsapp').value=s.whatsapp||'';$('#s_phone').value=s.phone||'';$('#s_locationLabel').value=s.locationLabel||'';$('#s_locationUrl').value=s.locationUrl||'';$('#s_supportText2').value=s.supportText||''}
  $('#contactForm').onsubmit=e=>{e.preventDefault();store.settings.whatsapp=$('#s_whatsapp').value.trim();store.settings.phone=$('#s_phone').value.trim();store.settings.locationLabel=$('#s_locationLabel').value.trim();store.settings.locationUrl=$('#s_locationUrl').value.trim();store.settings.supportText=$('#s_supportText2').value.trim();save()};

  function clearBookForm(){$('#bookForm').reset();$('#bookId').value='';$('#bookCoverData').value='';$('#bookPreview').innerHTML='<span class="meta">No cover selected.</span>'}
  function fillBook(id){const b=store.books.find(x=>x.id===id);if(!b)return;$('#bookId').value=b.id;$('#bookTitle').value=b.title||'';$('#bookAuthor').value=b.author||'';$('#bookPrice').value=b.price??0;$('#bookFormat').value=b.format||'Paperback';$('#bookCategory').value=b.category||'';$('#bookRating').value=b.rating??0;$('#bookReviews').value=b.reviews??0;$('#bookDescription').value=b.description||'';$('#bookCoverUrl').value=b.cover&&String(b.cover).startsWith('data:')?'':(b.cover||'');$('#bookCoverData').value=b.cover&&String(b.cover).startsWith('data:')?b.cover:'';$('#bookPreview').innerHTML=b.cover?`<img src="${esc(b.cover)}" alt="${esc(b.title)}" class="admin-cover-preview">`:'<span class="meta">No cover selected.</span>';show('books')}
  function filteredBooks(){const q=($('#bookAdminSearch').value||'').toLowerCase();return store.books.filter(b=>(b.title+' '+b.author+' '+b.category).toLowerCase().includes(q))}
  function books(){const tb=$('#booksTable');tb.innerHTML=filteredBooks().map(b=>`<tr><td><div class="table-book"><div class="table-thumb">${b.cover?`<img src="${esc(b.cover)}" alt="">`:'📘'}</div><div><b>${esc(b.title)}</b><div class="meta">${esc(b.description||'')}</div></div></div></td><td>${esc(b.author)}</td><td><strong>${money(b.price)}</strong></td><td>${esc(b.format)}</td><td>${esc(b.category)}</td><td><span class="status-pill">Published</span></td><td class="action-cell"><button class="btn btn-light" data-edit="${esc(b.id)}">Edit</button><button class="btn btn-danger" data-del="${esc(b.id)}">Delete</button></td></tr>`).join('')||`<tr><td colspan="7" class="empty-lite">No books match your search.</td></tr>`;$$('[data-edit]').forEach(b=>b.onclick=()=>fillBook(b.dataset.edit));$$('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('Delete this book?'))return;store.books=store.books.filter(x=>x.id!==b.dataset.del);save();books()})}
  $('#bookAdminSearch').oninput=books;
  $('#newBook').onclick=()=>{clearBookForm();show('books');$('#bookTitle').focus()};$('#cancelBook').onclick=clearBookForm;
  $('#bookCoverFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('#bookCoverData').value=r.result;$('#bookPreview').innerHTML=`<img src="${esc(r.result)}" alt="Preview" class="admin-cover-preview">`};r.readAsDataURL(f)};
  $('#bookForm').onsubmit=e=>{e.preventDefault();const id=$('#bookId').value||('b'+Date.now());const existing=store.books.find(x=>x.id===id);const cover=$('#bookCoverData').value||$('#bookCoverUrl').value.trim()||existing?.cover||'';const item={id,title:$('#bookTitle').value.trim()||'Untitled Book',author:$('#bookAuthor').value.trim()||'Author Name',price:Number($('#bookPrice').value||0),format:$('#bookFormat').value,category:$('#bookCategory').value.trim()||'Others',rating:Number($('#bookRating').value||0),reviews:Number($('#bookReviews').value||0),cover,featured:existing?.featured||false,description:$('#bookDescription').value.trim()};if(existing)store.books=store.books.map(x=>x.id===id?item:x);else store.books.push(item);save();clearBookForm();books();};

  function renderOrders(){const tb=$('#ordersTable');const arr=orders();tb.innerHTML=arr.map(o=>{const count=(o.items||[]).reduce((s,x)=>s+Number(x.qty||0),0);return `<tr><td><b>${esc(o.id)}</b></td><td>${esc(o.date)}</td><td>${esc(o.customer?.name||'')}</td><td>${esc(o.customer?.phone||'')}</td><td>${count}</td><td><strong>${money(o.total)}</strong></td><td><span class="status-pill success">Placed</span></td></tr>`}).join('')||`<tr><td colspan="7" class="empty-lite">No orders yet.</td></tr>`}
  $('#clearOrders').onclick=()=>{if(confirm('Clear all prototype orders?')){localStorage.removeItem('bookOrders');dashboard();renderOrders()}};

  function renderGallery(){const el=$('#galleryAdminGrid');el.innerHTML=store.gallery.map(g=>`<article class="admin-gallery-card"><div class="admin-gallery-image">${g.image?`<img src="${esc(g.image)}" alt="${esc(g.title)}">`:'📚'}</div><div class="admin-gallery-body"><b>${esc(g.title)}</b><p class="meta">${esc(g.caption||'')}</p><button class="btn btn-danger" data-gdel="${esc(g.id)}">Delete</button></div></article>`).join('')||`<div class="empty-lite">No gallery items.</div>`;$$('[data-gdel]').forEach(b=>b.onclick=()=>{if(!confirm('Delete this gallery item?'))return;store.gallery=store.gallery.filter(x=>x.id!==b.dataset.gdel);save();renderGallery()})}
  $('#galleryForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);const img=$('#galleryData').value||$('#galleryUrl').value.trim();store.gallery.push({id:'g'+Date.now(),title:String(fd.get('title')||'Untitled'),caption:String(fd.get('caption')||''),image:img});save();e.target.reset();$('#galleryData').value='';renderGallery()};
  $('#galleryFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>$('#galleryData').value=r.result;r.readAsDataURL(f)};

  function renderEnquiries(){const tb=$('#enquiriesTable');const arr=enquiries();tb.innerHTML=arr.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.name||'')}</b></td><td>${esc(x.phone||'')}</td><td>${esc(x.email||'')}</td><td class="message-cell">${esc(x.message||'')}</td><td>${esc(x.date||'')}</td><td><a class="btn btn-light" href="tel:${esc(x.phone||'')}">Call</a></td></tr>`).join('')||`<tr><td colspan="7" class="empty-lite">No enquiries yet.</td></tr>`}
  $('#clearEnquiries').onclick=()=>{if(confirm('Clear all enquiries?')){localStorage.removeItem('bookEnquiries');dashboard();renderEnquiries()}};
  $('#resetStore').onclick=()=>{if(confirm('Reset demo catalog, gallery and settings?')){saveStore(structuredClone(STORE_DEFAULTS));localStorage.removeItem('bookCart');localStorage.removeItem('bookOrders');localStorage.removeItem('bookEnquiries');localStorage.removeItem('lastOrder');location.reload()}};
  clearBookForm();loadHome();loadContact();dashboard();show('dashboard');
})();
