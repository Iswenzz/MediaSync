import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { AppGateway } from "@/app.gateway";

import { RoomService } from "./room.service";

@Injectable()
export class CronService {
	private readonly logger = new Logger(CronService.name);

	constructor(
		private roomService: RoomService,
		private appGateway: AppGateway
	) {}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	cleanupEmptyRooms() {
		for (const roomId of this.roomService.getRoomIds()) {
			if (this.appGateway.countClients(roomId) > 0) continue;
			this.roomService.delete(roomId);
			this.logger.log(`Deleted empty room ${roomId}`);
		}
	}
}
