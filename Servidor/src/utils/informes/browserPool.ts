import puppeteer, { Browser, Page } from "puppeteer";

let browserPromise: Promise<Browser> | null = null;

const launchBrowser = (): Promise<Browser> =>
  puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = launchBrowser();
  }

  const browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = launchBrowser();
    return browserPromise;
  }

  return browser;
};

export const withPage = async <T>(fn: (page: Page) => Promise<T>): Promise<T> => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
};

export const closeBrowserSingleton = async (): Promise<void> => {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  if (browser.isConnected()) {
    await browser.close();
  }
};
