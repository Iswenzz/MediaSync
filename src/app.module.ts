import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppGateway } from "./app.gateway";
import { YoutubeController } from "./controllers/youtube.controller";
import { StateService } from "./services/state.service";
import { BrowserService } from "./services/browser.service";
import { YoutubeService } from "./services/youtube.service";

@Module({
	controllers: [YoutubeController],
	providers: [AppGateway, StateService, BrowserService, YoutubeService],
	imports: [
		ConfigModule.forRoot({
			envFilePath:
				process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"
		})
	]
})
export class AppModule {}
