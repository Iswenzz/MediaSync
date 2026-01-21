import { Injectable } from "@nestjs/common";

@Injectable()
export class StateService {
	state: State = {
		type: "",
		id: "",
		index: 0,
		time: 0,
		paused: false,
		looped: false,
		mode: ""
	};
	ids: string[];
	startedAt: number | null = null;
	pausedTime: number = 0;

	getCurrentState() {
		if (this.startedAt) {
			this.state.time = Math.floor((Date.now() - this.startedAt) / 1000) + this.pausedTime;
		}
		return this.state;
	}
	resetTime() {
		this.state.time = 0;
		this.startedAt = Date.now();
		this.pausedTime = 0;
	}
	pauseTime() {
		if (this.startedAt) {
			this.pausedTime = Math.floor((Date.now() - this.startedAt) / 1000) + this.pausedTime;
			this.state.time = this.pausedTime;
			this.startedAt = null;
		}
	}
	resumeTime() {
		this.startedAt = Date.now();
	}
	seekTime(time: number) {
		this.state.time = time;
		this.pausedTime = time;
		this.startedAt = this.state.paused ? null : Date.now();
	}
}

type State = {
	type: string;
	mode: string;
	id: string;
	index: number;
	time: number;
	paused: boolean;
	looped: boolean;
};
