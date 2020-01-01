import Col from 'antd/es/col';
import Divider from 'antd/es/divider';
import Row from 'antd/es/row';
import * as React from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import { style } from 'typestyle';
import { FireStoreBases } from '../firebase';
import { SiloTags } from '../silo/silo.tag';
import { StBreadCrumb } from '../util/breacrumb';
import { ViewBaseStats } from './base.stats';
import { ViewBaseDef } from './tiles/base.def';
import { ViewBaseMain } from './tiles/base.main';
import { ViewBaseOff } from './tiles/base.off';
import { Base, BaseBuilder } from '@st/shared';
import { BaseX, BaseY } from '@cncta/clientlib';
const TileSize = 64;

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
const ResourceCountsCss = style({ display: 'flex', alignItems: 'center' });
export enum ComponentLoading {
    Ready,
    Loading,
    Failed,
    Done,
}
type ViewBaseProps = RouteComponentProps<{ baseId?: string }>;

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
    const silos = base.info.stats;
    return (
        <React.Fragment>
            {FlexRow(
                'Owner',
                <Link to={`/world/${base.worldId}/player/${base.owner?.id}`}>{base.owner?.name}</Link>,
                base.owner != null,
            )}
            {FlexRow(
                'Alliance',
                <Link to={`/world/${base.worldId}/alliance/${base.alliance?.id}`}>{base.alliance?.name}</Link>,
                base.alliance != null,
            )}
            {FlexRow('World', base.worldId)}
            {FlexRow('Location', `${base.x}:${base.y}`, base.x > 0)}
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
    state = { base: new Base(), state: ComponentLoading.Ready };

    componentDidMount() {
        const { baseId } = this.props.match.params;
        if (baseId == null) {
            return;
        }

        if (baseId.indexOf('|') > -1) {
            this.setState({ base: BaseBuilder.fromCnCOpt(baseId), state: ComponentLoading.Done });
        } else {
            this.setState({ base: new Base(), state: ComponentLoading.Loading });
            this.loadBase(baseId);
        }
    }

    async loadBase(baseId: string) {
        console.log('LoadBase', baseId);
        const doc = await FireStoreBases.doc(baseId).get();
        console.log('Loaded', doc, doc.exists, doc.data());
        if (!doc.exists) {
            this.setState({ base: this.state.base, state: ComponentLoading.Failed });
            return;
        }
        const data = doc.data();
        if (data == null) {
            this.setState({ base: this.state.base, state: ComponentLoading.Failed });
            return;
        }
        const base = BaseBuilder.load(data);
        this.setState({ base, state: ComponentLoading.Done });
    }

    render() {
        const { base, state } = this.state;
        if (state == ComponentLoading.Loading) {
            return <div>Loading...</div>;
        }
        if (state == ComponentLoading.Failed) {
            return <div>Could not find base</div>;
        }

        const baseWidth = TileSize * BaseX.Max + 'px';
        return (
            <React.Fragment>
                <StBreadCrumb
                    worldId={base.worldId}
                    alliance={base.alliance}
                    player={base.owner}
                    base={{ id: base.id, name: base.name }}
                />
                <div className={BaseCss.Base}>
                    <Divider>{base.name}</Divider>

                    <div style={{ width: baseWidth }}>
                        <div>{viewBaseLocation(base)}</div>
                        <div style={{ width: baseWidth }}>
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