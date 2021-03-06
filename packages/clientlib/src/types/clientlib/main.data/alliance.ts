import { ClientLibStatic } from '..';
import { FactionType } from '../../game/faction';
import { ClientLibMap } from '../util';
import { AllianceName, AllianceId } from '../../../id';
import { ClientLibEventEmitter } from '../event';

export type GameStep = number;
/* eslint-disable @typescript-eslint/camelcase */

export const enum AllianceMemberOnlineState {
    Online = 1,
    Away = 2,
    Offline = 0,
    Hidden = 3,
}

export interface ClientLibAllianceMemberData {
    ActiveState: number;
    Bases: number;
    Faction: FactionType;
    HasControlHubCode: boolean;
    Id: number;
    JoinStep: GameStep;
    /** Date last seen, timestamp in ms */
    lastSeen: number;
    Points: number;
    Name: string;
    level: number;
    OnlineState: AllianceMemberOnlineState;
    Rank: number;
    Role: number;
    RoleName: string;
    VeteranPointContribution: number;
}

export const enum AllianceDiplomacyStatus {
    Friend = 1,
    NAP = 2,
    Foe = 3,
}

export interface ClientLibAllianceEvents {
    Change: ClientLibStatic['Data']['AllianceChange'];
}

export declare class ClientLibAlliance extends ClientLibEventEmitter<ClientLibAllianceEvents> {
    /**
     * Get alliance Id
     * @returns allianceId or 0 if not part of an alliance
     */
    get_Id(): AllianceId | 0;
    /**
     * Get alliance name,
     *
     * @returns allianceName or '' if not part of alliance
     */
    get_Name(): AllianceName | '';

    get_MemberData(): ClientLibMap<ClientLibAllianceMemberData>;

    /** Get the relationship of your alliance to their alliance */
    GetRelation(allianceId: number): AllianceDiplomacyStatus | -1;

    /** Force a refresh of member data */
    RefreshMemberData(): void;
}
