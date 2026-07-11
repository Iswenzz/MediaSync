import { Injectable } from "@nestjs/common";

import { AppGateway } from "@/app.gateway";
import { RoomsService, RoomState } from "@/services/rooms.service";
import { YoutubeService } from "@/services/youtube.service";
import { TelegramService } from "@/services/telegram.service";

@Injectable()
export class VideoService {
	constructor(
		private appGateway: AppGateway,
		private roomsService: RoomsService,
		private youtubeService: YoutubeService,
		private telegramService: TelegramService
	) {}

	private emit(room: RoomState, event: string) {
		this.appGateway.emitToRoom(room.id, event, this.roomsService.getCurrentState(room));
	}

	next(room: RoomState) {
		const type = room.state.type;
		if (type === "youtube") return this.youtubeService.next(room);
		if (type === "telegram") return this.telegramService.next(room);
		return { success: false, error: "No active media" };
	}

	prev(room: RoomState) {
		const type = room.state.type;
		if (type === "youtube") return this.youtubeService.prev(room);
		if (type === "telegram") return this.telegramService.prev(room);
		return { success: false, error: "No active media" };
	}

	pause(room: RoomState) {
		room.state.paused = !room.state.paused;
		if (room.state.paused) {
			this.roomsService.pauseTime(room);
		} else {
			this.roomsService.resumeTime(room);
		}
		this.emit(room, "video-pause");
		return { success: true };
	}

	seek(room: RoomState, time: string) {
		const timeStr = time || "0";
		const isRelative = timeStr.startsWith("p") || timeStr.startsWith("n");
		const cleanTime = isRelative ? timeStr.slice(1) : timeStr;
		const parts = cleanTime.split(":").map(p => parseInt(p));
		const timeDelta =
			parts.length === 3
				? parts[0] * 3600 + parts[1] * 60 + parts[2]
				: parts.length === 2
					? parts[0] * 60 + parts[1]
					: parts[0];

		let seekTime = timeDelta;
		if (isRelative) {
			const currentTime = this.roomsService.getCurrentState(room).time;
			seekTime = timeStr[0] === "p" ? currentTime + timeDelta : currentTime - timeDelta;
		}
		if (isNaN(seekTime) || seekTime < 0) seekTime = 0;
		this.roomsService.seekTime(room, seekTime);
		this.emit(room, "video-seek");
		return { success: true };
	}
}
