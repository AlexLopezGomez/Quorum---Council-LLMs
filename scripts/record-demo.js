import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = path.resolve(__dirname, '..', 'videos');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const VIEWPORT = { width: 1280, height: 720 };
const SLOW_MO = 60;

async function pause(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`Recording demo against ${BASE_URL}`);
  console.log(`Video output: ${VIDEO_DIR}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: SLOW_MO,
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
    colorScheme: 'light',
  });

  const page = await context.newPage();

  // ─── 1. Landing Page ────────────────────────────────────────
  console.log('[1/8] Loading landing page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await pause(2000);

  // Scroll down slowly to show the full landing page
  await autoScroll(page, 600);
  await pause(1000);

  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(1500);

  // ─── 2. Navigate to Dashboard ──────────────────────────────
  console.log('[2/8] Navigating to dashboard...');
  // In DEMO_MODE, authApi.me() auto-authenticates → button says "Go to Dashboard"
  const dashboardBtn = page.getByRole('button', { name: /go to dashboard/i });
  await dashboardBtn.waitFor({ state: 'visible', timeout: 10000 });
  await pause(500);
  await dashboardBtn.click();
  await page.waitForURL('**/app', { timeout: 10000 });
  await pause(1500);

  // ─── 3. Show the Upload Page ──────────────────────────────
  console.log('[3/8] Showing upload page...');
  // Hover over the strategy cards briefly
  const strategyCards = page.locator('button:has-text("council")');
  if (await strategyCards.count() > 0) {
    await strategyCards.first().hover();
    await pause(600);
  }
  const autoCard = page.locator('button:has-text("auto")');
  if (await autoCard.count() > 0) {
    await autoCard.first().hover();
    await pause(600);
  }
  await pause(1000);

  // ─── 4. Click "Run Demo" ──────────────────────────────────
  console.log('[4/8] Starting demo evaluation...');
  const runDemoBtn = page.getByRole('button', { name: /run demo/i });
  await runDemoBtn.waitFor({ state: 'visible' });
  await pause(500);
  await runDemoBtn.click();

  // Wait for navigation to evaluation page
  await page.waitForURL('**/app/evaluate/**', { timeout: 15000 });
  await pause(2000);

  // ─── 5. Watch SSE Streaming ──────────────────────────────
  console.log('[5/8] Watching SSE streaming...');

  // Wait for first judge card to appear (loading state)
  await page.waitForSelector('[class*="animate-"]', { timeout: 30000 }).catch(() => {});
  await pause(3000);

  // Wait for first judge to complete (score becomes visible)
  const firstScore = page.locator('text=/0\\.[0-9]{2}/').first();
  await firstScore.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
  await pause(4000);

  // Navigate through a few test cases to show different strategies
  console.log('[6/8] Navigating test cases...');

  const nextBtn = page.getByRole('button', { name: /next/i });

  // Show test case 2
  if (await nextBtn.isEnabled()) {
    await nextBtn.click();
    await pause(3000);
  }

  // Show test case 3
  if (await nextBtn.isEnabled()) {
    await nextBtn.click();
    await pause(3000);
  }

  // Jump ahead to a later test case (different strategy likely)
  for (let i = 0; i < 3; i++) {
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await pause(800);
    }
  }
  await pause(3000);

  // Go back to test case 1 to watch completion
  const prevBtn = page.getByRole('button', { name: /previous/i });
  while (await prevBtn.isEnabled()) {
    await prevBtn.click();
    await pause(300);
  }
  await pause(2000);

  // ─── 7. Wait for Evaluation Complete ─────────────────────
  console.log('[7/8] Waiting for evaluation to complete...');

  // Wait for the summary section to appear (signals evaluation_complete)
  const summarySection = page.locator('text=/Final Score|Pass Rate/i').first();
  await summarySection.waitFor({ state: 'visible', timeout: 120000 }).catch(() => {
    console.log('  (timeout waiting for summary — evaluation may still be running)');
  });
  await pause(2000);

  // Scroll down to show the full summary
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await pause(3000);

  // Scroll back up
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(1500);

  // Browse through completed test cases to show different strategies
  for (let i = 0; i < 4; i++) {
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await pause(2000);
    }
  }

  // ─── 8. Go to History ────────────────────────────────────
  console.log('[8/8] Navigating to history...');
  const historyLink = page.locator('nav button:has-text("History")');
  await historyLink.click();
  await page.waitForURL('**/app/history', { timeout: 10000 });
  await pause(3000);

  // Click on the evaluation row to show detail
  const evalRow = page.locator('tr').filter({ hasText: /adaptive demo/i }).first();
  if (await evalRow.count() > 0) {
    await evalRow.click();
    await pause(3000);

    // Scroll to show cost breakdown
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    await pause(3000);
  }

  // ─── Done ────────────────────────────────────────────────
  console.log('\nRecording complete. Closing browser...');
  await pause(1000);

  await page.close();
  await context.close();
  await browser.close();

  console.log(`Video saved to: ${VIDEO_DIR}`);
  console.log('Tip: Convert .webm to .mp4 with:');
  console.log('  ffmpeg -i videos/VIDEO_FILE.webm -c:v libx264 -crf 23 -preset medium videos/demo.mp4');
}

async function autoScroll(page, scrollAmount) {
  const steps = 10;
  const stepSize = scrollAmount / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((s) => window.scrollBy({ top: s, behavior: 'smooth' }), stepSize);
    await pause(150);
  }
}

main().catch((err) => {
  console.error('Recording failed:', err);
  process.exit(1);
});
