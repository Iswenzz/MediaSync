import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { AppGateway } from "./app.gateway";
import { BrowserService } from "./services/browser.service";
import { CronService } from "./services/cron.service";
import { RoomService } from "./services/room.service";
import { TelegramController } from "./controllers/telegram.controller";
import { TelegramService } from "./services/telegram.service";
import { VideoController } from "./controllers/video.controller";
import { VideoService } from "./services/video.service";
import { YoutubeController } from "./controllers/youtube.controller";
import { YoutubeService } from "./services/youtube.service";

@Module({
	controllers: [YoutubeController, TelegramController, VideoController],
	providers: [
		AppGateway,
		BrowserService,
		CronService,
		RoomService,
		TelegramService,
		VideoService,
		YoutubeService
	],
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule.forRoot({
			envFilePath:
				process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"
		})
	]
})
export class AppModule {}
