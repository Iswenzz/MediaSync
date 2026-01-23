import { Controller, Post, Query } from "@nestjs/common";

import { YoutubeService } from "@/services/youtube.service";

@Controller("api/youtube")
export class YoutubeController {
	constructor(private youtubeService: YoutubeService) {}

	@Post("video")
	load(@Query("id") id: string) {
		return this.youtubeService.video(id);
	}

	@Post("shorts")
	shorts(@Query("keywords") keywords?: string) {
		if (!keywords) return this.youtubeService.shortsBrowser();
		return this.youtubeService.shortsKeywords(keywords);
	}

	@Post("playlist")
	playlist(@Query("id") id: string, @Query("page") page?: string) {
		return this.youtubeService.playlist(id, parseInt(page || "1"));
	}

	@Post("next")
	next() {
		return this.youtubeService.next();
	}

	@Post("prev")
	prev() {
		return this.youtubeService.prev();
	}

	@Post("pause")
	pause() {
		return this.youtubeService.pause();
	}

	@Post("seek")
	seek(@Query("time") time: string) {
		return this.youtubeService.seek(time);
	}
}
