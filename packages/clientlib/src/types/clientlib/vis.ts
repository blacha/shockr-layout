/* eslint-disable @typescript-eslint/camelcase */

export enum MouseMode {
    Default = 0,
    Repair = 1,
    Move = 2,
    Upgrade = 3,
    Sell = 4,
}

export enum VisObjectType {
    UnknownType = 0,
    CityBuildingType = 1,
    CityResourceFieldType = 2,
    CityWallType = 3,
    RegionCityType = 4,
    RegionSuperWeaponType = 5,
    RegionTerrainType = 6,
    BattlegroundUnit = 7,
    ArmyUnitType = 8,
    ArmyDismissArea = 9,
    DefenseUnitType = 10,
    DefenseTerrainFieldType = 11,
    RegionMoveTarget = 12,
    RegionFreeSlotType = 13,
    RegionNPCBase = 14,
    RegionNPCCamp = 15,
    RegionPointOfInterest = 16,
    RegionRuin = 17,
    RegionGhostCity = 18,
    RegionNewPlayerSpot = 19,
    DefenseTerrainFieldAdditionalSlosType = 20,
    DefenseOffScreenUnit = 21,
    WorldObject = 24,
    WorldMapMarker = 25,
    WorldSatelliteCrashMarker = 26,
    WorldHubCenterMarker = 27,
    WorldHubControlMarker = 28,
    RegionHubServer = 29,
    RegionHubControl = 30,
    RegionHubCenter = 31,
    RegionAllianceMarker = 32,
    WorldCityOwn = 33,
    WorldAllianceMarker = 34,
    WorldPOI = 35,
    WorldCityNotOwn = 36,
}

export type RegionNpcCamp = VisObject;
export type RegionObject = VisObject;

export interface VisObject {
    get_Id(): number;
    get_X(): number;
    get_Y(): number;
    get_VisObjectType(): VisObjectType;
    get_Coordinates(): number;
}

export interface ClientLibVis {
    CenterGridPosition(x: number, y: number): void;
    Update(): void;
    ViewUpdate(): void;

    get_MouseMode(): MouseMode;

    get_SelectedObject(): VisObject | null;
}