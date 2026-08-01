import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const TOTAL_FRAMES = 240;
const canvas = document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderText = document.getElementById('loader-text');

const images = [];
let loadedCount = 0;
let scrollProgress = 0;
let targetFrame = 0;
let currentFrame = 0;
let lastRenderedFrame = -1;

// Initialize Lenis for smooth scroll physics
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 2,
});

// Update scroll progress on Lenis scroll
lenis.on('scroll', (e) => {
  if (typeof e.progress === 'number' && !isNaN(e.progress)) {
    scrollProgress = e.progress;
  }
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Native scroll fallback listener
window.addEventListener('scroll', () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll > 0) {
    scrollProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
  }
});

const BASE_URL = import.meta.env.BASE_URL || '/';

// Get frame path respecting Vite BASE_URL for GitHub Pages
function getFramePath(index) {
  const paddedNumber = String(index).padStart(3, '0');
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  return `${base}frames/ezgif-frame-${paddedNumber}.jpg`;
}

// Canvas sizing & resolution setup
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  lastRenderedFrame = -1;
  const frameToDraw = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentFrame)));
  renderFrame(frameToDraw);
}

// Render image on canvas with cover scaling
function renderFrame(index) {
  const img = images[index];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;

  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;
  const imgRatio = imgWidth / imgHeight;
  const viewRatio = viewWidth / viewHeight;

  let drawW, drawH, x, y;

  if (viewRatio > imgRatio) {
    drawW = viewWidth;
    drawH = viewWidth / imgRatio;
  } else {
    drawW = viewHeight * imgRatio;
    drawH = viewHeight;
  }

  // Slight 4% zoom crop to hide edge watermarks (such as Veo)
  const ZOOM = 1.04;
  drawW *= ZOOM;
  drawH *= ZOOM;
  x = (viewWidth - drawW) / 2;
  y = (viewHeight - drawH) / 2;

  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.drawImage(img, x, y, drawW, drawH);
}

// Main render loop with smooth lerp interpolation
function tick() {
  // Always compute fallback progress as safety check
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll > 0) {
    const rawProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    // Use maximum / smoothed progress
    if (Math.abs(rawProgress - scrollProgress) > 0.001) {
      scrollProgress = rawProgress;
    }
  }

  targetFrame = scrollProgress * (TOTAL_FRAMES - 1);

  // Smooth lerp for silky transition
  currentFrame += (targetFrame - currentFrame) * 0.15;

  const roundedFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentFrame)));

  if (roundedFrame !== lastRenderedFrame) {
    renderFrame(roundedFrame);
    lastRenderedFrame = roundedFrame;
  }

  requestAnimationFrame(tick);
}

// Preload all frame images
function preloadImages() {
  return new Promise((resolve) => {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = img.onerror = () => {
        loadedCount++;
        const percent = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        loaderBar.style.width = `${percent}%`;
        loaderText.textContent = `Loading ${percent}%`;

        if (loadedCount === TOTAL_FRAMES) {
          resolve();
        }
      };
      images.push(img);
    }
  });
}

// Init Application
async function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 100));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeCanvas);
  }

  await preloadImages();

  // Draw initial frame
  renderFrame(0);

  // Smoothly dismiss loader
  setTimeout(() => {
    loader.classList.add('hidden');
  }, 200);

  // Start animation loop
  requestAnimationFrame(tick);
}

init();
