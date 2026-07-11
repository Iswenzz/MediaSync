import { Injectable, NotFoundException, PipeTransform } from "@nestjs/common";

import { RoomService, RoomState } from "@/services/room.service";

@Injectable()
export class RoomPipe implements PipeTransform<string, RoomState> {
	constructor(private roomService: RoomService) {}

	transform(roomId: string) {
		const room = this.roomService.get(roomId);
		if (!room) throw new NotFoundException("Room not found");
		return room;
	}
}
