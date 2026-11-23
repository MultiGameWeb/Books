
    /**
     * ============================================================================
     * CINEMATIC BOOK HERO CONTROLLER
     * Self-contained animation engine for:
     *  1. Golden floating dust mote particle system (HTML5 Canvas)
     *  2. 3D hardcover book opening, continuous page-flipping loop & cursor tilt
     *  3. Video-style timed quote reel with play/pause, scrubbing & replay
     * ============================================================================
     */
    (function () {
      'use strict';

      /* --------------------------------------------------------------------------
         1. FLOATING GOLDEN LIGHT PARTICLES (DUST MOTES)
         -------------------------------------------------------------------------- */
      const canvas = document.getElementById('dust-canvas');
      const ctx = canvas.getContext('2d');
      let particles = [];
      let canvasWidth = 0;
      let canvasHeight = 0;

      function resizeCanvas() {
        if (!canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvasWidth = canvas.clientWidth;
        canvasHeight = canvas.clientHeight;
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function createParticles() {
        const count = Math.min(65, Math.max(28, Math.floor((canvasWidth * canvasHeight) / 22000)));
        particles = [];
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            radius: Math.random() * 2.1 + 0.6,
            vx: (Math.random() - 0.5) * 0.28,
            vy: -(Math.random() * 0.35 + 0.12), // Gentle upward drift like warm air motes
            alpha: Math.random() * 0.65 + 0.2,
            pulseSpeed: Math.random() * 0.02 + 0.008,
            pulsePhase: Math.random() * Math.PI * 2
          });
        }
      }

      function renderParticles(isPlaying) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          if (isPlaying) {
            p.x += p.vx;
            p.y += p.vy;
            p.pulsePhase += p.pulseSpeed;

            // Wrap seamlessly around viewport edges
            if (p.y < -10) {
              p.y = canvasHeight + 10;
              p.x = Math.random() * canvasWidth;
            }
            if (p.x < -10) p.x = canvasWidth + 10;
            if (p.x > canvasWidth + 10) p.x = -10;
          }

          const twinkle = 0.55 + 0.45 * Math.sin(p.pulsePhase);
          const currentAlpha = p.alpha * twinkle;

          // Soft warm golden glow per mote
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3.2);
          gradient.addColorStop(0, `rgba(255, 240, 185, ${currentAlpha})`);
          gradient.addColorStop(0.5, `rgba(212, 175, 55, ${currentAlpha * 0.45})`);
          gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }

      /* --------------------------------------------------------------------------
         2. 3D BOOK CHOREOGRAPHY & CURSOR PARALLAX TILT
         -------------------------------------------------------------------------- */
      const heroStage = document.getElementById('literary-hero');
      const bookRig = document.getElementById('book-rig');
      const flipPages = Array.from(document.querySelectorAll('.flip-page'));

      let isBookOpen = false;
      let targetTiltX = 0;
      let targetTiltY = 0;
      let currentTiltX = 0;
      let currentTiltY = 0;
      let pageTurnIndex = 0;
      let pageFlipTimer = null;
      let openDelayTimer = null;

      // Smooth cursor & touch tilt interaction
      function handlePointerMove(clientX, clientY) {
        const rect = heroStage.getBoundingClientRect();
        const normX = ((clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
        const normY = ((clientY - rect.top) / rect.height - 0.5) * 2; // -1 to 1
        targetTiltY = normX * 11;   // Horizontal cursor tilts Y axis
        targetTiltX = -normY * 8;   // Vertical cursor tilts X axis
      }

      heroStage.addEventListener('mousemove', (e) => {
        handlePointerMove(e.clientX, e.clientY);
      });

      heroStage.addEventListener('mouseleave', () => {
        targetTiltX = 0;
        targetTiltY = 0;
      });

      heroStage.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 0) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      heroStage.addEventListener('touchend', () => {
        targetTiltX = 0;
        targetTiltY = 0;
      });

      function updateBookTransform() {
        // Smooth damping toward cursor target
        currentTiltX += (targetTiltX - currentTiltX) * 0.06;        currentTiltY += (targetTiltY - currentTiltY) * 0.06;

        const baseX = isBookOpen ? 'calc(var(--book-w) * 0.5)' : '0px';
        const baseRotX = (isBookOpen ? 12 : 14) + currentTiltX;
        const baseRotY = (isBookOpen ? 0 : -18) + currentTiltY;
        const baseRotZ = isBookOpen ? 0 : -2;

        bookRig.style.transform = `translateX(${baseX}) rotateX(${baseRotX.toFixed(2)}deg) rotateY(${baseRotY.toFixed(2)}deg) rotateZ(${baseRotZ}deg)`;
      }

      // Trigger a single shimmering page flip
      function triggerNextPageFlip() {
        if (!isPlaying || !isBookOpen || flipPages.length === 0) return;

        const page = flipPages[pageTurnIndex % flipPages.length];
        pageTurnIndex++;

        // Reset animation cleanly so it can replay endlessly
        page.classList.remove('is-flipping');
        void page.offsetWidth; // Force reflow
        page.classList.add('is-flipping');
      }

      function startBookSequence(immediateOpen = false) {
        clearTimeout(openDelayTimer);
        clearInterval(pageFlipTimer);

        if (immediateOpen) {
          isBookOpen = true;
          bookRig.classList.add('is-open');
          triggerNextPageFlip();
        } else {
          isBookOpen = false;
          bookRig.classList.remove('is-open');
          flipPages.forEach((p) => p.classList.remove('is-flipping'));

          // Open the hardcover gracefully after 850ms
          openDelayTimer = setTimeout(() => {
            if (!isPlaying) return;
            isBookOpen = true;
            bookRig.classList.add('is-open');
            setTimeout(triggerNextPageFlip, 650);
          }, 850);
        }

        // Flip a page every 2.6 seconds for a calm, hypnotic rhythm
        pageFlipTimer = setInterval(() => {
          if (isPlaying && isBookOpen) {
            triggerNextPageFlip();
          }
        }, 2600);
      }

      /* --------------------------------------------------------------------------
         3. VIDEO-LIKE QUOTE REEL & TIMELINE CONTROLLER
         -------------------------------------------------------------------------- */
      const quoteSlides = Array.from(document.querySelectorAll('.quote-slide'));
      const timelineSegments = Array.from(document.querySelectorAll('.timeline-segment'));
      const timelineFills = Array.from(document.querySelectorAll('.timeline-fill'));
      const sceneCounter = document.getElementById('scene-counter');
      const btnPlayPause = document.getElementById('btn-play-pause');
      const iconPause = document.getElementById('icon-pause');
      const iconPlay = document.getElementById('icon-play');
      const btnReplay = document.getElementById('btn-replay');

      const SCENE_DURATION_MS = 4800; // 4.8 seconds per inspiring line
      let activeSceneIndex = 0;
      let sceneElapsedMs = 0;
      let lastFrameTime = performance.now();
      let isPlaying = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function setActiveQuote(newIndex) {
        const previousIndex = activeSceneIndex;
        activeSceneIndex = newIndex;
        sceneElapsedMs = 0;

        quoteSlides.forEach((slide, idx) => {
          slide.classList.remove('is-active', 'is-exiting');
          if (idx === newIndex) {
            slide.classList.add('is-active');
          } else if (idx === previousIndex && previousIndex !== newIndex) {
            slide.classList.add('is-exiting');
          }
        });

        // Update counter text (e.g., 01 / 04)
        const formatted = String(newIndex + 1).padStart(2, '0');
        const total = String(quoteSlides.length).padStart(2, '0');
        sceneCounter.textContent = `${formatted} / ${total}`;

        // Update segment fill bars immediately
        timelineFills.forEach((fill, idx) => {
          if (idx < newIndex) {
            fill.style.width = '100%';
          } else if (idx > newIndex) {
            fill.style.width = '0%';
          } else {
            fill.style.width = '0%';
          }
        });

        // Flip a page in sync with scene transitions
        if (isBookOpen) {
          triggerNextPageFlip();
        }
      }

      function togglePlayState(forceState) {
        isPlaying = typeof forceState === 'boolean' ? forceState : !isPlaying;

        if (isPlaying) {
          iconPause.classList.remove('hidden');
          iconPlay.classList.add('hidden');
          btnPlayPause.setAttribute('aria-label', 'Pause animation');
          lastFrameTime = performance.now();
          // Resume CSS animations on flipping pages
          flipPages.forEach((p) => (p.style.animationPlayState = 'running'));
        } else {
          iconPause.classList.add('hidden');
          iconPlay.classList.remove('hidden');
          btnPlayPause.setAttribute('aria-label', 'Play animation');
          // Pause CSS animations on flipping pages
          flipPages.forEach((p) => (p.style.animationPlayState = 'paused'));
        }
      }

      btnPlayPause.addEventListener('click', () => togglePlayState());

      btnReplay.addEventListener('click', () => {
        togglePlayState(true);
        setActiveQuote(0);
        startBookSequence(false);
      });


      let resumeAfterVisibility = false;
      const heroSection = document.getElementById("home");
      if (heroSection && "IntersectionObserver" in window) {
        const heroObserver = new IntersectionObserver((entries) => {
          const visible = Boolean(entries[0] && entries[0].isIntersecting);
          if (!visible && isPlaying) {
            resumeAfterVisibility = true;
            togglePlayState(false);
          } else if (visible && resumeAfterVisibility && !document.hidden) {
            resumeAfterVisibility = false;
            togglePlayState(true);
          }
        }, { threshold: 0.05 });
        heroObserver.observe(heroSection);
      }
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && isPlaying) {
          resumeAfterVisibility = true;
          togglePlayState(false);
        } else if (!document.hidden && resumeAfterVisibility && heroSection) {
          const rect = heroSection.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            resumeAfterVisibility = false;
            togglePlayState(true);
          }
        }
      });

      // Allow clicking any segment on the video progress bar to jump to that quote
      timelineSegments.forEach((seg) => {
        seg.addEventListener('click', () => {
          const idx = Number(seg.getAttribute('data-seg'));
          if (!Number.isNaN(idx)) {
            setActiveQuote(idx);
            if (!isBookOpen) {
              isBookOpen = true;
              bookRig.classList.add('is-open');
            }
          }
        });
      });

      // Smooth CTA handler (scrolls if #books-collection exists on host page, or shows subtle confirmation)
      const exploreCta = document.getElementById('explore-cta');
      const ctaToast = document.getElementById('cta-toast');
      let toastTimeout = null;

      exploreCta.addEventListener('click', (e) => {
        const targetSection = document.getElementById('booksSection');
        if (targetSection) {
          e.preventDefault();
          targetSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          e.preventDefault();
          ctaToast.style.opacity = '1';
          clearTimeout(toastTimeout);
          toastTimeout = setTimeout(() => {
            ctaToast.style.opacity = '0';
          }, 2400);
        }
      });

      /* --------------------------------------------------------------------------
         4. MASTER ANIMATION LOOP
         -------------------------------------------------------------------------- */
      function masterLoop(now) {
        const dt = Math.min(now - lastFrameTime, 100);
        lastFrameTime = now;

        // 1. Update golden dust particles
        renderParticles(isPlaying);

        // 2. Update 3D book cursor tilt smoothly
        updateBookTransform();

        // 3. Advance video timeline progress
        if (isPlaying) {
          sceneElapsedMs += dt;
          const progressPct = Math.min(100, (sceneElapsedMs / SCENE_DURATION_MS) * 100);
          if (timelineFills[activeSceneIndex]) {
            timelineFills[activeSceneIndex].style.width = `${progressPct}%`;
          }

          if (sceneElapsedMs >= SCENE_DURATION_MS) {
            const nextScene = (activeSceneIndex + 1) % quoteSlides.length;
            setActiveQuote(nextScene);
          }
        }

        requestAnimationFrame(masterLoop);
      }

      /* --------------------------------------------------------------------------
         5. INITIALIZATION ON WINDOW LOAD
         -------------------------------------------------------------------------- */
      window.addEventListener('resize', () => {
        resizeCanvas();
        createParticles();
      });

      function initializeBookHero() {
        resizeCanvas();
        createParticles();
        setActiveQuote(0);
        startBookSequence(false);
        lastFrameTime = performance.now();
        requestAnimationFrame(masterLoop);
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeBookHero, { once: true });
      } else {
        initializeBookHero();
      }
    })();
  