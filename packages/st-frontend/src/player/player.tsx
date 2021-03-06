import { PlayerId, WorldId } from '@cncta/clientlib';
import { V2Sdk } from '@st/api';
import { Base, BaseBuilder, formatNumber, GameResources, Id, mergeBaseUpgrade } from '@st/shared';
import BackTop from 'antd/es/back-top';
import Divider from 'antd/es/divider';
import Spin from 'antd/es/spin';
import Table from 'antd/es/table';
import { Link, RouteComponentProps } from 'react-router-dom';
import { style } from 'typestyle';
import { PlayerStats } from '../alliance/alliance.table';
import { Cs } from '../base/base';
import { FireAnalytics } from '../firebase';
import { timeSince } from '../time.util';
import { StBreadCrumb } from '../util/breacrumb';
import { FactionName } from '../util/faction';
import { ViewResearch } from '../util/research';
import React = require('react');

type PlayerProps = RouteComponentProps<{ worldId: string; playerId: string }>;

interface PlayerState extends PlayerStats {
    state: Cs;
}
export const PlayerColumns = [
    {
        title: '#',
        key: 'index',
        render: (main: Base, record: any, index: number) => index + 1,
        width: 35,
    },
    {
        title: 'Name',
        key: 'name',
        render: (base: Base) => (
            <Link to={`/world/${base.worldId}/player/${base.owner?.id}/city/${base.cityId}`}>{base.name}</Link>
        ),
        sorter: (a: Base, b: Base) => a.name.localeCompare(b.name),
    },
    {
        title: 'Level',
        key: 'level',
        render: (main: Base) => formatNumber(main.level),
        sorter: (a: Base, b: Base) => a.level - b.level,
    },
    {
        title: 'Production',
        key: 'production',
        children: [
            {
                title: 'Tiberium',
                key: 'tiberium',
                render: (b: Base) => formatNumber(b.info.production.total.tiberium),
                sorter: (a: Base, b: Base) => a.info.production.total.tiberium - b.info.production.total.tiberium,
            },
            {
                title: 'Crystal',
                key: 'crystal',
                render: (b: Base) => formatNumber(b.info.production.total.crystal),
                sorter: (a: Base, b: Base) => a.info.production.total.crystal - b.info.production.total.crystal,
            },
            {
                title: 'Credits',
                key: 'credits',
                render: (b: Base) => formatNumber(b.info.production.total.credits),
                sorter: (a: Base, b: Base) => a.info.production.total.credits - b.info.production.total.credits,
            },
            {
                title: 'Power',
                key: 'power',
                render: (b: Base) => formatNumber(b.info.production.total.power),
                sorter: (a: Base, b: Base) => a.info.production.total.power - b.info.production.total.power,
            },
        ],
    },
    {
        title: 'Army',
        key: 'army',
        children: [
            {
                title: 'CC',
                key: 'armyCommand',
                render: (main: Base) => Math.floor(main.buildings.commandCenter?.level ?? 0) || '',
                sorter: (a: Base, b: Base) =>
                    (a.buildings.commandCenter?.level || 0) - (b.buildings.commandCenter?.level || 0),
            },
            {
                title: 'Off',
                key: 'armyOff',
                render: (main: Base) => formatNumber(main.levelOffense),
                sorter: (a: Base, b: Base) => a.levelOffense - b.levelOffense,
            },
            {
                title: 'Def',
                key: 'armyDef',
                render: (main: Base) => formatNumber(main.levelDefense),
                sorter: (a: Base, b: Base) => a.levelDefense - b.levelDefense,
            },
        ],
    },
    {
        title: 'Cost',
        key: 'cost',
        children: [
            {
                title: 'Base',
                key: 'baseCost',
                defaultSortOrder: 'descend' as const,
                render: (main: Base) => formatNumber(main.info.cost.base.total),
                sorter: (a: Base, b: Base) => a.info.cost.base.total - b.info.cost.base.total,
            },
            {
                title: 'Off',
                key: 'offCost',
                render: (main: Base) => formatNumber(main.info.cost.off.total),
                sorter: (a: Base, b: Base) => a.info.cost.off.total - b.info.cost.off.total,
            },
            {
                title: 'Def',
                key: 'defCost',
                render: (main: Base) => formatNumber(main.info.cost.def.total),
                sorter: (a: Base, b: Base) => a.info.cost.def.total - b.info.cost.def.total,
            },
        ],
    },
    {
        title: 'Updated',
        key: 'Updated',
        render: (base: Base) => timeSince(base.updatedAt),
        sorter: (a: Base, b: Base) => a.updatedAt - b.updatedAt,
    },
];

export class ViewPlayer extends React.Component<PlayerProps, PlayerState> {
    static tableCss = style({ width: '100%' });
    state: PlayerState = { state: Cs.Init } as any;

    componentDidMount() {
        const { worldId, playerId } = this.props.match.params;
        this.loadPlayer(Number(worldId) as WorldId, Number(playerId) as PlayerId);
    }

    async loadPlayer(worldId: WorldId, playerId: PlayerId) {
        FireAnalytics.logEvent('Player:Load', { worldId: worldId, playerId });

        this.setState({ state: Cs.Loading });
        const result = await V2Sdk.call('player.city.get', { worldId, playerId });
        if (!result.ok) {
            FireAnalytics.logEvent('Player:LoadFailed', { worldId: worldId, playerId });
            this.setState({ state: Cs.Failed });
            return;
        }

        const cities = result.response.cities;
        const bases = Object.values(cities).map(c => BaseBuilder.load(c));
        const current: PlayerStats = {
            id: Id.generate(),
            name: '',
            bases: [],
            production: new GameResources(),
            main: bases[0],
            updatedAt: bases[0].updatedAt,
            upgrades: {},
            cost: new GameResources(),
        };

        for (const base of bases) {
            if (base.owner == null) {
                continue;
            }
            current.name = base.owner.name;

            if (current.main.levelOffense < base.levelOffense) {
                current.main = base;
            }
            current.bases.push(base);
            current.production.add(base.info.production.total);
            current.cost.add(base.info.cost.total);
            mergeBaseUpgrade(base.upgrades, current.upgrades);
        }

        this.setState({ ...current, state: Cs.Done });
    }

    get isLoading() {
        return this.state.state == Cs.Loading;
    }

    render() {
        if (this.state == null || this.isLoading || this.state.main == null) {
            return <Spin />;
        }

        const { bases } = this.state;
        return (
            <React.Fragment>
                <StBreadCrumb
                    worldId={this.state.main.worldId}
                    alliance={this.state.main.alliance}
                    player={this.state.main.owner}
                />
                <Divider>
                    <FactionName name={this.state.name} faction={this.state.main.faction} />
                </Divider>
                <Table
                    className={ViewPlayer.tableCss}
                    rowKey="cityId"
                    dataSource={bases}
                    columns={PlayerColumns}
                    pagination={false}
                    bordered
                    loading={this.isLoading}
                    size="small"
                />
                <Divider>Research</Divider>
                <ViewResearch faction={this.state.main.faction} upgrades={this.state.upgrades} style="icon" />
                <BackTop></BackTop>
            </React.Fragment>
        );
    }
}
