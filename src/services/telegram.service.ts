import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { TelegramClient, Api, sessions } from "telegram";
import bigInt from "big-integer";
import type { Response } from "express";

import { AppGateway } from "@/app.gateway";
import { ChunkCache, CHUNK_SIZE } from "@/utils/chunk-cache";

import { StateService } from "./state.service";

const { StringSession } = sessions;

@Injectable()
export class TelegramService implements OnModuleInit {
	private readonly logger = new Logger(TelegramService.name);
	private client: Nullable<TelegramClient> = null;
	private channel: string = "";
	private metadataCache = new Map<string, VideoMetadata>();
	private activeVideo: Nullable<ActiveVideo> = null;
	private videoIds: number[] = [];
	private currentIndex: number = -1;

	constructor(
		private appGateway: AppGateway,
		private stateService: StateService
	) {}

	broadcast(event: string) {
		this.appGateway.broadcast(event, this.stateService.getCurrentState());
	}

	async onModuleInit() {
		const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
		const apiHash = process.env.TELEGRAM_API_HASH || "";
		const stringSession = process.env.TELEGRAM_STRING_SESSION || "";

		if (!apiId || !apiHash || !stringSession) {
			this.logger.warn("Missing Telegram credentials");
			return;
		}
		const silentLogger = {
			debug: () => {},
			info: () => {},
			warn: this.logger.warn,
			error: this.logger.error
		};
		this.client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, {
			connectionRetries: 5,
			baseLogger: silentLogger as any
		});

		try {
			await this.client.connect();
			if (!(await this.client.isUserAuthorized())) {
				this.logger.warn("Telegram not authorized.");
			} else {
				this.logger.log("Telegram connected");
			}
		} catch (error) {
			this.logger.error("Telegram failed to connect", error.message);
			this.client = null;
		}
	}

	async setChannel(name: string, limit: number) {
		if (!this.client) return;
		const channel = name.replace(/^@/, "");
		this.channel = channel;
		this.metadataCache.clear();
		this.activeVideo = null;
		this.videoIds = [];
		this.currentIndex = -1;
		await this.fetchVideoIds(limit);
		if (this.videoIds.length) {
			await this.video(this.videoIds[0]);
		}
		return { success: true, channel: this.channel };
	}

	async next() {
		if (!this.videoIds.length) return;
		this.currentIndex = (this.currentIndex + 1) % this.videoIds.length;
		return this.video(this.videoIds[this.currentIndex]);
	}

	async prev() {
		if (!this.videoIds.length) return;
		this.currentIndex =
			this.currentIndex <= 0 ? this.videoIds.length - 1 : this.currentIndex - 1;
		return this.video(this.videoIds[this.currentIndex]);
	}

	async video(messageId: number) {
		if (!this.channel) {
			return { success: false, error: "No channel set" };
		}
		try {
			const metadata = await this.getMetadata(messageId);
			if (!metadata) {
				return { success: false, error: "Message not found or has no video" };
			}
			if (this.activeVideo) {
				this.activeVideo.cache.clear();
			}
			this.stateService.state.type = "telegram";
			this.stateService.state.mode = "video";
			this.stateService.state.id = `${this.channel}:${messageId}`;
			this.stateService.state.looped = false;
			this.stateService.state.live = false;
			this.stateService.state.duration = 0;
			this.stateService.state.paused = false;
			this.stateService.resetTime();
			this.broadcast("video");
			this.activeVideo = { metadata, cache: new ChunkCache() };
			return { success: true, channel: this.channel };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	async stream(range: string | undefined, res: Response) {
		if (!this.client || !range) return;
		const video = this.activeVideo;
		if (!video) return;
		const { metadata, cache } = video;
		const { fileSize, mimeType } = metadata;
		const parts = range.replace(/bytes=/, "").split("-");
		const start = parseInt(parts[0], 10);
		const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

		if (start >= fileSize) {
			res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).end();
			return;
		}
		res.status(206);
		res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
		res.setHeader("Content-Length", end - start + 1);
		res.setHeader("Content-Type", mimeType);
		res.setHeader("Accept-Ranges", "bytes");

		const state = { aborted: false };
		res.on("close", () => {
			state.aborted = true;
		});
		try {
			let position = start;
			while (position <= end && !state.aborted) {
				const chunkIndex = Math.floor(position / CHUNK_SIZE);
				const chunkOffset = chunkIndex * CHUNK_SIZE;
				const chunkData = await cache.getChunk(chunkIndex, () =>
					this.fetchChunk(metadata, chunkIndex)
				);
				if (state.aborted) break;
				const offsetInChunk = position - chunkOffset;
				const remaining = end - position + 1;
				const available = chunkData.length - offsetInChunk;
				const toWrite = Math.min(available, remaining);
				if (toWrite <= 0) break;

				const slice = chunkData.subarray(offsetInChunk, offsetInChunk + toWrite);
				if (!res.write(slice)) {
					await new Promise<void>(resolve => res.once("drain", resolve));
				}
				position += toWrite;
			}
		} catch (error) {
			this.logger.error("Stream failed", error.message);
		}
		res.end();
	}

	private async fetchVideoIds(limit: number) {
		if (!this.client) return;
		try {
			const messages = await this.client.getMessages(this.channel, {
				filter: new Api.InputMessagesFilterVideo(),
				limit
			});
			this.videoIds = messages.filter(m => m?.media).map(m => m.id);
		} catch {
			this.videoIds = [];
		}
	}

	private async fetchChunk(metadata: VideoMetadata, chunkIndex: number) {
		if (!this.client) throw new Error("Telegram not initialized");
		const offset = chunkIndex * CHUNK_SIZE;
		const buffers: Buffer[] = [];
		let collected = 0;

		for await (const chunk of this.client.iterDownload({
			file: metadata.inputLocation,
			offset: bigInt(offset),
			requestSize: CHUNK_SIZE,
			dcId: metadata.dcId
		})) {
			buffers.push(chunk);
			collected += chunk.length;
			if (collected >= CHUNK_SIZE) break;
		}
		const result = Buffer.concat(buffers);
		return result.length > CHUNK_SIZE ? result.subarray(0, CHUNK_SIZE) : result;
	}

	private async getMetadata(messageId: number) {
		if (!this.client) return null;
		const cacheKey = `${this.channel}:${messageId}`;
		if (this.metadataCache.has(cacheKey)) return this.metadataCache.get(cacheKey)!;

		const messages = await this.client.getMessages(this.channel, { ids: [messageId] });
		const message = messages[0];
		if (!message?.media) return null;

		if (
			message.media instanceof Api.MessageMediaDocument &&
			message.media.document instanceof Api.Document
		) {
			const doc = message.media.document;
			const metadata: VideoMetadata = {
				inputLocation: new Api.InputDocumentFileLocation({
					id: doc.id,
					accessHash: doc.accessHash,
					fileReference: doc.fileReference,
					thumbSize: ""
				}),
				dcId: doc.dcId,
				fileSize: Number(doc.size),
				mimeType: doc.mimeType || "video/mp4"
			};
			this.metadataCache.set(cacheKey, metadata);
			return metadata;
		}
		return null;
	}
}

interface VideoMetadata {
	inputLocation: Api.InputDocumentFileLocation;
	dcId: number;
	fileSize: number;
	mimeType: string;
}

interface ActiveVideo {
	metadata: VideoMetadata;
	cache: ChunkCache;
}
