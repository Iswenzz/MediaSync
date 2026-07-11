import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppGateway } from "./app.gateway";
import { RoomsController } from "./controllers/rooms.controller";
import { YoutubeController } from "./controllers/youtube.controller";
import { TelegramController } from "./controllers/telegram.controller";
import { VideoController } from "./controllers/video.controller";
import { RoomsService } from "./services/rooms.service";
import { BrowserService } from "./services/browser.service";
import { YoutubeService } from "./services/youtube.service";
import { TelegramService } from "./services/telegram.service";
import { VideoService } from "./services/video.service";

@Module({
	controllers: [RoomsController, YoutubeController, TelegramController, VideoController],
	providers: [
		AppGateway,
		RoomsService,
		BrowserService,
		YoutubeService,
		TelegramService,
		VideoService
	],
	imports: [
		ConfigModule.forRoot({
			envFilePath:
				process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"
		})
	]
})
export class AppModule {}
