import { TonClient } from "@ton/ton";
import { Address, beginCell, toNano } from '@ton/core';
import { sign, keyPairFromSecretKey } from "@ton/crypto";
import { HighloadQueryId } from '../wrappers/HighloadQueryId';


const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    apiKey: "b2f5b5d58f553b4f9f29e6a3ae7def64682b1c6c8ef2a6eb0858538027c67122" // you can get an api key from @tonapibot bot in Telegram
  });

async function run() {

    const secretKeyHex = "020c8bb18fc4d6e02e3560e2c8acf4477b771d046eefabb8ee771e9c036c278faf190a892e5cc72446a5d8f5ca70977eb47dca6ad02913f7d358e57c7a93396f";
    const restoredKeyPair = keyPairFromSecretKey(Buffer.from(secretKeyHex, 'hex'));


    const messageCell = beginCell()
        .storeUint(0x18, 6)
        .storeAddress(Address.parse("kQA95AtAgKqGRiClI_T2JL2_DK2h-s2fFx85YukTjRnOl8UI"))
        .storeCoins(toNano("0.1"))
        .storeUint(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeRef(beginCell()
        .storeUint(0xf8a7ea5, 32)
        .storeUint(0, 64)
        .storeCoins(1 * 10 ** 6) // 100 USDT
        .storeAddress(Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"))
        .storeAddress(Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"))
        .storeBit(0)
        .storeCoins(1)
        .storeBit(1)
        .storeRef(beginCell().storeUint(0, 32).storeStringTail("yraaaaa").endCell())
        .endCell())
      .endCell();
    // 0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO
    const queryId = HighloadQueryId.fromShiftAndBitNumber(0n, 0n);
    // Шаг 1: Создаем messageInner и body
    const messageInner = beginCell()
    .storeUint(0, 32)
    .storeRef(messageCell)
    .storeUint(1, 8)
    .storeUint(queryId.getBitNumber(), 13)
    // .storeUint(queryId.getShift(), 10)
    .storeUint(7, 10)
    .storeUint(Math.floor(Date.now() / 1000) - 10, 64)
    .storeUint(2 * 60 * 60, 22)
    .endCell();

    const signature = sign(messageInner.hash(), restoredKeyPair.secretKey);

    const body = beginCell()
      .storeBuffer(signature)
      .storeRef(messageInner)
    .endCell();


    const message = beginCell()
    .storeUint(0b10, 2) // indicate that it is an incoming external message
    .storeUint(0, 2) // src -> addr_none
    .storeAddress(Address.parse("0QBTntndDitJzeAQ2S-lUHu3nB5534-J_1V3RTetWK0etLjz"))
    .storeCoins(0) // Import fee
    .storeBit(0) // We have State Init
    .storeBit(1) // We store Message Body as a reference
    .storeRef(body) // Store Message Body as a reference
    .endCell();


    // console.log(message)
    client.sendFile(message.toBoc()).catch()
    // Шаг 4: Сериализуем сообщение в BoC
    

}

run();