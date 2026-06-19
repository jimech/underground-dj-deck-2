const apiUrl = process.env.API_URL?.replace(/\/$/, '');
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');

async function assertOk(name, url, validate) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`${name} failed to connect to ${url}: ${error instanceof Error ? error.message : error}`);
  }

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${name} failed at ${url}: ${response.status} ${response.statusText}`);
  }

  validate?.(response, body);
  console.log(`${name}: ok`);
}

function assertSpaShell(routeLabel, response, body) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') || !body.includes('root')) {
    throw new Error(`Frontend host did not serve the SPA shell for ${routeLabel}.`);
  }
}

if (!apiUrl && !frontendUrl) {
  console.error('Set API_URL and/or FRONTEND_URL before running this smoke check.');
  process.exit(1);
}

try {
  if (apiUrl) {
    await assertOk('API health', `${apiUrl}/api/health`, (_response, body) => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error('API health response was not valid JSON.');
      }
      if (parsed.ok !== true) throw new Error('API health response did not include ok=true.');
      if (!parsed.storage?.activeDriver) throw new Error('API health response did not include storage.activeDriver.');
    });
  }

  if (frontendUrl) {
    await assertOk('Frontend root', frontendUrl, (_response, body) => {
      if (!body.includes('root')) throw new Error('Frontend root did not look like the Vite app shell.');
    });

    await assertOk('Frontend set route fallback', `${frontendUrl}/sets/smoke-route`, (response, body) => (
      assertSpaShell('/sets/:id', response, body)
    ));

    await assertOk('Frontend profile route fallback', `${frontendUrl}/profile/smoke-route`, (response, body) => (
      assertSpaShell('/profile/:id', response, body)
    ));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
