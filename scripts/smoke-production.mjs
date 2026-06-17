const apiUrl = process.env.API_URL?.replace(/\/$/, '');
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');

async function assertOk(name, url, validate) {
  const response = await fetch(url);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${name} failed: ${response.status} ${response.statusText}`);
  }

  validate?.(response, body);
  console.log(`${name}: ok`);
}

if (!apiUrl && !frontendUrl) {
  console.error('Set API_URL and/or FRONTEND_URL before running this smoke check.');
  process.exit(1);
}

try {
  if (apiUrl) {
    await assertOk('API health', `${apiUrl}/api/health`, (_response, body) => {
      const parsed = JSON.parse(body);
      if (parsed.ok !== true) throw new Error('API health response did not include ok=true.');
    });
  }

  if (frontendUrl) {
    await assertOk('Frontend root', frontendUrl, (_response, body) => {
      if (!body.includes('root')) throw new Error('Frontend root did not look like the Vite app shell.');
    });

    await assertOk('Frontend SPA route fallback', `${frontendUrl}/sets/smoke-route`, (response, body) => {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') || !body.includes('root')) {
        throw new Error('Frontend host did not serve the SPA shell for /sets/:id.');
      }
    });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
