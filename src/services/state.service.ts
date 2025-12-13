import { Injectable } from "@nestjs/common";

import { AppGateway } from "@/app.gateway";

@Injectable()
export class StateService {
	state: State = {
		type: "",
		id: "",
		time: 0,
		paused: false,
		index: 0
	};
	ids: string[];
	timer: NodeJS.Timeout | null;

	constructor(private appGateway: AppGateway) {}

	startTimer() {
		this.clearTimer();
		this.timer = setInterval(() => {
			this.state.time += 5;
			this.appGateway.broadcast("video", this.state);
		}, 5000);
	}

	clearTimer() {
		if (this.timer) clearInterval(this.timer);
	}
}

type State = {
	type: string;
	id: string;
	index: number;
	time: number;
	paused: boolean;
};
