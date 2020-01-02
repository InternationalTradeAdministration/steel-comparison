import config from '../config';

export class TradeRepository {

    constructor(url) {
        this.url = url;
    }

    async _getAggregations(trade_flow, reporters="", partners="") {
        return fetch(`${this.url}?&reporter_countries=${reporters}&partner_countries=${partners}&trade_flow=${trade_flow}`, {
            headers: {
                'Authorization': 'Bearer ' + config.accessToken
            }
        })
        .then(response => response.json())
        .catch(error => console.log(error))
    }

    async _getData(searchQuery) {
        return fetch(`${this.url}${searchQuery}&size=20`, {
            headers: {
                'Authorization': 'Bearer ' + config.accessToken
            }
        })
        .then(response => response.json())
        .catch(error => console.log(error))
    }

}