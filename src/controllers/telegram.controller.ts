import { Controller, Get, Post, Query, Res, Headers } from "@nestjs/common";
import type { Response } from "express";

import { TelegramService } from "@/services/telegram.service";
import { RoomPipe } from "@/pipes/room.pipe";
import type { RoomState } from "@/services/rooms.service";

@Controller("api/telegram")
export class TelegramController {
	constructor(private telegramService: TelegramService) {}

	@Post("channel")
	channel(
		@Query("room", RoomPipe) room: RoomState,
		@Query("name") name: string,
		@Query("limit") limit?: string
	) {
		return this.telegramService.setChannel(room, name, parseInt(limit || "50"));
	}

	@Post("video")
	video(@Query("room", RoomPipe) room: RoomState, @Query("messageId") messageId: string) {
		return this.telegramService.video(room, parseInt(messageId));
	}

	@Get("stream")
	stream(
		@Query("room", RoomPipe) room: RoomState,
		@Headers("range") range: string,
		@Res() res: Response
	) {
		return this.telegramService.stream(room, range, res);
	}
}
