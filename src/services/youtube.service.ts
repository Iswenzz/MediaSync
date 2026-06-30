import { Injectable } from "@nestjs/common";

import { AppGateway } from "@/app.gateway";

import { StateService } from "./state.service";
import { BrowserService } from "./browser.service";

@Injectable()
export class YoutubeService {
	constructor(
		private appGateway: AppGateway,
		private stateService: StateService,
		private browserService: BrowserService
	) {}

	broadcast(event: string) {
		this.appGateway.broadcast(event, this.stateService.getCurrentState());
	}

	async video(url: string, ifEnded?: string) {
		const id = this.extractVideoId(url);
		if (ifEnded) {
			const currentState = this.stateService.getCurrentState();
			if (!currentState.duration || currentState.time < currentState.duration) {
				return { success: false, error: "Video has not ended" };
			}
		}
		this.stateService.state.type = "youtube";
		this.stateService.state.mode = "video";
		this.stateService.state.id = id;
		this.stateService.state.looped = false;
		this.stateService.state.live = await this.isLiveStream(id);
		this.stateService.state.duration = await this.getVideoDuration(id);
		this.stateService.resetTime();
		this.broadcast("video");
		return { success: true };
	}

	async shortsBrowser() {
		try {
			await this.browserService.closeBrowser();
			await this.browserService.navigateTo("https://www.youtube.com/shorts");
			await this.browserService.waitForUrl(/youtube\.com\/shorts\/[a-zA-Z0-9_-]+/);

			const url = this.browserService.getCurrentUrl();
			const videoId = url ? this.extractShortId(url) : null;

			if (videoId) {
				this.stateService.state.type = "youtube";
				this.stateService.state.mode = "browser-shorts";
				this.stateService.state.id = videoId;
				this.stateService.state.looped = true;
				this.stateService.state.live = false;
				this.stateService.state.duration = 0;
				this.stateService.resetTime();
				this.broadcast("video");
				return { success: true, id: videoId };
			}
			return { success: false, error: "Could not get video ID" };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	async shortsKeywords(keywords: string) {
		const keywordArray = keywords.split(",");
		const query = encodeURIComponent(`${keywordArray.join(" ")} #shorts`);
		try {
			const response = await fetch(
				`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoDuration=short&maxResults=50&key=${process.env.YOUTUBE_API_KEY}`
			);
			const data = await response.json();

			if (data.error) {
				return { success: false, error: data.error.message };
			}
			const ids = data.items.map((item: any) => item.id.videoId);
			this.stateService.ids = ids;
			this.stateService.state.type = "youtube";
			this.stateService.state.mode = "shorts";
			this.stateService.state.id = ids[0];
			this.stateService.state.index = 0;
			this.stateService.state.looped = true;
			this.stateService.state.live = false;
			this.stateService.state.duration = 0;
			this.stateService.resetTime();
			this.broadcast("video");
			return { success: true, ids };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	async playlist(playlistId: string, page: number = 1) {
		try {
			let pageToken = "";
			let currentPage = 1;
			while (currentPage <= page) {
				const response = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${process.env.YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ""}`
				);
				const data = await response.json();

				if (data.error) {
					return { success: false, error: data.error.message };
				}
				if (currentPage === page) {
					const ids = data.items.map((item: any) => item.snippet.resourceId.videoId);
					this.stateService.ids = ids;
					this.stateService.state.type = "youtube";
					this.stateService.state.mode = "playlist";
					this.stateService.state.id = ids[0];
					this.stateService.state.index = 0;
					this.stateService.state.looped = true;
					this.stateService.state.live = false;
					this.stateService.state.duration = 0;
					this.stateService.resetTime();
					this.broadcast("video");
					return { success: true, ids, nextPageToken: data.nextPageToken };
				}
				pageToken = data.nextPageToken;
				if (!pageToken) {
					return { success: false, error: "Page number exceeds available results" };
				}
				currentPage++;
			}
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	async next() {
		const mode = this.stateService.state.mode;
		if (mode === "browser-shorts") {
			return this.navigateBrowserShort("next");
		}
		if (mode === "shorts" || mode === "playlist") {
			if (this.stateService.state.index + 1 < this.stateService.ids.length) {
				this.stateService.state.index++;
			}
			this.stateService.state.id = this.stateService.ids[this.stateService.state.index];
			this.stateService.state.looped = true;
			this.stateService.resetTime();
			this.broadcast("video");
			return { success: true };
		}
		return { success: false, error: "No active playlist or shorts" };
	}

	async prev() {
		const mode = this.stateService.state.mode;
		if (mode === "browser-shorts") {
			return this.navigateBrowserShort("prev");
		}
		if (mode === "shorts" || mode === "playlist") {
			if (this.stateService.state.index - 1 >= 0) {
				this.stateService.state.index--;
			}
			this.stateService.state.id = this.stateService.ids[this.stateService.state.index];
			this.stateService.state.looped = true;
			this.stateService.resetTime();
			this.broadcast("video");
			return { success: true };
		}

		return { success: false, error: "No active playlist or shorts" };
	}

	private async navigateBrowserShort(direction: "next" | "prev") {
		if (!this.browserService.hasActivePage()) {
			return { success: false, error: "Browser not open" };
		}
		try {
			const currentUrl = this.browserService.getCurrentUrl()!;
			const key = direction === "next" ? "ArrowDown" : "ArrowUp";

			await this.browserService.pressKey(key);
			await this.browserService.waitForUrlChange(currentUrl);

			const newUrl = this.browserService.getCurrentUrl();
			const videoId = newUrl ? this.extractShortId(newUrl) : null;

			if (videoId) {
				this.stateService.state.id = videoId;
				this.stateService.resetTime();
				this.broadcast("video");
				return { success: true, id: videoId };
			}
			return { success: false, error: "Could not get video ID" };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	private async isLiveStream(videoId: string) {
		try {
			const response = await fetch(
				`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
			);
			const data = await response.json();
			if (data.error || !data.items?.length) return false;
			return "liveStreamingDetails" in data.items[0];
		} catch {
			return false;
		}
	}

	private async getVideoDuration(videoId: string) {
		try {
			const response = await fetch(
				`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
			);
			const data = await response.json();
			if (data.error || !data.items?.length) {
				return 0;
			}
			const duration = data.items[0].contentDetails.duration;
			return this.parseDuration(duration);
		} catch {
			return 0;
		}
	}

	private extractShortId(url: string) {
		const match = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
		return match ? match[1] : null;
	}

	private parseDuration(duration: string) {
		const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
		if (!match) return 0;
		const h = parseInt(match[1] || "0");
		const m = parseInt(match[2] || "0");
		const s = parseInt(match[3] || "0");
		return h * 3600 + m * 60 + s;
	}

	private extractVideoId(input: string) {
		try {
			const url = new URL(input);
			if (url.hostname === "youtu.be") return url.pathname.slice(1);
			return url.searchParams.get("v") ?? url.pathname.split("/").pop() ?? input;
		} catch {
			return input;
		}
	}
}
