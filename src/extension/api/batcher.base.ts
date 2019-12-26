import { CityLayout } from '../../api/city.layout';
import { ApiScanResponse } from '../../api/request.scan';
import { BasePacker } from '../../lib/base/base.packer';
import { Batcher } from './batcher';
import { ClientApi } from './client.api';

export class BatchBaseSender extends Batcher<'cityId', CityLayout, string> {
    api: ClientApi;
    constructor(api: ClientApi) {
        super('cityId', 30 * 1000, 25);
        this.api = api;
    }

    get scanId() {
        return BasePacker.number.pack(75500550);
    }

    async run(data: CityLayout[]): Promise<string[]> {
        console.log('Sending', data.length);
        const firstBase = data[0];
        const url = [this.api.baseUrl, 'world', firstBase.worldId, 'scan', this.scanId].join('/');
        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'content-type': 'application/json', authorization: 'Bearer' },
        });
        if (!res.ok) {
            console.error(await res.text());
            throw new Error('Failed to scan');
        }
        const body = (await res.json()) as ApiScanResponse;
        return body.id;
    }
}
