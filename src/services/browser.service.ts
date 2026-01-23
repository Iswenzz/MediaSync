import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { chromium, BrowserContext, Page } from "patchright";
import * as path from "path";

@Injectable()
export class BrowserService implements OnModuleDestroy {
	private context: Nullable<BrowserContext> = null;
	private page: Nullable<Page> = null;
	private readonly userDataDir = path.join(process.cwd(), ".browser-data");

	async onModuleDestroy() {
		await this.closeBrowser();
	}

	async initBrowser() {
		if (!this.context) {
			this.context = await chromium.launchPersistentContext(this.userDataDir, {
				headless: true,
				viewport: { width: 1280, height: 720 },
				userAgent:
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
			});
			this.context.on("close", () => {
				this.context = null;
				this.page = null;
			});
		}
		return this.context;
	}

	async closeBrowser() {
		if (this.context) {
			await this.context.close();
			this.context = null;
			this.page = null;
		}
	}

	async getPage() {
		const context = await this.initBrowser();
		if (!this.page) {
			this.page = context.pages()[0] || (await context.newPage());
		}
		return this.page;
	}

	hasActivePage() {
		return this.page !== null;
	}

	async waitForUrlChange(currentUrl: string, timeout: number = 3000) {
		if (!this.page) throw new Error("Browser not open");
		await this.page.waitForFunction(oldUrl => window.location.href !== oldUrl, currentUrl, {
			timeout
		});
	}

	getCurrentUrl() {
		return this.page?.url() ?? null;
	}

	async pressKey(key: string) {
		if (!this.page) throw new Error("Browser not open");
		await this.page.keyboard.press(key);
	}

	async navigateTo(
		url: string,
		waitUntil: "networkidle" | "load" | "domcontentloaded" = "networkidle"
	) {
		const page = await this.getPage();
		await page.goto(url, { waitUntil });
	}

	async waitForUrl(pattern: RegExp, timeout: number = 15000) {
		if (!this.page) throw new Error("Browser not open");
		await this.page.waitForURL(pattern, { timeout });
	}
}
