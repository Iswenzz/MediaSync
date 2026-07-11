import { Controller, Post, Query } from "@nestjs/common";

import { VideoService } from "@/services/video.service";
import { RoomPipe } from "@/pipes/room.pipe";
import type { RoomState } from "@/services/rooms.service";

@Controller("api/video")
export class VideoController {
	constructor(private videoService: VideoService) {}

	@Post("next")
	next(@Query("room", RoomPipe) room: RoomState) {
		return this.videoService.next(room);
	}

	@Post("prev")
	prev(@Query("room", RoomPipe) room: RoomState) {
		return this.videoService.prev(room);
	}

	@Post("pause")
	pause(@Query("room", RoomPipe) room: RoomState) {
		return this.videoService.pause(room);
	}

	@Post("seek")
	seek(@Query("room", RoomPipe) room: RoomState, @Query("time") time: string) {
		return this.videoService.seek(room, time);
	}
}
