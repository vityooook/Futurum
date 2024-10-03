import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano, Dictionary } from '@ton/core';
import {encodeOffChainContent} from "./help/content";
import { CollectionMint, MintValue } from './help/collectionHelpers';

export type RoyaltyParams = {
    royaltyFactor: number;
    royaltyBase: number;
    royaltyAddress: Address;
};

export type NftCollectionConfig = {
    ownerAddress: Address;
    nextItemIndex: number;
    adminContractAddress: Address;
    collectionContent: string;
    commonContent: string;
    nftItemCode: Cell;
    royaltyParams: RoyaltyParams;
};

export function buildNftCollectionContentCell(collectionContent: string, commonContent: string): Cell {
    let contentCell = beginCell();

    let encodedCollectionContent = encodeOffChainContent(collectionContent);

    let commonContentCell = beginCell();
    commonContentCell.storeBuffer(Buffer.from(commonContent));

    contentCell.storeRef(encodedCollectionContent);
    contentCell.storeRef(commonContentCell.asCell());

    return contentCell.endCell();
}


export function nftCollectionConfigToCell(config: NftCollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeUint(config.nextItemIndex, 64)
        .storeAddress(config.adminContractAddress)
        .storeInt(-1, 8)
        .storeRef(buildNftCollectionContentCell(config.collectionContent, config.commonContent))
        .storeRef(config.nftItemCode)
        .storeRef(
            beginCell()
                .storeUint(config.royaltyParams.royaltyFactor, 16)
                .storeUint(config.royaltyParams.royaltyBase, 16)
                .storeAddress(config.royaltyParams.royaltyAddress)
            .endCell()
        )
    .endCell();
};

export class NftCollection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new NftCollection(address);
    }

    static createFromConfig(config: NftCollectionConfig, code: Cell, workchain = 0) {
        const data = nftCollectionConfigToCell(config);
        const init = { code, data };
        return new NftCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeployNft(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint,
            queryId: number,
            itemIndex: number, 
            itemOwnerAddress: Address,
            itemContent: string,
            amount: bigint,
        }
    ) {
        const nftContent = beginCell();
        nftContent.storeBuffer(Buffer.from(opts.itemContent));

        const nftMessage = beginCell();

        nftMessage.storeAddress(opts.itemOwnerAddress);
        nftMessage.storeRef(nftContent);

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(0, 64)
                .storeUint(opts.itemIndex, 64)
                .storeCoins(opts.amount)
                .storeRef(nftMessage)
            .endCell(),
        });
    }

    async sendBatchDeploy(provider: ContractProvider, via: Sender,
        opts: {
            value: bigint;
            queryId: number;
            nfts: CollectionMint[];
        }
    ) {

        if (opts.nfts.length > 200) {
            throw new Error('More than 200 items');
        }

        const dict = Dictionary.empty(Dictionary.Keys.Uint(64), MintValue);
            for (const nft of opts.nfts) {
                dict.set(nft.index, nft);
            }

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32)
                .storeUint(opts.queryId, 64)
                .storeDict(dict)
            .endCell(),
        });
    }

    async sendChangeMianOwner(provider: ContractProvider, via: Sender, new_main_owner: Address) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(0, 64)
                .storeAddress(new_main_owner)
            .endCell(),
        })
    }


    async sendChangeContent(provider: ContractProvider, via: Sender, 
        opts: {
            collectionContent: string,
            commonContent: string,
            royaltyFactor: number;
            royaltyBase: number;
            royaltyAddress: Address;
        }) {

        let contentCell = beginCell()
                            .storeRef(encodeOffChainContent(opts.collectionContent))
                            .storeRef(beginCell().storeBuffer(Buffer.from(opts.commonContent)).asCell())
                        .endCell();
        
        let royaltyData = beginCell()
                            .storeUint(opts.royaltyFactor, 16)
                            .storeUint(opts.royaltyBase, 16)
                            .storeAddress(opts.royaltyAddress)
                        .endCell();
        
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(4, 32)
                .storeUint(0, 64)
                .storeRef(contentCell)
                .storeRef(royaltyData)
            .endCell(),
        })
    }

    async sendWithdraw(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(5, 32)
                .storeUint(0, 64)
            .endCell(),
        });
    }

    async sendChangeSecondOwner(provider: ContractProvider, via: Sender, new_second_owner: Address, flag: number) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(6, 32)
                .storeUint(0, 64)
                .storeAddress(new_second_owner)
                .storeInt(flag, 8)
            .endCell(),
        })
    }


    async getCollectionData(provider: ContractProvider) {
        const result = await provider.get("get_collection_data", []);
        return {
            next_item_index: result.stack.readNumber(),
            content: result.stack.readCellOpt(),
            owner_address: result.stack.readAddress()
        };
    };
}
