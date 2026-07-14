import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

import { RoomService, RoomState } from "@/services/room.service";

@Injectable()
export class RoomPipe implements PipeTransform<string, RoomState> {
	constructor(private roomService: RoomService) {}

	transform(roomId: string) {
		if (!roomId) throw new BadRequestException("Missing room id");
		return this.roomService.getOrCreate(roomId);
	}
}
