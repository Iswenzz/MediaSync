import { Injectable, NotFoundException, PipeTransform } from "@nestjs/common";

import { RoomsService, RoomState } from "@/services/rooms.service";

@Injectable()
export class RoomPipe implements PipeTransform<string, RoomState> {
	constructor(private roomsService: RoomsService) {}

	transform(roomId: string) {
		const room = this.roomsService.get(roomId);
		if (!room) throw new NotFoundException("Room not found");
		return room;
	}
}
