import { Injectable } from "@nestjs/common";

import { AppGateway } from "@/app.gateway";

import { RoomService, RoomState } from "./room.service";
import { BrowserService } from "./browser.service";

@Injectable()
export class YoutubeService {
	private browserRoom: Nullable<string> = null;

	constructor(
		private appGateway: AppGateway,
		private roomService: RoomService,
		private browserService: BrowserService
	) {}

	private emit(room: RoomState, event: string) {
		this.appGateway.emitToRoom(room.id, event, this.roomService.getCurrentState(room));
	}

	async video(room: RoomState, url: string, ifEnded?: string) {
		const id = this.extractVideoId(url);
		if (ifEnded) {
			const currentState = this.roomService.getCurrentState(room);
			if (!currentState.duration || currentState.time < currentState.duration) {
				return { success: false, error: "Video has not ended" };
			}
		}
		room.state.type = "youtube";
		room.state.mode = "video";
		room.state.id = id;
		room.state.looped = false;
		room.state.live = await this.isLiveStream(id);
		room.state.duration = await this.getVideoDuration(id);
		this.roomService.resetTime(room);
		this.emit(room, "video");
		return { success: true };
	}

	async shortsBrowser(room: RoomState) {
		this.browserRoom = room.id;
		try {
			await this.browserService.closeBrowser();
			await this.browserService.navigateTo("https://www.youtube.com/shorts");
			await this.browserService.waitForUrl(/youtube\.com\/shorts\/[a-zA-Z0-9_-]+/);

			const url = this.browserService.getCurrentUrl();
			const videoId = url ? this.extractShortId(url) : null;

			if (videoId) {
				room.state.type = "youtube";
				room.state.mode = "browser-shorts";
				room.state.id = videoId;
				room.state.looped = true;
				room.state.live = false;
				room.state.duration = 0;
				this.roomService.resetTime(room);
				this.emit(room, "video");
				return { success: true, id: videoId };
			}
			return { success: false, error: "Could not get video ID" };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	async shortsKeywords(room: RoomState, keywords: string) {
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
			room.ids = ids;
			room.state.type = "youtube";
			room.state.mode = "shorts";
			room.state.id = ids[0];
			room.state.index = 0;
			room.state.looped = true;
			room.state.live = false;
			room.state.duration = 0;
			this.roomService.resetTime(room);
			this.emit(room, "video");
			return { success: true, ids };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	async playlist(room: RoomState, playlistId: string, page: number = 1) {
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
					room.ids = ids;
					room.state.type = "youtube";
					room.state.mode = "playlist";
					room.state.id = ids[0];
					room.state.index = 0;
					room.state.looped = true;
					room.state.live = false;
					room.state.duration = 0;
					this.roomService.resetTime(room);
					this.emit(room, "video");
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

	async next(room: RoomState) {
		const mode = room.state.mode;
		if (mode === "browser-shorts") {
			return this.navigateBrowserShort(room, "next");
		}
		if (mode === "shorts" || mode === "playlist") {
			if (room.state.index + 1 < room.ids.length) {
				room.state.index++;
			}
			room.state.id = room.ids[room.state.index];
			room.state.looped = true;
			this.roomService.resetTime(room);
			this.emit(room, "video");
			return { success: true };
		}
		return { success: false, error: "No active playlist or shorts" };
	}

	async prev(room: RoomState) {
		const mode = room.state.mode;
		if (mode === "browser-shorts") {
			return this.navigateBrowserShort(room, "prev");
		}
		if (mode === "shorts" || mode === "playlist") {
			if (room.state.index - 1 >= 0) {
				room.state.index--;
			}
			room.state.id = room.ids[room.state.index];
			room.state.looped = true;
			this.roomService.resetTime(room);
			this.emit(room, "video");
			return { success: true };
		}

		return { success: false, error: "No active playlist or shorts" };
	}

	private async navigateBrowserShort(room: RoomState, direction: "next" | "prev") {
		if (this.browserRoom !== room.id) return;
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
				room.state.id = videoId;
				this.roomService.resetTime(room);
				this.emit(room, "video");
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
