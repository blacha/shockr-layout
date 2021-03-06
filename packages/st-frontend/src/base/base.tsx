import { BaseX, CityId, PlayerId, WorldId } from '@cncta/clientlib';
import { getWorldName } from '@cncta/util/src';
import { V2Sdk } from '@st/api';
import { Base, BaseBuilder, StLog, WorldCityId, BaseExporter } from '@st/shared';
import Col from 'antd/es/col';
import Divider from 'antd/es/divider';
import Icon from 'antd/es/icon';
import Row from 'antd/es/row';
import Spin from 'antd/es/spin';
import Tooltip from 'antd/es/tooltip';
import * as qs from 'query-string';
import * as React from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import { style } from 'typestyle';
import { FireAnalytics } from '../firebase';
import { unpackLayouts } from '../layout/layout.util';
import { SiloTags } from '../silo/silo.tag';
import { StBreadCrumb } from '../util/breacrumb';
import { FactionName } from '../util/faction';
import { ViewBaseStats } from './base.stats';
import { ViewBaseDef } from './tiles/base.def';
import { ViewBaseMain } from './tiles/base.main';
import { ViewBaseOff } from './tiles/base.off';

const TileSize = 64;
export interface ViewBaseQuery {
    worldId: string;
    x: string;
    y: string;
    layout: string;
}

export const BaseCss = {
    Base: style({
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    }),
    BaseDef: style({
        margin: '16px 0',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    }),
    Total: style({ fontWeight: 'bold' }),
    Title: style({ fontWeight: 'bold' }),
};
const ResourceCountsCss = style({ display: 'flex', alignItems: 'center', marginRight: '-8px' });
/** ComponentState */
export enum Cs {
    Init,
    Loading,
    Refreshing,
    Failed,
    Done,
}
type ViewBaseProps = RouteComponentProps<{ cityId?: string; playerId?: string; worldId?: string }>;

function FlexRow(key: string, value?: string | number | null | React.ReactNode, display = true) {
    if (value == null || display == false) {
        return null;
    }
    return (
        <Row type="flex" justify="space-between" gutter={[16, 16]}>
            <Col>{key}</Col>
            <Col>{value}</Col>
        </Row>
    );
}

function viewBaseLocation(base: Base) {
    if (base.x < 0) {
        return '';
    }
    const silos = base.info.silos;
    return (
        <React.Fragment>
            {FlexRow(
                'Owner',
                <Link to={`/world/${base.worldId}/player/${base.owner?.id}`}>{base.owner?.name}</Link>,
                base.owner != null && base.owner.name != '',
            )}
            {FlexRow(
                'Alliance',
                <Link to={`/world/${base.worldId}/alliance/${base.alliance?.id}`}>{base.alliance?.name}</Link>,
                base.alliance != null && base.alliance.id != 0,
            )}
            {FlexRow('World', getWorldName(base.worldId))}
            {FlexRow('Location', `${base.x}:${base.y}`, base.x > 0)}
            {FlexRow('Links', <a href={`http://cncopt.com/?map=${BaseExporter.toCncOpt(base)}`}>cncopt</a>, base.x > 0)}

            <Row type="flex" justify="space-between" gutter={[4, 16]}>
                <Col>Silos</Col>
                <Col className={ResourceCountsCss}>
                    <SiloTags minSize={4} resource={'tiberium'} silos={silos} />
                    <SiloTags minSize={4} resource={'crystal'} silos={silos} />
                    <SiloTags minSize={4} resource={'mixed'} silos={silos} />
                </Col>
            </Row>
        </React.Fragment>
    );
}

export class ViewBase extends React.Component<ViewBaseProps> {
    state = { base: new Base(), state: Cs.Init };

    componentDidMount() {
        const { cityId, playerId, worldId } = this.props.match.params;
        StLog.info({ playerId, cityId, worldId }, 'Loading');

        if (cityId == null) {
            const queryParams = (qs.parse(this.props.location.search) as unknown) as ViewBaseQuery;
            if (queryParams.layout != null) {
                this.loadFromQuery(queryParams);
                console.log(queryParams);
            }
            return;
        }

        if (cityId.indexOf('|') > -1) {
            this.setState({ base: BaseBuilder.fromCnCOpt(cityId), state: Cs.Done });
            return;
        }

        this.setState({ base: new Base(), state: Cs.Loading });
        if (playerId != null && worldId != null) {
            this.loadPlayerBase(Number(playerId) as PlayerId, Number(cityId) as CityId, Number(worldId) as WorldId);
        } else {
            this.loadBase(cityId);
        }
    }

    loadFromQuery(query: ViewBaseQuery) {
        const x = parseInt(query.x);
        const y = parseInt(query.y);
        const worldId = parseInt(query.worldId) as WorldId;
        if (isNaN(x) || isNaN(y) || isNaN(worldId)) return;

        const [base] = unpackLayouts([{ updatedAt: Date.now(), x, y, layout: query.layout }], worldId);
        base.updatedAt = 0;
        this.setState({ base: base, state: Cs.Done });
    }

    async loadPlayerBase(playerId: PlayerId, cityId: CityId, worldId: WorldId) {
        StLog.info({ playerId, cityId, worldId }, 'LoadingPlayerCity');
        FireAnalytics.logEvent('City:LoadPlayer', { worldId, playerId, cityId });

        const player = await V2Sdk.call('player.city.get', { worldId, playerId });
        if (!player.ok) {
            this.setState({ state: Cs.Failed });
            return;
        }

        const city = player.response.cities.find((f) => f.cityId == cityId);
        if (city == null) {
            this.setState({ state: Cs.Failed });
            return;
        }
        this.setState({ base: BaseBuilder.load(city), state: Cs.Done });
    }

    async loadBase(cityId: string) {
        StLog.info({ cityId }, 'LoadingCity');
        FireAnalytics.logEvent('City:LoadCity', { cityId });

        const city = await V2Sdk.call('city.get', { cityId });

        if (!city.ok || city.response.city == null) {
            this.setState({ base: this.state.base, state: Cs.Failed });
            return;
        }

        this.setState({ base: BaseBuilder.load(city.response.city), state: Cs.Done });
    }

    render() {
        const { base, state } = this.state;
        if (state == Cs.Loading || state == Cs.Init) {
            return <Spin />;
        }
        if (state == Cs.Failed) {
            return <div>Could not find base</div>;
        }
        console.log(base);
        const baseId =
            base.worldId > 0 && base.updatedAt > 0
                ? WorldCityId.pack({ worldId: base.worldId, cityId: base.cityId, timestamp: base.updatedAt })
                : null;
        const baseWidth = TileSize * BaseX.Max + 'px';

        if (baseId == null) {
            return (
                <div className={BaseCss.Base}>
                    <Divider>
                        <FactionName name={base.name} faction={base.faction} />
                    </Divider>

                    <div style={{ width: baseWidth }}>
                        <div>{viewBaseLocation(base)}</div>
                        <div style={{ width: baseWidth, marginBottom: 24 }}>
                            <ViewBaseStats base={base} />
                        </div>
                    </div>

                    <div style={{ width: baseWidth }}>
                        <ViewBaseMain base={base} size={TileSize} />
                        <ViewBaseDef base={base} size={TileSize} />
                        <ViewBaseOff base={base} size={TileSize} />
                    </div>
                </div>
            );
        }
        return (
            <React.Fragment>
                {baseId != null ? (
                    <StBreadCrumb
                        worldId={base.worldId}
                        alliance={base.alliance}
                        player={base.owner}
                        base={{
                            id: baseId,
                            name: base.name,
                            cityId: base.cityId,
                        }}
                    />
                ) : null}
                <div className={BaseCss.Base}>
                    <Divider>
                        <FactionName name={base.name} faction={base.faction} />
                        {baseId != null ? (
                            <Tooltip title="Create permanent base link">
                                <Link to={`/base/${baseId}`}>
                                    <Icon type="link" />
                                </Link>
                            </Tooltip>
                        ) : null}
                    </Divider>

                    <div style={{ width: baseWidth }}>
                        <div>{viewBaseLocation(base)}</div>
                        <div style={{ width: baseWidth, marginBottom: 24 }}>
                            <ViewBaseStats base={base} />
                        </div>
                    </div>

                    <div style={{ width: baseWidth }}>
                        <ViewBaseMain base={base} size={TileSize} />
                        <ViewBaseDef base={base} size={TileSize} />
                        <ViewBaseOff base={base} size={TileSize} />
                    </div>
                </div>
            </React.Fragment>
        );
    }
}
