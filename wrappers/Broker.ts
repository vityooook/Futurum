import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, storeCommonMessageInfo } from '@ton/core';

export type BrokerConfig = {
    target_address: Address;
    commission: bigint;
    hash: string;
};

export function brokerConfigToCell(config: BrokerConfig): Cell {
    return beginCell()
        .storeAddress(config.target_address)
        .storeCoins(config.commission)
        .storeBuffer(Buffer.from(config.hash, 'hex'))
        .endCell();
}

export class Broker implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Broker(address);
    }

    static createFromConfig(config: BrokerConfig, code: Cell, workchain = 0) {
        const data = brokerConfigToCell(config);
        const init = { code, data };
        return new Broker(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
