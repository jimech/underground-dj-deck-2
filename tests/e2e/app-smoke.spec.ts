import { expect, type ConsoleMessage, type Page, test } from '@playwright/test';

function collectUnexpectedConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message: ConsoleMessage) => {
    const text = message.text();
    const isExpectedMissingFirstRunProfile = text.includes('Failed to load resource: the server responded with a status of 404')
      && message.location().url.includes('/api/profiles/profile_');

    if (
      message.type() === 'error'
      && !text.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')
      && !isExpectedMissingFirstRunProfile
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

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'CONSOLE STANDBY' })).toBeVisible();
  await page.getByRole('button', { name: 'INITIALIZE MIXING DESK' }).click();

  await expect(page.getByRole('heading', { name: /Underground DJ Monolith/i })).toBeVisible();
  await expect(page.getByText('SESSION STORAGE CABINET & MIX ARCHIVE')).toBeVisible();
  await expect(page.getByPlaceholder('NAME CURRENT MIX...')).toBeVisible();
  expect(errors).toEqual([]);
});

test('opens the account library from standby without powering audio', async ({ page }) => {
  const errors = collectUnexpectedConsoleErrors(page);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'CONSOLE STANDBY' })).toBeVisible();
  await page.getByRole('button', { name: 'OPEN ACCOUNT / LIBRARY' }).click();

  await expect(page.getByRole('heading', { name: 'CONSOLE STANDBY' })).toBeHidden();
  await expect(page.getByText('ACCOUNT LIBRARY & SAVED MIXES')).toBeVisible();
  await expect(page.getByText('ACCOUNT LINK')).toBeVisible();
  await expect(page.getByPlaceholder('EMAIL FOR MAGIC LINK')).toBeVisible();
  await expect(page.getByText('Mounted Songs', { exact: true })).toBeVisible();
  await expect(page.getByText('Saved Mixes', { exact: true })).toBeVisible();
  await expect(page.getByText('SESSION STORAGE CABINET & MIX ARCHIVE')).toBeHidden();
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
