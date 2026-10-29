// Capturas para docs/guide, desde el export estático (`EXPORT=true pnpm build`) servido bajo /titulus/.
// Firefox, en español, sin sonido. Se lanza a mano al cambiar la interfaz: `node scripts/screenshots.mjs`.
// Necesita Playwright (no es dependencia del proyecto): PLAYWRIGHT apunta a su index.mjs.

const { firefox } = await import(process.env.PLAYWRIGHT ?? '@playwright/test');

const url = process.env.URL ?? 'http://127.0.0.1:4173/titulus/';
const out = 'docs/guide/img/';
const browser = await firefox.launch({ firefoxUserPrefs: { 'media.volume_scale': '0.0' } });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })).newPage();

await page.goto(url);
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}editor.png` });

// Un ítem seleccionado: el inspector pasa a «Item».
await page.getByText('Juan Pérez').first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}item.png` });

await page.getByRole('button', { name: 'Presets', exact: true }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}presets.png` });
await page.keyboard.press('Escape');

await page.getByRole('radio', { name: 'Global' }).click();
await page.getByRole('button', { name: /Aparición/ }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}aparicion.png` });

await page.getByRole('button', { name: 'Exportar MP4' }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}exportar.png` });

await browser.close();
