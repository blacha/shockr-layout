import { BaseLocationPacker, StCity, InvalidAllianceId } from '@cncta/util';
import { ApiScanRequest, ApiScanResponse, BaseBuilder, BaseIdPacker, NumberPacker, CompositeId } from '@st/shared';
import { ApiCall, ApiRequest } from '../api.call';
import { WorldId, PlayerId, AllianceId, AllianceName, PlayerName } from '@cncta/clientlib';
import { Stores, ModelCity, ModelUtil } from '@st/model';

const OneMinuteMs = 60 * 1000;
const OneHourMs = 60 * OneMinuteMs;
const OneDayMs = 25 * OneHourMs;
/* Expire after 3 days */
const LayoutExpireMs = 3 * OneDayMs;

export class ApiScan extends ApiCall<ApiScanRequest> {
    path = '/api/v1/world/:worldId/player/:player/scan' as const;
    method = 'post' as const;

    async storePlayer(
        req: ApiRequest<ApiScanRequest>,
        worldId: WorldId,
        playerId: PlayerId,
        cityList?: StCity[],
    ): Promise<void> {
        if (cityList == null) {
            return;
        }
        const [firstCity] = cityList;
        const { allianceId } = firstCity;
        // No point storing everyone without alliance
        if (allianceId == null || allianceId == InvalidAllianceId) {
            return;
        }

        const allianceKey = NumberPacker.pack([worldId, allianceId]) as CompositeId<[WorldId, AllianceId]>;
        const playerDocId = NumberPacker.pack([worldId, playerId]) as CompositeId<[WorldId, PlayerId]>;
        await Stores.Player.transaction(playerDocId, playerCity => {
            playerCity.allianceKey = allianceKey;
            for (const city of cityList) {
                playerCity.addCity(city);
            }
            playerCity.worldId = worldId;
            playerCity.player = firstCity.owner;
            playerCity.playerId = playerId;
            playerCity.allianceId = allianceId;
            playerCity.alliance = firstCity.alliance as AllianceName;
        });
        req.log.info({ allianceKey, playerDocId, cities: cityList.length }, 'SetPlayer');
    }

    async storeLayouts(
        req: ApiRequest<ApiScanRequest>,
        worldId: WorldId,
        player: PlayerName,
        layoutsList: Map<string, string>,
    ) {
        if (layoutsList.size == 0) {
            return;
        }
        const playerObj = await Stores.Player.getBy({ worldId, player });
        if (playerObj == null || playerObj.allianceId == null) {
            return;
        }

        // TODO this may get too much write contention, might be a idea to shard based on layout XY
        const allianceLayoutDoc = NumberPacker.pack([worldId, playerObj.allianceId]) as CompositeId<
            [WorldId, AllianceId]
        >;

        const updatedAt = ModelUtil.TimeStamp();
        await Stores.Layout.transaction(allianceLayoutDoc, model => {
            for (const [xy, layout] of Object.entries(model.layouts)) {
                if (Date.now() - layout.updatedAt > LayoutExpireMs) {
                    delete model.layouts[xy];
                }
            }
            for (const [key, layout] of layoutsList.entries()) {
                model.layouts[key] = { layout, updatedAt };
            }
        });
    }

    async handle(req: ApiRequest<ApiScanRequest>): Promise<ApiScanResponse> {
        const worldId = Number(req.params.worldId) as WorldId;
        const player = req.params.player as PlayerName;

        const bases = req.body;

        const output: string[] = [];
        const layouts: Map<string, string> = new Map();
        const players: Map<number, StCity[]> = new Map();
        for (const baseJson of bases) {
            baseJson.timestamp = Date.now();
            const base = BaseBuilder.load(baseJson);

            if (baseJson.ownerId < 0) {
                const xy = BaseLocationPacker.pack(base.x, base.y);
                layouts.set(NumberPacker.pack(xy), baseJson.tiles);
            } else {
                const existing = players.get(baseJson.ownerId) ?? [];
                existing.push(baseJson);
                players.set(baseJson.ownerId, existing);
            }

            const baseId = BaseIdPacker.pack(base);
            await Stores.City.set(baseId, new ModelCity({ city: baseJson }));
            output.push(baseId);
        }

        if (players.size > 0) {
            for (const playerId of players.keys()) {
                req.log.info({ playerId, count: players.get(playerId)?.length }, 'StorePlayer');
                await this.storePlayer(req, worldId, playerId as PlayerId, players.get(playerId));
            }
        }

        if (layouts.size > 0) {
            req.log.info({ player, layouts: layouts.size }, 'StoreLayouts');
            await this.storeLayouts(req, worldId, player, layouts);
        }

        return { id: output, worldId };
    }
}