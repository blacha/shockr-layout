import { RouteComponentProps, Link } from "react-router-dom";
import { PlayerStats, AllianceColumns } from "../alliance/alliance";
import { ComponentLoading } from "../base/base";
import React = require("react");
import { BasePacker } from "../../lib/base/base.packer";
import { FireStorePlayer } from "../firebase";
import { CityLayout } from "../../api/city.layout";
import { BaseBuilder } from "../../lib/base/base.builder";
import { Id } from "../../lib/id";
import { GameResources } from "../../lib/game.resources";
import Divider from "antd/es/divider";
import Table from "antd/es/table";
import BackTop from "antd/es/back-top";
import { Base } from "../../lib/base/base";
import { formatNumber } from "../../lib/util";

type PlayerProps = RouteComponentProps<{ worldId: string; playerId: string }>;

interface PlayerState extends PlayerStats {
    state: ComponentLoading;
}
export const PlayerColumns = [{
    title: 'Name',
    dataIndex: '',
    key: 'name',
    render: (base: Base) => <Link to={`/world/${base.worldId}/base/${base.id}`}>{base.name}</Link>,
    sorter: (a: Base, b: Base) => a.name.localeCompare(b.name)
},        {
    title: 'Level',
    dataIndex: '',
    key: 'level',
    render: (main: Base) => formatNumber(main.level),
    sorter: (a: Base, b: Base) => a.level - b.level,
},{
    title: 'Production',
    key: 'production',
    children: [
        {
            title: 'Tiberium',
            dataIndex: 'info.production.total',
            key: 'tiberium',
            render: (production: GameResources) => formatNumber(production.tiberium),
            sorter: (a: Base, b: Base) => a.info.production.total.tiberium - b.info.production.total.tiberium,
        },
        {
            title: 'Crystal',
            dataIndex: 'info.production.total',
            key: 'crystal',
            render: (production: GameResources) => formatNumber(production.crystal),
            sorter: (a: Base, b: Base) => a.info.production.total.crystal - b.info.production.total.crystal,
        },
        {
            title: 'Credits',
            dataIndex: 'info.production.total',
            key: 'credits',
            render: (production: GameResources) => formatNumber(production.credits),
            sorter: (a: Base, b: Base) => a.info.production.total.credits - b.info.production.total.credits,
        },            {
            title: 'Power',
            dataIndex: 'info.production.total',
            key: 'power',
            render: (production: GameResources) => formatNumber(production.power),
            sorter: (a: Base, b: Base) =>                a.info.production.total.power - b.info.production.total.power,
        },
    ],
}, {
    title: 'Army',
    key: 'army',
    children: [
        {
            title: 'CC',
            dataIndex: '',
            key: 'command',
            defaultSortOrder: 'descend' as const,
            render: (main: Base) => formatNumber(main.buildings.commandCenter?.level),
            sorter: (a: Base, b: Base) =>                (a.buildings.commandCenter?.level || 0) - (b.buildings.commandCenter?.level || 0),
        },
        {
            title: 'Off',
            dataIndex: '',
            key: 'off',
            defaultSortOrder: 'descend' as const,
            render: (main: Base) => formatNumber(main.levelOffense),
            sorter: (a: Base, b: Base) => a.levelOffense - b.levelOffense,
        },
        {
            title: 'Def',
            dataIndex: '',
            key: 'def',
            render: (main: Base) => formatNumber(main.levelDefense),
            sorter: (a: Base, b: Base) => a.levelDefense - b.levelDefense,
        }]
    }]

export class ViewPlayer extends React.Component<PlayerProps, PlayerState> {
    state: PlayerState = { state: ComponentLoading.Ready } as any;

    componentDidMount() {
        const { worldId, playerId } = this.props.match.params;
        console.log('LoadPlayer', this.props.match.params);
        this.loadPlayer(Number(worldId), Number(playerId));
    }

    async loadPlayer(worldId: number, playerId: number) {
        const docId = BasePacker.id.pack(worldId, playerId);
        console.log(docId);
        this.setState({ state: ComponentLoading.Loading });
        const result = await FireStorePlayer.doc(docId).get()
        if (!result.exists) {
            this.setState({state: ComponentLoading.Failed});
            return;
        }

        const cities =  (result.get('bases') ?? {})as Record<string, CityLayout>
        const bases = Object.values(cities).map(c => BaseBuilder.load(c));
        const current:PlayerStats = {
            id: Id.generate(),
            name: '',
            bases: [],
            production: new GameResources(),
            main: bases[0],
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
            console.log(base.info.production)
            current.production.add(base.info.production.total);
        }

        this.setState({ ...current, state: ComponentLoading.Done });
    }

    get isLoading() {
        return this.state.state == ComponentLoading.Loading;
    }

    render() {
        if (this.state == null || this.isLoading) {
            return <div>Loading...</div>
        }
        const {bases} = this.state;
        return (
            <React.Fragment>
                <Divider>{this.state.name}</Divider>
                <Table
                    rowKey="id"
                    dataSource={bases}
                    columns={PlayerColumns}
                    pagination={false}
                    bordered
                    loading={this.isLoading}
                    size="small"
                />
                <BackTop></BackTop>
            </React.Fragment>
        );
    }
}