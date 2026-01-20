import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { chromium, BrowserContext, Page } from "patchright";
import * as path from "path";

@Injectable()
export class BrowserService implements OnModuleDestroy {
	private context: BrowserContext | null = null;
	private page: Page | null = null;
	private readonly userDataDir = path.join(process.cwd(), ".browser-data");

	async onModuleDestroy() {
		await this.closeBrowser();
	}

	private async initBrowser(headless = true) {
		if (!this.context) {
			this.context = await chromium.launchPersistentContext(this.userDataDir, {
				headless,
				viewport: { width: 1280, height: 720 },
				userAgent:
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

	private extractVideoId(url: string): string | null {
		const match = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
		return match ? match[1] : null;
	}

	async startShorts(): Promise<{ success: boolean; id?: string; error?: string }> {
		try {
			await this.closeBrowser();

			const context = await this.initBrowser();
			this.page = context.pages()[0] || (await context.newPage());

			await this.page.goto("https://www.youtube.com/shorts", {
				waitUntil: "networkidle",
			});
			await this.page.waitForURL(/youtube\.com\/shorts\/[a-zA-Z0-9_-]+/, { timeout: 15000 });

			const videoId = this.extractVideoId(this.page.url());
			if (videoId) return { success: true, id: videoId };

			return { success: false, error: "Could not get video ID" };
		} catch (error) {
            return { success: false, error: error.message };
		}
	}

	async nextShort(): Promise<{ success: boolean; id?: string; error?: string }> {
		if (!this.page) return { success: false, error: "Browser not open." };
		try {
			const currentUrl = this.page.url();
			await this.page.keyboard.press("ArrowDown");
			await this.page.waitForFunction((oldUrl) => window.location.href !== oldUrl, currentUrl, { timeout: 3000 });

			const videoId = this.extractVideoId(this.page.url());
            if (videoId) return { success: true, id: videoId };

			return { success: false, error: "Could not get video ID" };
		} catch (error) {
            return { success: false, error: error.message };
		}
	}

	async prevShort(): Promise<{ success: boolean; id?: string; error?: string }> {
		if (!this.page) return { success: false, error: "Browser not open." };
		try {
			const currentUrl = this.page.url();
			await this.page.keyboard.press("ArrowUp");
			await this.page.waitForFunction((oldUrl) => window.location.href !== oldUrl, currentUrl, { timeout: 3000 });

			const videoId = this.extractVideoId(this.page.url());
			if (videoId) return { success: true, id: videoId };

			return { success: false, error: "Could not get video ID" };
		} catch (error) {
            return { success: false, error: error.message };
		}
	}
}
