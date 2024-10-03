import { TonClient } from "@ton/ton";
import { Address, beginCell, internal, OutActionSendMsg, SendMode, toNano, TupleBuilder } from '@ton/core';
import { HighloadWallet } from "./HighloadWallet";
import { sign, keyPairFromSecretKey } from "@ton/crypto";
import { HighloadQueryId } from './HighloadQueryId';

const secretKeyHex = "020c8bb18fc4d6e02e3560e2c8acf4477b771d046eefabb8ee771e9c036c278faf190a892e5cc72446a5d8f5ca70977eb47dca6ad02913f7d358e57c7a93396f";
// nft_collection kQAfFncTLrS65MHNfbobl8klH3qszJ2MxQ2_PjqlWuOvH2p2

const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    apiKey: "b2f5b5d58f553b4f9f29e6a3ae7def64682b1c6c8ef2a6eb0858538027c67122" // you can get an api key from @tonapibot bot in Telegram
});

async function run(
    highload_wallet: Address,
    jetton: {
        address: Address;
        amount: number;
    },
    saler: {
        address: Address;
        percent: number;
    },
    collection: {
        address: Address;
        metadata: string;
        index: number;
        buyer_address: Address;
    },
    referral?: {
        address: Address;
        percent: number;
    }
) {

    const tuple = new TupleBuilder() // example get request to smart contract 
    tuple.writeNumber(collection.index);
    const result = await client.runMethod(Address.parse("kQAfFncTLrS65MHNfbobl8klH3qszJ2MxQ2_PjqlWuOvH2p2"), "get_nft_address_by_index", tuple.build())
    console.log(result.stack.readAddress())
    

    const wallet = client.open(HighloadWallet.createFromAddress(highload_wallet)); // input highload wallet address
    const walletKeyPair = keyPairFromSecretKey(Buffer.from(secretKeyHex, 'hex'));

    const actions: OutActionSendMsg[] = [];

    actions.push({ // send USDT to saler 
        type: 'sendMsg',
        mode: SendMode.PAY_GAS_SEPARATELY,
        outMsg: internal({
            to: jetton.address, // jetton_wallet USDT 
            value: toNano("0.1"),
            body: beginCell()
            .storeUint(0xf8a7ea5, 32) // opcode for jetton transfer
            .storeUint(0, 64) // query id
            .storeCoins(Math.floor(jetton.amount * saler.percent / 100)) // Jetton amount for transfer (decimals = 6 - USDT, 9 - default). Function toNano use decimals = 9 (remember it)
            .storeAddress(saler.address) // wallet destination address
            .storeAddress(highload_wallet) // response excess destination
            .storeBit(0) // no custom payload
            .storeCoins(1) // forward amount (if >0, will send notification message)
            .storeBit(0) // we store forwardPayload as a reference
            .endCell()
        })
    });

    if (referral) { // send USDT to referral
        actions.push({
            type: 'sendMsg',
            mode: SendMode.PAY_GAS_SEPARATELY,
            outMsg: internal({
                to: jetton.address, // jetton_wallet USDT 
                value: toNano("0.1"),
                body: beginCell()
                .storeUint(0xf8a7ea5, 32) // opcode for jetton transfer
                .storeUint(0, 64) // query id
                .storeCoins(Math.floor(jetton.amount * referral.percent / 100)) // Jetton amount for transfer (decimals = 6 - USDT, 9 - default). Function toNano use decimals = 9 (remember it)
                .storeAddress(referral.address) // wallet destination address
                .storeAddress(highload_wallet) // response excess destination
                .storeBit(0) // no custom payload
                .storeCoins(1) // forward amount (if >0, will send notification message)
                .storeBit(0) // we store forwardPayload as a reference
                .endCell()
            })
        });
    }

    actions.push({ // deploy nft item 
        type: 'sendMsg',
        mode: SendMode.PAY_GAS_SEPARATELY,
        outMsg: internal({
            to: collection.address, // nft_collection  
            value: toNano("0.033"),
            body: beginCell()
            .storeUint(1, 32)
            .storeUint(0, 64)
            .storeUint(collection.index, 64) // index
            .storeCoins(toNano("0.03"))
            .storeRef(beginCell()
                .storeAddress(collection.buyer_address) // future owner\
                .storeRef(beginCell().storeBuffer(Buffer.from(collection.metadata)).endCell()) // nft metadata 
                .endCell())
        .endCell(),
        })
    });
    

    const queryHandler = HighloadQueryId.fromShiftAndBitNumber(0n, 9n); // save to db 
    const query = queryHandler.getNext()

    const subwalletId = 0;
    const timeout = 2 * 60 * 60; // 2 hours 
    const createdAt = Math.floor(Date.now() / 1000) - 60; // LiteServers have some delay in time
    await wallet.sendBatch(
        walletKeyPair.secretKey,
        actions,
        subwalletId,
        query,
        timeout,
        createdAt
    )
}

run(
    Address.parse("0QBTntndDitJzeAQ2S-lUHu3nB5534-J_1V3RTetWK0etLjz"),
    {
        address: Address.parse("kQA95AtAgKqGRiClI_T2JL2_DK2h-s2fFx85YukTjRnOl8UI"),
        amount: 11 * 10 ** 6 
    },
    {
        address: Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"),
        percent: 90,
    },
    {
        address: Address.parse("kQAfFncTLrS65MHNfbobl8klH3qszJ2MxQ2_PjqlWuOvH2p2"),
        metadata: "meta.json",
        index: 1,
        buyer_address: Address.parse("0QBTntndDitJzeAQ2S-lUHu3nB5534-J_1V3RTetWK0etLjz")
    },
    {
        address: Address.parse("kQA12jIHw9Pdblrwy9Z5pZvlwQc_PlVxksZq87hoVTd9HVa5"),
        percent: 3
    }
);