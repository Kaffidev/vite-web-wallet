import BigNumber from 'utils/bigNumber';

const maxDigit = 8;

const getters = {
    exActiveTxPair(state, getters, rootState) {
        const _activeTxPair = rootState.exchangeActiveTxPair.activeTxPair;
        if (!_activeTxPair) {
            return null;
        }

        const activeTxPair = Object.assign({}, _activeTxPair);

        const upDown = BigNumber.minus(activeTxPair.closePrice || 0, activeTxPair.openPrice || 0);
        const upDownPrev = BigNumber.minus(activeTxPair.closePrice || 0, activeTxPair.prevClosePrice || 0);

        activeTxPair.upDown = upDown;
        activeTxPair.upDownPrev = +upDownPrev ? upDownPrev : '0';
        activeTxPair.upDownPercent = activeTxPair.priceChangePercent ? `${ BigNumber.multi(activeTxPair.priceChangePercent, 100, 2) }%` : '';
        activeTxPair.originQuoteTokenSymbol = activeTxPair.quoteTokenSymbol.split('-')[0] || '';
        activeTxPair.originTradeTokenSymbol = activeTxPair.tradeTokenSymbol.split('-')[0] || '';

        return activeTxPair;
    },
    activeTxPairRealClosePrice(state, getters, rootState, rootGetters) {
        const pre = rootGetters.currencySymbol;
        const activeTxPair = rootState.exchangeActiveTxPair.activeTxPair;
        if (!activeTxPair) {
            return `${ pre }0`;
        }

        const _price = BigNumber.multi(activeTxPair.closePrice || 0, rootGetters.activeTxPairQuoteCurrencyRate, 6);
        const _realPrice = BigNumber.normalFormatNum(_price, 6);
        const _realPrice2 = BigNumber.normalFormatNum(_realPrice, 2);

        if (+_realPrice2 !== 0) {
            return pre + BigNumber.onlyFormat(_realPrice2, 2);
        }
        return pre + BigNumber.onlyFormat(_realPrice, 2);
    },
    activeTxPairQuoteCurrencyRate(state, getters, rootState, rootGetters) {
        const activeTxPair = rootState.exchangeActiveTxPair.activeTxPair;
        const tokenId = activeTxPair && activeTxPair.quoteToken ? activeTxPair.quoteToken : null;
        if (!tokenId) {
            return 0;
        }
        return rootGetters.currencyRateList[tokenId] || 0;
    },
    quoteTokenDecimalsLimit(state, getters, rootState) {
        const activeTxPair = rootState.exchangeActiveTxPair.activeTxPair;
        const quoteTokenDetail = rootState.exchangeTokens.ttoken;

        if (!activeTxPair) {
            return 0;
        }

        if (!quoteTokenDetail) {
            const pricePrecision = activeTxPair.pricePrecision;
            return pricePrecision > maxDigit ? maxDigit : pricePrecision;
        }

        return getMinDecimals(quoteTokenDetail.tokenDecimals, activeTxPair.pricePrecision);
    },
    tradeTokenDecimalsLimit(state, getters, rootState) {
        const activeTxPair = rootState.exchangeActiveTxPair.activeTxPair;
        const tradeTokenDetail = rootState.exchangeTokens.ftoken;

        if (!activeTxPair) {
            return 0;
        }

        if (!tradeTokenDetail) {
            const quantityPrecision = activeTxPair.quantityPrecision;
            return quantityPrecision > maxDigit ? maxDigit : quantityPrecision;
        }

        return getMinDecimals(tradeTokenDetail.tokenDecimals, activeTxPair.quantityPrecision);
    },
    activeTxPairSellOnePrice(state, getters, rootState) {
        const sell = rootState.exchangeDepth.sell;
        if (!sell || !sell.length) {
            return '';
        }
        return sell[sell.length - 1].price;
    },
    activeTxPairIsMining(state, getters, rootState) {
        const activeTxPair = rootState.exchangeActiveTxPair.activeTxPair;
        if (!activeTxPair) {
            return 0;
        }

        const tradeMiningSymbols = rootState.exchangeMine.tradeMiningSymbols;
        const orderMiningSymbols = rootState.exchangeMine.orderMiningSymbols;

        const isTradeMining = tradeMiningSymbols.indexOf(activeTxPair.symbol) === -1 ? 0 : 1;
        const isOrderMining = orderMiningSymbols.indexOf(activeTxPair.symbol) === -1 ? 0 : 2;
        return isOrderMining + isTradeMining;
    },
    activeTxPairMiningPrice(state, getters, rootState) {
        // No activeTxPair
        const activeTxPair = rootState.exchangeActiveTxPair.activeTxPair;
        if (!activeTxPair) {
            return '';
        }

        // No orderMining
        const orderMiningSymbols = rootState.exchangeMine.orderMiningSymbols;
        if (orderMiningSymbols.indexOf(activeTxPair.symbol) === -1) {
            return '';
        }

        // No sellOnePrice
        const sellOne = getters.activeTxPairSellOnePrice;
        if (!sellOne) {
            return '';
        }

        const miningSymbols = {
            'ETH-000_BTC-000': 0.95,
            'GRIN-000_BTC-000': 0.92,
            'GRIN-000_ETH-000': 0.92,
            'GRIN-000_VITE': 0.92,
            'BTC-000_USDT-000': 0.95,
            'ETH-000_USDT-000': 0.95,
            'VITE_BTC-000': 0.85,
            'VITE_ETH-000': 0.85,
            'VITE_USDT-000': 0.85
        };

        const symbol = activeTxPair.symbol;
        const price = BigNumber.multi(sellOne, miningSymbols[symbol] || 0.9);
        return BigNumber.normalFormatNum(price);
    },
    showActiveTxPairMiningPrice(state, getters) {
        if (!getters.activeTxPairMiningPrice) {
            return '';
        }
        return BigNumber.onlyFormat(getters.activeTxPairMiningPrice);
    },
    activeTxPairIsCMC(state, getters, rootState) {
        const activeTxPair = rootState.exchangeActiveTxPair.activeTxPair;
        if (!activeTxPair) {
            return null;
        }

        const CMCTxPairs = [
            'VITE_USDT-000', 'ETH-000_BTC-000', 'GRIN-000_VITE', 'VITE_ETH-000',
            'GRIN-000_BTC-000', 'GRIN-000_ETH-000', 'VITE_BTC-000',
            'ETH-000_USDT-000', 'BTC-000_USDT-000'
        ];
        return CMCTxPairs.indexOf(activeTxPair.symbol) !== -1;
    }
};

export default { getters };


function getMinDecimals(tokenDecimals, pairDecimals) {
    const digit = tokenDecimals > pairDecimals ? pairDecimals : tokenDecimals;
    return digit > maxDigit ? maxDigit : digit;
}
