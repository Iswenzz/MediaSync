import { Injectable } from "@nestjs/common";

@Injectable()
export class RoomService {
	private rooms = new Map<string, RoomState>();

	ensure(id: string) {
		if (this.rooms.has(id)) return false;
		this.rooms.set(id, {
			id,
			state: {
				type: "",
				mode: "",
				id: "",
				index: 0,
				time: 0,
				duration: 0,
				paused: false,
				looped: false,
				live: false
			},
			ids: [],
			startedAt: null,
			pausedTime: 0
		});
		return true;
	}

	get(id: string) {
		return this.rooms.get(id) ?? null;
	}

	getCurrentState(room: RoomState) {
		if (room.startedAt) {
			room.state.time = Math.floor((Date.now() - room.startedAt) / 1000) + room.pausedTime;
		}
		return room.state;
	}

	resetTime(room: RoomState) {
		room.state.time = 0;
		room.startedAt = Date.now();
		room.pausedTime = 0;
	}

	pauseTime(room: RoomState) {
		if (!room.startedAt) return;
		room.pausedTime = Math.floor((Date.now() - room.startedAt) / 1000) + room.pausedTime;
		room.state.time = room.pausedTime;
		room.startedAt = null;
	}

	resumeTime(room: RoomState) {
		room.startedAt = Date.now();
	}

	seekTime(room: RoomState, time: number) {
		room.state.time = time;
		room.pausedTime = time;
		room.startedAt = room.state.paused ? null : Date.now();
	}
}

export type State = {
	type: string;
	mode: string;
	id: string;
	index: number;
	time: number;
	duration: number;
	paused: boolean;
	looped: boolean;
	live: boolean;
};

export type RoomState = {
	id: string;
	state: State;
	ids: string[];
	startedAt: Nullable<number>;
	pausedTime: number;
};
