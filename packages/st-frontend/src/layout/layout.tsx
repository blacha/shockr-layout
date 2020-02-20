import React = require('react');
import { AllianceId, AllianceName, BaseX, WorldId } from '@cncta/clientlib';
import { BaseLocationPacker, getWorldName } from '@cncta/util';
import { V2Sdk } from '@st/api';
import { Base, BaseExporter, BaseOptimizer, SiloCounts, StLog } from '@st/shared';
import Divider from 'antd/es/divider';
import Pagination from 'antd/es/pagination/Pagination';
import Spin from 'antd/es/spin';
import Tag from 'antd/es/tag';
import { action, computed, observable } from 'mobx';
import { observer } from 'mobx-react';
import { Link, RouteComponentProps } from 'react-router-dom';
import { style } from 'typestyle';
import { Cs } from '../base/base';
import { ViewBaseMain } from '../base/tiles/base.main';
import { SiloTag, SiloTags } from '../silo/silo.tag';
import { timeSince } from '../time.util';
import { StBreadCrumb } from '../util/breacrumb';
import { LayoutFilter, LayoutFilterItem } from './layout.filter';
import { unpackLayouts } from './layout.util';

const ScanListCss = style({ display: 'flex', flexWrap: 'wrap' });
const BaseCardCss = style({ padding: 4, margin: 8, borderRadius: 8 });
const BaseCardInfoCss = style({ marginTop: 4, padding: '0 4px' });

interface ScanState {
    layouts: Base[];
    state: Cs;
    silos: SiloCounts;
    currentPage?: number;
}
type ViewLayoutsProps = RouteComponentProps<{ worldId: string; allianceId: string }>;

@observer
export class ViewLayouts extends React.Component<ViewLayoutsProps, ScanState> {
    static FilterDisabledCss = style({ opacity: 0.4 });
    static FilterButtonCss = style({ cursor: 'pointer', marginRight: 8, $nest: { span: { cursor: 'pointer' } } });
    static FilterListCss = style({ display: 'flex' });
    static FilterCss = style({ display: 'flex', padding: 4 });
    static FilterTitleCss = style({ width: 85, fontWeight: 'bold' });

    @observable currentPage = 1;
    worldId: number;
    filters = new LayoutFilter();

    pageSize = 18;
    alliance?: { id: AllianceId; name: AllianceName };
    componentDidMount() {
        console.log('Mounted');
        this.setState({ state: Cs.Loading });
        const params = this.props.match.params;
        const worldId = Number(params.worldId);
        const allianceId = Number(params.allianceId);
        this.worldId = worldId;
        this.loadScan(worldId as WorldId, allianceId as AllianceId);
    }

    async loadScan(worldId: WorldId, allianceId: AllianceId) {
        const [layoutData, allianceData] = await Promise.all([
            V2Sdk.call('layout.get', { worldId, allianceId }),
            V2Sdk.call('alliance.get', { worldId, allianceId }),
        ]);
        if (layoutData.ok == false || allianceData.ok == false) {
            this.setState({ state: Cs.Failed });
            return;
        }
        const firstPlayer = allianceData.response.players[0];
        if (firstPlayer && firstPlayer.alliance) {
            this.alliance = { id: allianceId, name: firstPlayer.alliance };
        }

        StLog.info('UnpackLayouts');
        const layouts = unpackLayouts(layoutData.response.layouts);
        StLog.info('ComputeLayouts');
        console.time('ComputeLayout');
        for (const layout of layouts) {
            BaseOptimizer.buildSilos(layout);
            // Calculate accumulator data
            layout.info.computePower();
        }
        console.timeEnd('ComputeLayout');

        this.filters.setLayouts(layouts);
        this.setState({ layouts, state: Cs.Done });
    }

    @computed get layouts(): Base[] {
        const minItem = (this.currentPage - 1) * this.pageSize;
        const maxItem = this.currentPage * this.pageSize;
        return this.filters.filtered.slice(minItem, maxItem);
    }

    @action.bound
    handlePageChange(currentPage: number) {
        this.currentPage = currentPage;
    }

    renderFilters(resource: string) {
        const output = [];
        for (const filter of this.filters.filterResource) {
            if (filter.type == resource.toLowerCase()) {
                output.push(this.renderFilter(filter as LayoutFilterItem));
            }
        }
        return (
            <div className={ViewLayouts.FilterCss}>
                <div className={ViewLayouts.FilterTitleCss}>{resource}</div>
                <div className={ViewLayouts.FilterListCss}>{...output}</div>
            </div>
        );
    }

    renderFilter(f: LayoutFilterItem) {
        const className = [ViewLayouts.FilterButtonCss];
        if (f.isEnabled == false && this.filters.isAllDisabled == false) {
            className.push(ViewLayouts.FilterDisabledCss);
        }
        return (
            <div className={className.join(' ')} onClick={f.toggle} key={`${f.type}-${f.count}-${f.touches}`}>
                <SiloTag resource={f.type} count={f.count} touches={f.touches} />
                {f.layoutCount}
            </div>
        );
    }

    renderUpdatedFilter() {
        return (
            <div className={ViewLayouts.FilterCss}>
                <div className={ViewLayouts.FilterTitleCss}>Last Seen</div>
                <div className={ViewLayouts.FilterListCss}>
                    {...this.filters.updatedFilter.map(f => {
                        const className = [ViewLayouts.FilterButtonCss];
                        if (f.isEnabled == false && this.filters.isAllDisabled == false) {
                            className.push(ViewLayouts.FilterDisabledCss);
                        }
                        return (
                            <div className={className.join(' ')} onClick={f.toggle} key={`${f.type}-${f.duration}`}>
                                <Tag color={'geekblue'}>{timeSince(Date.now() - f.duration)}</Tag> {f.layoutCount}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    render() {
        if (this.state == null || this.state?.state == Cs.Loading) {
            return <Spin />;
        }
        if (this.state.state == Cs.Failed || this.state.layouts.length == 0) {
            return <div>Could not find scan</div>;
        }
        const layoutCount = this.filters.filtered.length;
        const layouts = this.layouts;
        const currentPage = this.currentPage ?? 1;

        return (
            <div style={{ width: '100%' }}>
                <StBreadCrumb worldId={this.worldId} alliance={this.alliance} layout={true} />
                <Divider>{getWorldName(this.worldId as WorldId)} - Layouts</Divider>

                <div className="filter">
                    <div>{this.renderFilters('Tiberium')}</div>
                    <div>{this.renderFilters('Crystal')}</div>
                    <div>{this.renderFilters('Mixed')}</div>
                    <div>{this.renderFilters('Power')}</div>
                    <div>{this.renderUpdatedFilter()}</div>
                </div>
                <div className={ScanListCss}>
                    {layouts.map(base => {
                        const baseId = BaseLocationPacker.pack(base.x, base.y);
                        return <LayoutView base={base} key={baseId} />;
                    })}
                </div>

                <Pagination
                    current={currentPage}
                    total={layoutCount - 1}
                    pageSize={this.pageSize}
                    onChange={this.handlePageChange}
                />
            </div>
        );
    }
}

export class LayoutView extends React.Component<{ base: Base }> {
    render() {
        const base = this.props.base;
        const baseId = BaseLocationPacker.pack(base.x, base.y);
        const timeAgo = timeSince(base.updatedAt);
        const silos = base.info.silos;

        return (
            <div className={BaseCardCss} style={{ width: 24 * BaseX.Max + 'px' }} key={baseId}>
                <Divider>
                    <Link to={`/base/${BaseExporter.toCncOpt(base)}`}>
                        {base.x}:{base.y}
                    </Link>
                </Divider>
                <div style={{ width: 24 * BaseX.Max + 'px' }}>
                    <ViewBaseMain base={base} key={baseId} size={24} />
                </div>
                <div className={BaseCardInfoCss}>
                    <SiloTags minSize={4} resource={'tiberium'} silos={silos} />
                    <SiloTags minSize={4} resource={'crystal'} silos={silos} />
                    <SiloTags minSize={4} resource={'mixed'} silos={silos} />

                    <div style={{ float: 'right' }} title={`Last seen ${timeAgo} ago`}>
                        {timeAgo}
                    </div>
                </div>
            </div>
        );
    }
}
