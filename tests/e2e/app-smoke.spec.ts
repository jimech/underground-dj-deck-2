import { expect, type ConsoleMessage, type Page, test } from '@playwright/test';

function collectUnexpectedConsoleErrors(page: Page, expectedErrorPatterns: RegExp[] = []) {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message: ConsoleMessage) => {
    const text = message.text();
    const isExpectedMissingFirstRunProfile = text.includes('Failed to load resource: the server responded with a status of 404')
      && message.location().url.includes('/api/profiles/profile_');
    const isExpectedMissingPublicRoute = text.includes('Failed to load resource: the server responded with a status of 404')
      && message.location().url.includes('/api/public/');
    const isExpectedMissingLocalApi = text.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')
      && message.location().url.includes('localhost:8787/api/');
    const isExpectedByTest = expectedErrorPatterns.some((pattern) => pattern.test(text));

    if (
      message.type() === 'error'
      && !isExpectedMissingLocalApi
      && !isExpectedMissingFirstRunProfile
      && !isExpectedMissingPublicRoute
      && !isExpectedByTest
    ) {
      errors.push(text);
    }
  });

  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('monolith_onboarding_completed', 'true');

    class MockAudioContext {
      currentTime = 0;
      sampleRate = 44100;
      destination = {};
      state = 'running';

      createGain() {
        return {
          gain: {
            value: 1,
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
          disconnect() {},
        };
      }

      createAnalyser() {
        return {
          fftSize: 256,
          frequencyBinCount: 128,
          connect() {},
          disconnect() {},
          getByteFrequencyData(data: Uint8Array) {
            data.fill(0);
          },
          getByteTimeDomainData(data: Uint8Array) {
            data.fill(128);
          },
        };
      }

      createBiquadFilter() {
        return {
          type: 'peaking',
          frequency: { value: 1000, setValueAtTime() {} },
          Q: { value: 1, setValueAtTime() {} },
          gain: { value: 0, setValueAtTime() {} },
          connect() {},
          disconnect() {},
        };
      }

      createDelay() {
        return {
          delayTime: { value: 0, setValueAtTime() {} },
          connect() {},
          disconnect() {},
        };
      }

      createMediaStreamDestination() {
        return {
          stream: {},
        };
      }

      createBuffer(channels: number, length: number) {
        const channelData = Array.from({ length: channels }, () => new Float32Array(length));
        return {
          duration: 1,
          length,
          numberOfChannels: channels,
          sampleRate: 44100,
          getChannelData(index: number) {
            return channelData[index] || channelData[0];
          },
        };
      }

      createBufferSource() {
        return {
          buffer: null,
          loop: false,
          playbackRate: { value: 1, setValueAtTime() {} },
          connect() {},
          disconnect() {},
          start() {},
          stop() {},
        };
      }

      createOscillator() {
        return {
          type: 'sine',
          frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
          disconnect() {},
          start() {},
          stop() {},
        };
      }

      createScriptProcessor() {
        return {
          onaudioprocess: null,
          connect() {},
          disconnect() {},
        };
      }

      resume() {
        return Promise.resolve();
      }

      close() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      value: MockAudioContext,
      writable: true,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      value: MockAudioContext,
      writable: true,
    });
  });
});

test('loads the app, initializes the desk, and renders the session cabinet', async ({ page }) => {
  const errors = collectUnexpectedConsoleErrors(page);

  await page.route('http://localhost:8787/api/sessions', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    const session = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'cloud-smoke-link',
        shareUrl: 'http://127.0.0.1:3000/?sessionId=cloud-smoke-link',
        publicUrl: 'http://127.0.0.1:3000/sets/cloud-smoke-link',
        createdAt: '2026-06-20T00:00:00.000Z',
        visibility: 'public',
        session,
      }),
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'CONSOLE STANDBY' })).toBeVisible();
  await page.getByRole('button', { name: 'INITIALIZE MIXING DESK' }).click();

  await expect(page.getByRole('heading', { name: /Underground DJ Monolith/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'SHORTCUTS', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'SHORTCUTS', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'UNDERGROUND SHORTCUT PROTOCOL' })).toBeVisible();
  await page.getByTitle('Exit shortcuts (or ESC)').click();
  await page.getByRole('button', { name: 'GUIDED TOUR' }).click();
  await expect(page.getByText('Power The Desk')).toBeVisible();
  await page.getByRole('button', { name: 'NEXT STEP' }).click();
  await expect(page.getByText('Save And Share Mixes')).toBeVisible();
  await expect(page.getByText('Use Save Local, Save Cloud, or Offline Share.')).toBeVisible();
  await page.getByTitle('Skip guided instructions').click();
  await expect(page.getByText('SESSION STORAGE CABINET & MIX ARCHIVE')).toBeVisible();
  await expect(page.getByPlaceholder('NAME CURRENT MIX...')).toBeVisible();
  await expect(page.getByText('Cloud Save Mode')).toBeVisible();
  await expect(page.getByText('Public Link Only')).toBeVisible();
  await expect(page.getByText('Save Cloud creates a public set link. Sign in from Account to keep mixes in your library.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Local' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Cloud' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Save Cloud Public Link/i })).toBeVisible();
  await page.getByRole('button', { name: 'Save Local' }).click();
  await expect(page.getByRole('status')).toContainText(/successfully locked to browser safe/i);
  await page.getByRole('button', { name: 'Dismiss message' }).click();
  await page.getByRole('button', { name: /Save Cloud Public Link/i }).click();
  await expect(page.getByRole('status')).toContainText(/public set link copied|cloud set link created/i);
  await page.getByRole('button', { name: 'Dismiss message' }).click();
  await page.getByRole('button', { name: 'Offline Share' }).click();
  await expect(page.getByText('OFFLINE SHARE TOOLS')).toBeVisible();
  await expect(page.getByText('Use Save Cloud for public set pages and account library storage.')).toBeVisible();
  await expect(page.getByText('Latest Cloud Links:')).toBeVisible();
  await expect(page.getByText('Public Set Page', { exact: true })).toBeVisible();
  await expect(page.locator('input[value="http://127.0.0.1:3000/sets/cloud-smoke-link"]')).toBeVisible();
  await expect(page.getByText('Studio Load Link')).toBeVisible();
  await expect(page.locator('input[value="http://127.0.0.1:3000/?sessionId=cloud-smoke-link"]')).toBeVisible();
  await expect(page).toHaveTitle('Studio | Underground DJ Monolith');
  expect(errors).toEqual([]);
});

test('opens the account library from standby without powering audio', async ({ page }) => {
  const errors = collectUnexpectedConsoleErrors(page);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'CONSOLE STANDBY' })).toBeVisible();
  await page.getByRole('button', { name: 'OPEN ACCOUNT / LIBRARY' }).click();

  await expect(page.getByRole('heading', { name: 'CONSOLE STANDBY' })).toBeHidden();
  await expect(page.getByText('ACCOUNT LIBRARY & SAVED MIXES')).toBeVisible();
  await expect(page.getByText('ACCOUNT & CLOUD SYNC')).toBeVisible();
  await expect(page.getByPlaceholder('EMAIL FOR MAGIC LINK')).toBeVisible();
  await expect(page.getByText('No songs mounted in this browser.')).toBeVisible();
  await expect(page.getByText('Saved Mixes', { exact: true })).toBeVisible();
  await expect(page.getByText('Cloud Mixes', { exact: true })).toBeVisible();
  await expect(page.getByText('SESSION STORAGE CABINET & MIX ARCHIVE')).toBeHidden();
  await expect(page).toHaveTitle('Account Library | Underground DJ Monolith');
  await expect(page.getByRole('button', { name: 'Open Studio' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Studio' }).click();
  await expect(page.getByRole('heading', { name: 'CONSOLE STANDBY' })).toBeVisible();
  await expect(page).toHaveTitle('Studio | Underground DJ Monolith');
  expect(errors).toEqual([]);
});

test('opens account from the studio cloud-save helper', async ({ page }) => {
  const errors = collectUnexpectedConsoleErrors(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'INITIALIZE MIXING DESK' }).click();

  await expect(page.getByText('Cloud Save Mode')).toBeVisible();
  await page.getByRole('button', { name: 'Open Account', exact: true }).click();

  await expect(page.getByText('ACCOUNT LIBRARY & SAVED MIXES')).toBeVisible();
  await expect(page).toHaveTitle('Account Library | Underground DJ Monolith');
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  await expect(page.getByText('SESSION STORAGE CABINET & MIX ARCHIVE')).toBeVisible();
  await expect(page).toHaveTitle('Studio | Underground DJ Monolith');
  expect(errors).toEqual([]);
});

test('shows a safe cloud-save storage error when the API rejects the save', async ({ page }) => {
  const errors = collectUnexpectedConsoleErrors(page, [/500 \(Internal Server Error\)/]);

  await page.route('http://localhost:8787/api/sessions', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Storage unavailable',
        detail: 'Failed to save Supabase session: relation missing',
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'INITIALIZE MIXING DESK' }).click();
  await page.getByRole('button', { name: /Save Cloud Public Link/i }).click();

  await expect(page.getByRole('status')).toContainText(/cloud save storage is not ready/i);
  await expect(page.getByRole('status')).toContainText(/supabase migrations and server-only backend credentials/i);
  await expect(page.getByRole('status')).not.toContainText(/relation missing/i);
  expect(errors).toEqual([]);
});

test('opens the lazy-loaded flyer generator from the studio cabinet', async ({ page }) => {
  const errors = collectUnexpectedConsoleErrors(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'INITIALIZE MIXING DESK' }).click();
  await page.getByRole('button', { name: 'Flyer Maker' }).click();

  await expect(page.getByRole('heading', { name: 'Flyer Generator' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Flyer Image' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('renders lazy public route shells for profiles and sets', async ({ page }) => {
  const errors = collectUnexpectedConsoleErrors(page);

  await page.goto('/profile/smoke-route');
  await expect(page.getByRole('link', { name: 'Studio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Signal Not Found' })).toBeVisible();
  await expect(page).toHaveTitle('Public Profile Not Found | Underground DJ Monolith');

  await page.goto('/sets/smoke-route');
  await expect(page.getByRole('link', { name: 'Studio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Signal Not Found' })).toBeVisible();
  await expect(page).toHaveTitle('Public Set Not Found | Underground DJ Monolith');
  expect(errors).toEqual([]);
});

test('renders public profile and set pages from API data', async ({ page }) => {
  const errors = collectUnexpectedConsoleErrors(page);
  const publicProfile = {
    id: 'profile-smoke',
    djName: 'DJ Smoke',
    djCrew: 'Route Test Crew',
    soundStyle: 'Industrial Dub',
    avatarIndex: 2,
    timeMixed: 5400,
    vinylSpins: 2048,
  };
  const publicSession = {
    version: 1,
    name: 'Warehouse Smoke Test',
    timestamp: Date.now(),
    data: {
      bpm: 138,
      crossfaderValue: 0,
      deckAValues: { vol: 0.7, low: 0, mid: 0, high: 0, filter: 0 },
      deckBValues: { vol: 0.7, low: 0, mid: 0, high: 0, filter: 0 },
      swingAmountValue: 0,
      flangerValue: 0,
      deckSelectedTracks: { A: 0, B: 0 },
      deckPlayStates: { A: false, B: false },
      deckReversed: { A: false, B: false },
      effectsVinylCrackleActive: false,
      effectsVinylCrackleVolume: 0.25,
      effectsVinylCrackleFreq: 1000,
      effectsVinylCrackleQ: 1,
      ambientMode: 'drone',
      visualizerMode: 'bars',
      stickerText: 'PUBLIC TEST',
      sequencerTracks: {
        kick: [true, false, false, false],
        snare: [false, false, true, false],
        hihat: [false, true, false, true],
        synth: [false, false, false, false],
      },
    },
  };

  await page.route('http://localhost:8787/api/public/profiles/profile-smoke', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ profile: publicProfile }),
    });
  });
  await page.route('http://localhost:8787/api/public/sets/set-smoke', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        set: {
          id: 'set-smoke',
          publicUrl: 'http://127.0.0.1:3000/sets/set-smoke',
          shareUrl: 'http://127.0.0.1:3000/?sessionId=set-smoke',
          createdAt: '2026-06-19T00:00:00.000Z',
          session: publicSession,
          profile: publicProfile,
        },
      }),
    });
  });

  await page.goto('/profile/profile-smoke');
  await expect(page.getByRole('heading', { name: 'DJ Smoke' })).toBeVisible();
  await expect(page.getByText('Route Test Crew / Industrial Dub')).toBeVisible();
  await expect(page.getByText('1h 30m')).toBeVisible();
  await expect(page).toHaveTitle('DJ Smoke | Underground DJ Profile');

  await page.goto('/sets/set-smoke');
  await expect(page.getByText('Public Set Transmission')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Warehouse Smoke Test' }).first()).toBeVisible();
  await expect(page.getByText('DJ Smoke')).toBeVisible();
  await expect(page.getByText('BPM').first().locator('..').getByText('138')).toBeVisible();
  await expect(page).toHaveTitle('Warehouse Smoke Test | Underground DJ Set');
  expect(errors).toEqual([]);
});
