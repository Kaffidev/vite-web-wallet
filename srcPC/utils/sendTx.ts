import { utils, accountBlock as accountBlockUtils } from '@vite/vitejs';
import { getActiveAcc, getCurrHDAcc } from 'wallet';
import { powProcess } from 'pcComponents/pow/index';
import { quotaConfirm } from 'pcComponents/quota/index';
import { vbConfirmDialog, powLimitDialog } from 'pcComponents/dialog';
import { execWithValid } from 'pcUtils/execWithValid';
import { getVbInstance } from 'wallet/vb';
import { getLedgerInstance } from 'wallet/ledgerHW';
import { viteClient } from 'services/apiServer';
import i18n from 'pcI18n';

const { createAccountBlock } = accountBlockUtils;
const { isObject } = utils;

const defaultConfig = {
    pow: true,
    powConfig: {
        isShowCancel: true,
        cancel: () => {}
    },
    confirm: {
        showMask: true,
        operate: ''
    },
    powLimit: true
};

const sendTx = execWithValid(function ({
    config = defaultConfig,
    methodName,
    data,
    vbExtends,
    abi,
    description
}) {
    const activeAccount = getActiveAcc();


    if (activeAccount.isBifrost) {
        return vbSendTx({
            abi,
            vbExtends,
            description,
            methodName,
            params: {
                ...data,
                address: activeAccount.address
            }
        });
    }

    if (activeAccount.isHardware) {
        return hwSendTx({
            methodName,
            params: {
                ...data,
                address: activeAccount.address
            },
            config: formatConfig(config)
        });
    }

    if (window.touchID && window.touchID.isEnableTouchID()) {
        return window.touchID.promptTouchID(i18n.t('desktop.unlock'))
            .then(() => webSendTx({
                methodName,
                params: {
                    ...data,
                    address: activeAccount.address
                },
                config: formatConfig(config),
                privateKey: activeAccount.privateKey
            }))
            .catch(err => {
                throw err;
            });
    }

    return webSendTx({
        methodName,
        params: {
            ...data,
            address: activeAccount.address
        },
        config: formatConfig(config),
        privateKey: activeAccount.privateKey
    });
});


async function webSendTx({ methodName, params, config, privateKey }) {
    const accountBlock = createAccountBlock(methodName, params).setProvider(viteClient).setPrivateKey(privateKey);
    await accountBlock.autoSetPreviousAccountBlock();

    const difficulty = await accountBlock.getDifficulty();
    console.log(difficulty);

    if (!difficulty) {
        return accountBlock.sign().send();
    }

    if (!config.pow) {
        quotaConfirm(config.confirmConfig);
        throw {
            code: '1000001',
            message: 'Don\'t need pow, already show confirm.'
        };
    }

    if (config.powLimit) {
        try {
            const powLimitRes = await powLimitDialog();
            if (powLimitRes.data === 'getQuota') {
                return Promise.reject();
            }
        } catch (err) {
            if (err && err.status === 'CLOSE') {
                return Promise.reject(err);
            }
            return;
        }
    }


    const powInstance = powProcess({ ...config.powConfig });
    try {
        await accountBlock.PoW(difficulty);
        await powInstance.stopCount();
        return accountBlock.sign().send();
    } catch (err) {
        console.error('send err', err);

        if (!powInstance || !powInstance.isShow) {
            return;
        }
        powInstance.stop();
        throw err;
    }
}

function vbSendTx({ methodName, params, vbExtends, abi, description }) {
    const confirmPromise: any = vbConfirmDialog();
    const { compInstance } = confirmPromise;

    return new Promise((res, rej) => {
        confirmPromise.then(() => {
            // 如果点击了关闭窗口，则不再提示
            compInstance && compInstance.close();
            rej({ code: '11021' });
        });

        const accountBlock = createAccountBlock(methodName, params).accountBlock;

        const vb = getVbInstance();
        return vb.sendVbTx({
            block: accountBlock,
            extend: vbExtends,
            abi,
            description
        }).then(data => {
            res(data);
        }).catch(err => {
            rej(err);
        })
            .finally(() => {
                compInstance && compInstance.close();
            });
    });
}

// 硬件钱包发送交易
async function hwSendTx({ methodName, params, config }) {
    const accountBlock = createAccountBlock(methodName, params).setProvider(viteClient);
    await accountBlock.autoSetPreviousAccountBlock();

    const difficulty = await accountBlock.getDifficulty();
    console.log(difficulty);

    const { publicKey, activeIdx } = getCurrHDAcc();
    accountBlock.setPublicKey(publicKey);


    if (!difficulty) {
        return signHwTx(activeIdx, accountBlock);
    }

    if (!config.pow) {
        quotaConfirm(config.confirmConfig);
        throw {
            code: '1000001',
            message: 'Don\'t need pow, already show confirm.'
        };
    }

    const powInstance = powProcess({ ...config.powConfig });

    try {
        await accountBlock.PoW(difficulty);
        await powInstance.stopCount();
    } catch (err) {
        console.error('pow err', err);

        if (!powInstance || !powInstance.isShow) {
            return;
        }
        powInstance.stop();
        throw err;
    }

    return signHwTx(activeIdx, accountBlock);
}


function signHwTx(activeIdx, accountBlock) {
    return new Promise((resolve, reject) => {
        const confirmPromise: any = vbConfirmDialog();
        const { compInstance } = confirmPromise;
        let isRejected = false;
        confirmPromise.then(() => {
            // 如果点击了关闭窗口，则不再提示
            compInstance && compInstance.close();
            isRejected = true;
            getLedgerInstance().handleError({ name: 'CancelByWeb' });
            reject({ code: '11021' });
        });
        getLedgerInstance().signHwTx(activeIdx, accountBlock).catch(err => {
            !isRejected && getLedgerInstance().handleError(err);
            throw err;
        })
            .finally(() => {
                compInstance && compInstance.close();
            })
            .then(({ signature }) => accountBlock.setSignature(signature))
            .then(() => {
                if (isRejected) {
                    throw new Error();
                }
                return accountBlock.send();
            })
            .then(data => resolve(data))
            .catch(err => reject(err));
    });
}

function formatConfig(config) {
    config = config || defaultConfig;
    // console.log(config);

    const pow = !!config.pow;
    const powConfig = config.powConfig
        ? config.powConfig
        : defaultConfig.powConfig;
    const powLimit = typeof config.powLimit === 'boolean' ? config.powLimit : defaultConfig.powLimit;

    if (!isObject(powConfig)) {
        throw new Error('[Error] utils/sendTx: config.powConfig should be an Object.');
    }

    if (powConfig.cancel && typeof powConfig.cancel !== 'function') {
        throw new Error('[Error] utils/sendTx: config.pow[1].cancel should be a function.');
    }

    if (
        !(
            powConfig.hasOwnProperty('isShowCancel')
      && typeof powConfig.isShowCancel !== 'undefined'
      && powConfig.isShowCancel !== null
        )
    ) {
        powConfig.isShowCancel = true;
    }

    if (pow) {
        return { pow, powConfig, confirmConfig: null, powLimit };
    }

    const confirmConfig = config.confirm ? config.confirm : defaultConfig.confirm;
    if (!isObject(confirmConfig)) {
        throw new Error('[Error] utils/sendTx: config.confirm should be an object.');
    }

    if (!confirmConfig.operate || typeof confirmConfig.operate !== 'string') {
        throw new Error('[Error] utils/sendTx: config.confirm.operate is required and should be a string, while pow is off.');
    }

    return { pow, powConfig, confirmConfig, powLimit };
}


export default sendTx;
