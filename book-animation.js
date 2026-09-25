(function(){
  const canvas = document.getElementById('bookAnimationCanvas');
  if (!canvas || !window.THREE) return;

  const wrap = canvas.parentElement;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040813);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 5.6, 7.8);
  camera.lookAt(0, 0.65, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const floorGeo = new THREE.PlaneGeometry(35, 35);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x03060f, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  const ambientLight = new THREE.AmbientLight(0x0c172e, 1.4);
  scene.add(ambientLight);

  const spotLight = new THREE.SpotLight(0xffe5b8, 4.4);
  spotLight.position.set(3.4, 8.0, 4.2);
  spotLight.angle = Math.PI / 5;
  spotLight.penumbra = 0.65;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 15;
  spotLight.shadow.bias = -0.0004;
  scene.add(spotLight);
  spotLight.target.position.set(0, 0.7, 0);
  scene.add(spotLight.target);

  const rimLight = new THREE.DirectionalLight(0x193b6d, 1.6);
  rimLight.position.set(-5, 4.5, -4);
  scene.add(rimLight);

  const paperEdgeCanvas = document.createElement('canvas');
  paperEdgeCanvas.width = 128;
  paperEdgeCanvas.height = 512;
  const peCtx = paperEdgeCanvas.getContext('2d');
  peCtx.fillStyle = '#f3eedf';
  peCtx.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 512; i += 2) {
    peCtx.strokeStyle = (i % 6 === 0) ? '#d9cdb4' : (i % 4 === 0) ? '#e4dabf' : '#ede3cd';
    peCtx.lineWidth = 1;
    peCtx.beginPath();
    peCtx.moveTo(0, i);
    peCtx.lineTo(128, i);
    peCtx.stroke();
  }
  const paperEdgeTexture = new THREE.CanvasTexture(paperEdgeCanvas);

  const matNavyCover   = new THREE.MeshStandardMaterial({ color: 0x091b38, roughness: 0.35 });
  const matOrangeCover = new THREE.MeshStandardMaterial({ color: 0xd65016, roughness: 0.40 });
  const matGreenCover  = new THREE.MeshStandardMaterial({ color: 0x114227, roughness: 0.38 });
  const matGold        = new THREE.MeshStandardMaterial({ color: 0xf5c342, metalness: 0.95, roughness: 0.16 });
  const matPaperSides  = new THREE.MeshStandardMaterial({ map: paperEdgeTexture, roughness: 0.75 });
  const matPaperFace   = new THREE.MeshStandardMaterial({ color: 0xf5eedc, roughness: 0.65 });

  const canvasSize = 1024;
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = canvasSize;
  pageCanvas.height = canvasSize;
  const ctx = pageCanvas.getContext('2d');
  const pageTexture = new THREE.CanvasTexture(pageCanvas);
  pageTexture.anisotropy = 8;

  const quoteLine1 = 'A reader lives';
  const quoteLine2 = 'a thousand lives.';
  const l1_startX = 220, l1_endX = 810, l1_Y = 460;
  const l2_startX = 240, l2_endX = 790, l2_Y = 575;
  const fl_startX = 260, fl_endX = 760, fl_Y = 660;

  function drawPageBackground() {
    ctx.fillStyle = '#faf5e8';
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.strokeStyle = '#e5dabf';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, canvasSize - 100, canvasSize - 100);
    ctx.strokeStyle = '#f0e6ce';
    ctx.lineWidth = 1;
    ctx.strokeRect(58, 58, canvasSize - 116, canvasSize - 116);
  }
  drawPageBackground();

  const bookW = 2.4;
  const bookD = 3.3;
  const totalBookH = 0.38;
  const boardT = 0.045;
  const dropStartHeight = 8.5;

  function buildRealisticBook(coverMat) {
    const bookGroup = new THREE.Group();
    const pageW = bookW - 0.12;
    const pageD = bookD - 0.16;
    const pageH = totalBookH - (boardT * 2);

    const bottomCover = new THREE.Mesh(new THREE.BoxGeometry(bookW, boardT, bookD), coverMat);
    bottomCover.position.set(0, -(totalBookH / 2) + (boardT / 2), 0);
    bottomCover.castShadow = true; bottomCover.receiveShadow = true;
    bookGroup.add(bottomCover);

    const spine = new THREE.Mesh(new THREE.BoxGeometry(boardT, totalBookH, bookD), coverMat);
    spine.position.set(-(bookW / 2) + (boardT / 2), 0, 0);
    spine.castShadow = true; spine.receiveShadow = true;
    bookGroup.add(spine);

    const topCover = new THREE.Mesh(new THREE.BoxGeometry(bookW, boardT, bookD), coverMat);
    topCover.position.set(0, (totalBookH / 2) - (boardT / 2), 0);
    topCover.castShadow = true; topCover.receiveShadow = true;
    bookGroup.add(topCover);

    const paperMats = [matPaperSides, coverMat, matPaperFace, matPaperFace, matPaperSides, matPaperSides];
    const pagesMesh = new THREE.Mesh(new THREE.BoxGeometry(pageW, pageH, pageD), paperMats);
    pagesMesh.position.set(0.06, 0, 0);
    pagesMesh.castShadow = true; pagesMesh.receiveShadow = true;
    bookGroup.add(pagesMesh);
    return bookGroup;
  }

  const book1 = buildRealisticBook(matNavyCover);
  const book2 = buildRealisticBook(matOrangeCover);
  const book3 = buildRealisticBook(matGreenCover);
  scene.add(book1, book2, book3);

  const book4Group = new THREE.Group();
  scene.add(book4Group);
  const b4PageW = bookW - 0.12;
  const b4PageD = bookD - 0.16;
  const b4PageH = totalBookH - (boardT * 2);

  const b4Bottom = new THREE.Mesh(new THREE.BoxGeometry(bookW, boardT, bookD), matNavyCover);
  b4Bottom.position.set(0, -(totalBookH / 2) + (boardT / 2), 0);
  b4Bottom.castShadow = true; b4Bottom.receiveShadow = true;
  book4Group.add(b4Bottom);

  const b4Spine = new THREE.Mesh(new THREE.BoxGeometry(boardT, totalBookH, bookD), matNavyCover);
  b4Spine.position.set(-(bookW / 2) + (boardT / 2), 0, 0);
  b4Spine.castShadow = true; b4Spine.receiveShadow = true;
  book4Group.add(b4Spine);

  const b4TopPageMat = new THREE.MeshStandardMaterial({ map: pageTexture, roughness: 0.65 });
  const b4PaperMats = [matPaperSides, matNavyCover, b4TopPageMat, matPaperFace, matPaperSides, matPaperSides];
  const b4Pages = new THREE.Mesh(new THREE.BoxGeometry(b4PageW, b4PageH, b4PageD), b4PaperMats);
  b4Pages.position.set(0.06, 0, 0);
  b4Pages.castShadow = true; b4Pages.receiveShadow = true;
  book4Group.add(b4Pages);

  const coverHinge = new THREE.Group();
  coverHinge.position.set(-bookW / 2, (totalBookH / 2) - boardT, 0);
  book4Group.add(coverHinge);

  const b4TopCover = new THREE.Mesh(new THREE.BoxGeometry(bookW, boardT, bookD), matNavyCover);
  b4TopCover.position.set(bookW / 2, boardT / 2, 0);
  b4TopCover.castShadow = true; b4TopCover.receiveShadow = true;
  coverHinge.add(b4TopCover);

  const penGroup = new THREE.Group();
  scene.add(penGroup);
  const penBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 1.4, 24), matGold);
  penBody.castShadow = true;
  penGroup.add(penBody);
  const clipMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.7, 0.03), matGold);
  clipMesh.position.set(0, 0.25, 0.055);
  clipMesh.castShadow = true;
  penGroup.add(clipMesh);
  const penNib = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 24), matGold);
  penNib.rotation.x = Math.PI;
  penNib.castShadow = true;
  penGroup.add(penNib);
  penBody.position.y = 0.80;
  clipMesh.position.y = 1.05;
  penNib.position.y = 0.10;

  function canvasToWorld(cx, cy) {
    const topPageY = (totalBookH * 3) + (totalBookH / 2) + 0.055;
    const normX = ((cx / canvasSize) - 0.5) * b4PageW + 0.06;
    const normZ = ((cy / canvasSize) - 0.5) * b4PageD;
    return new THREE.Vector3(normX, topPageY, normZ);
  }

  function renderHandwriting(progressL1, progressL2, progressFlourish) {
    drawPageBackground();
    ctx.fillStyle = '#0a1733';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = "italic 76px Georgia, 'Times New Roman', serif";

    if (progressL1 > 0) {
      ctx.save();
      const curX = l1_startX + (l1_endX - l1_startX) * progressL1;
      ctx.rect(0, l1_Y - 95, curX, 130);
      ctx.clip();
      ctx.fillText(quoteLine1, l1_startX, l1_Y);
      ctx.restore();
    }
    if (progressL2 > 0) {
      ctx.save();
      const curX = l2_startX + (l2_endX - l2_startX) * progressL2;
      ctx.rect(0, l2_Y - 95, curX, 130);
      ctx.clip();
      ctx.fillText(quoteLine2, l2_startX, l2_Y);
      ctx.restore();
    }
    if (progressFlourish > 0) {
      ctx.save();
      ctx.strokeStyle = '#0a1733';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const totalSteps = 60;
      const currentSteps = Math.floor(progressFlourish * totalSteps);
      for (let s = 0; s <= currentSteps; s++) {
        const t = s / totalSteps;
        const x = fl_startX + (fl_endX - fl_startX) * t;
        const y = fl_Y + Math.sin(t * Math.PI) * -18;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    pageTexture.needsUpdate = true;
  }

  let startTime = performance.now();

  function easeDrop(t) {
    if (t < 0.6) {
      const p = t / 0.6; return p * p;
    }
    if (t < 0.8) {
      const p = (t - 0.6) / 0.2; return 1 - (0.16 * Math.sin(p * Math.PI));
    }
    const p = (t - 0.8) / 0.2; return 1 - (0.04 * Math.sin(p * Math.PI));
  }

  function getDropY(time, startT, landT, startY, landY) {
    if (time <= startT) return startY;
    if (time >= landT) return landY;
    const progress = (time - startT) / (landT - startT);
    return startY + (landY - startY) * easeDrop(progress);
  }

  function resize() {
    const w = Math.max(320, wrap.clientWidth || window.innerWidth);
    const h = Math.max(300, wrap.clientHeight || 420);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  let animationFinished = false;

  function renderLoop(currentTime) {
    if (animationFinished) return;
    const elapsed = (currentTime - startTime) / 1000;

    const y1 = totalBookH / 2;
    const y2 = y1 + totalBookH;
    const y3 = y2 + totalBookH;
    const y4 = y3 + totalBookH;

    book1.position.y = getDropY(elapsed, 0.1, 0.8, dropStartHeight, y1);
    book2.position.y = getDropY(elapsed, 0.85, 1.5, dropStartHeight, y2);
    book3.position.y = getDropY(elapsed, 1.55, 2.15, dropStartHeight, y3);
    book4Group.position.y = getDropY(elapsed, 2.2, 2.8, dropStartHeight, y4);

    const openStart = 3.2, openEnd = 4.6;
    if (elapsed < openStart) coverHinge.rotation.z = 0;
    else if (elapsed <= openEnd) {
      const p = (elapsed - openStart) / (openEnd - openStart);
      const smoothP = 0.5 - 0.5 * Math.cos(p * Math.PI);
      coverHinge.rotation.z = smoothP * Math.PI * 0.95;
    } else coverHinge.rotation.z = Math.PI * 0.95;

    const penFlyInStart = 4.6, penFlyInEnd = 5.5;
    const l1_start = 5.5, l1_end = 7.3;
    const transition_start = 7.3, transition_end = 7.7;
    const l2_start = 7.7, l2_end = 9.4;
    const fl_start = 9.4, fl_end = 10.3;
    const rest_start = 10.3, rest_end = 11.2;

    let pL1 = 0, pL2 = 0, pFl = 0;
    const startWorldPos = canvasToWorld(l1_startX, l1_Y);

    if (elapsed < penFlyInStart) {
      penGroup.position.set(3.5, 5.0, 3.2);
      penGroup.rotation.set(0.35, -0.2, 0.45);
    } else if (elapsed < penFlyInEnd) {
      const p = (elapsed - penFlyInStart) / (penFlyInEnd - penFlyInStart);
      const smoothP = 0.5 - 0.5 * Math.cos(p * Math.PI);
      penGroup.position.lerpVectors(new THREE.Vector3(3.5, 5.0, 3.2), startWorldPos, smoothP);
      penGroup.rotation.x = THREE.MathUtils.lerp(0.35, 0.28, smoothP);
      penGroup.rotation.y = THREE.MathUtils.lerp(-0.2, -0.15, smoothP);
      penGroup.rotation.z = THREE.MathUtils.lerp(0.45, 0.38, smoothP);
    } else if (elapsed < l1_end) {
      pL1 = (elapsed - l1_start) / (l1_end - l1_start);
      const curX = l1_startX + (l1_endX - l1_startX) * pL1;
      const curY = l1_Y + Math.sin(pL1 * 32) * 8;
      penGroup.position.copy(canvasToWorld(curX, curY));
      penGroup.rotation.set(0.28, -0.15, 0.38);
    } else if (elapsed < transition_end) {
      pL1 = 1;
      const p = (elapsed - transition_start) / (transition_end - transition_start);
      const smoothP = 0.5 - 0.5 * Math.cos(p * Math.PI);
      const pos1 = canvasToWorld(l1_endX, l1_Y);
      const pos2 = canvasToWorld(l2_startX, l2_Y);
      penGroup.position.lerpVectors(pos1, pos2, smoothP);
      penGroup.position.y += Math.sin(smoothP * Math.PI) * 0.12;
    } else if (elapsed < l2_end) {
      pL1 = 1;
      pL2 = (elapsed - l2_start) / (l2_end - l2_start);
      const curX = l2_startX + (l2_endX - l2_startX) * pL2;
      const curY = l2_Y + Math.sin(pL2 * 36) * 8;
      penGroup.position.copy(canvasToWorld(curX, curY));
      penGroup.rotation.set(0.28, -0.15, 0.38);
    } else if (elapsed < fl_end) {
      pL1 = 1; pL2 = 1;
      pFl = (elapsed - fl_start) / (fl_end - fl_start);
      const curX = fl_startX + (fl_endX - fl_startX) * pFl;
      const curY = fl_Y + Math.sin(pFl * Math.PI) * -18;
      penGroup.position.copy(canvasToWorld(curX, curY));
      penGroup.rotation.set(0.25, -0.12, 0.35);
    } else if (elapsed < rest_end) {
      pL1 = 1; pL2 = 1; pFl = 1;
      const p = (elapsed - rest_start) / (rest_end - rest_start);
      const smoothP = 0.5 - 0.5 * Math.cos(p * Math.PI);
      const endFlPos = canvasToWorld(fl_endX, fl_Y);
      penGroup.position.set(endFlPos.x + 0.18 * smoothP, endFlPos.y + 0.25 * smoothP, endFlPos.z - 0.12 * smoothP);
      penGroup.rotation.set(0.20, -0.08, 0.30);
    } else {
      pL1 = 1; pL2 = 1; pFl = 1;
      animationFinished = true;
      // Freeze the exact final frame. No element is removed or faded out.
      book1.position.y = y1;
      book2.position.y = y2;
      book3.position.y = y3;
      book4Group.position.y = y4;
      coverHinge.rotation.z = Math.PI * 0.95;
      const endFlPos = canvasToWorld(fl_endX, fl_Y);
      penGroup.position.set(endFlPos.x + 0.18, endFlPos.y + 0.25, endFlPos.z - 0.12);
      penGroup.rotation.set(0.20, -0.08, 0.30);
      renderHandwriting(1, 1, 1);
      camera.position.x = 0;
      camera.lookAt(0, 0.72, 0);
      renderer.render(scene, camera);
      return;
    }

    renderHandwriting(pL1, pL2, pFl);
    camera.position.x = Math.sin(elapsed * 0.28) * 0.18;
    camera.lookAt(0, 0.72, 0);
    renderer.render(scene, camera);
    if (!animationFinished) requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
})();
