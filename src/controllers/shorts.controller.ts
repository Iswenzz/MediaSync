import { Controller, Post, Query } from "@nestjs/common";

import { StateService } from "@/services/state.service";
import { AppGateway } from "@/app.gateway";

@Controller("api/shorts")
export class ShortsController {
	constructor(
		private appGateway: AppGateway,
		private stateService: StateService
	) {}

	@Post("youtube")
	async youtube(@Query("keywords") keywords: string) {
		const keywordArray = (keywords || "").split(",");
		const query = encodeURIComponent(`${keywordArray.join(" ")} #shorts`);

		try {
			const response = await fetch(
				`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoDuration=short&maxResults=50&key=${process.env.YOUTUBE_API_KEY}`
			);
			const data = await response.json();
			const ids = data.items.map((item: any) => item.id.videoId);

			this.stateService.ids = ids;
			this.stateService.state.type = "youtube";
			this.stateService.state.id = ids[0];
			this.stateService.state.index = 0;
			this.stateService.state.time = 0;
			this.stateService.state.looped = true;
			this.stateService.clearTimer();
			this.appGateway.broadcast("video", this.stateService.state);

			return { success: true, items: ids };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	@Post("next")
	next() {
		if (this.stateService.state.index + 1 < this.stateService.ids.length)
			this.stateService.state.index++;
		this.stateService.state.id = this.stateService.ids[this.stateService.state.index];
		this.stateService.state.time = 0;
		this.stateService.state.looped = true;
		this.stateService.clearTimer();
		this.appGateway.broadcast("video", this.stateService.state);
		return { success: true };
	}

	@Post("prev")
	prev() {
		if (this.stateService.state.index - 1 >= 0) this.stateService.state.index--;
		this.stateService.state.id = this.stateService.ids[this.stateService.state.index];
		this.stateService.state.time = 0;
		this.stateService.state.looped = true;
		this.stateService.clearTimer();
		this.appGateway.broadcast("video", this.stateService.state);
		return { success: true };
	}
}
