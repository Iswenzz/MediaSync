import { Controller, Post, Query } from "@nestjs/common";

import { StateService } from "@/services/state.service";
import { BrowserService } from "@/services/browser.service";
import { AppGateway } from "@/app.gateway";

@Controller("api/youtube")
export class YoutubeController {
	constructor(
		private appGateway: AppGateway,
		private stateService: StateService,
		private browserService: BrowserService
	) {}

	@Post("video")
	load(@Query("id") id: string) {
		this.stateService.state.type = "youtube";
		this.stateService.state.mode = "video";
		this.stateService.state.id = id;
		this.stateService.state.time = 0;
		this.stateService.state.looped = false;
		this.stateService.startTimer();
		this.appGateway.broadcast("video", this.stateService.state);
		return { success: true };
	}

	@Post("shorts")
	async youtube(@Query("keywords") keywords?: string) {
		if (!keywords) {
			const result = await this.browserService.startShorts();
			if (result.success && result.id) {
				this.stateService.state.type = "youtube";
				this.stateService.state.mode = "browser-shorts";
				this.stateService.state.id = result.id;
				this.stateService.state.time = 0;
				this.stateService.state.looped = true;
				this.stateService.clearTimer();
				this.appGateway.broadcast("video", this.stateService.state);
			}
			return result;
		}
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
			this.stateService.state.time = 0;
			this.stateService.state.looped = true;
			this.stateService.clearTimer();
			this.appGateway.broadcast("video", this.stateService.state);
			return { success: true, ids };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	@Post("playlist")
	async playlist(@Query("id") playlistId: string, @Query("page") page?: string) {
		const pageNum = parseInt(page || "1");
		try {
			let pageToken = "";
			let currentPage = 1;
			while (currentPage <= pageNum) {
				const response = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${process.env.YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ""}`
				);
				const data = await response.json();

				if (data.error) {
					return { success: false, error: data.error.message };
				}
				if (currentPage === pageNum) {
					const ids = data.items.map((item: any) => item.snippet.resourceId.videoId);
					this.stateService.ids = ids;
					this.stateService.state.type = "youtube";
					this.stateService.state.mode = "playlist";
					this.stateService.state.id = ids[0];
					this.stateService.state.index = 0;
					this.stateService.state.time = 0;
					this.stateService.state.looped = true;
					this.stateService.clearTimer();
					this.appGateway.broadcast("video", this.stateService.state);
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
}
