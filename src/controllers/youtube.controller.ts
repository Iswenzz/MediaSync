import { Controller, Post, Query } from "@nestjs/common";

import { YoutubeService } from "@/services/youtube.service";
import { RoomPipe } from "@/pipes/room.pipe";
import type { RoomState } from "@/services/rooms.service";

@Controller("api/youtube")
export class YoutubeController {
	constructor(private youtubeService: YoutubeService) {}

	@Post("video")
	load(
		@Query("room", RoomPipe) room: RoomState,
		@Query("id") id: string,
		@Query("ifEnded") ifEnded?: string
	) {
		return this.youtubeService.video(room, id, ifEnded);
	}

	@Post("shorts")
	shorts(@Query("room", RoomPipe) room: RoomState, @Query("keywords") keywords?: string) {
		if (!keywords) return this.youtubeService.shortsBrowser(room);
		return this.youtubeService.shortsKeywords(room, keywords);
	}

	@Post("playlist")
	playlist(
		@Query("room", RoomPipe) room: RoomState,
		@Query("id") id: string,
		@Query("page") page?: string
	) {
		return this.youtubeService.playlist(room, id, parseInt(page || "1"));
	}
}
