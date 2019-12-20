import { StModule } from '../module';
import { ClientLibStatic } from '../@types/client.lib';
import { ClientLibPatcher } from '../patch/patch';
import { CityData } from '../city/city.scan';

declare const ClientLib: ClientLibStatic;
export class PlayerInfo implements StModule {
    name = 'PlayerInfo';

    async start(): Promise<void> {
        //
    }
    async stop(): Promise<void> {
        //
    }

    async scanAlliance() {
        let count = 0;
        const md = ClientLib.Data.MainData.GetInstance();
        const cities = md.get_Cities();
        const allCities = md.get_World().GetCities().d;
        const allianceId = md.get_Alliance().get_Id();
        for (const city of Object.values(allCities)) {
            if (!ClientLibPatcher.hasPatchedAllianceId(city)) {
                console.log('SkipCity');
                continue;
            }
            if (allianceId != city.$get_AllianceId()) {
                continue;
            }
            const cityId = city.$get_Id();

            count++;
            console.log(cityId, city.$get_AllianceId());
            cities.set_CurrentCityId(cityId);
            await CityData.waitForCityReady(cityId);
            const cityObj = ClientLib.Data.MainData.GetInstance()
                .get_Cities()
                .GetCity(cityId);
            if (cityObj == null) {
                continue;
            }
            const cityLayout = await CityData.getCityData(cityObj);
            console.log(cityLayout);
            if (count > 10) {
                break;
            }
        }
    }
}
