import { Address, toNano, beginCell } from '@ton/core';
import { HighloadWallet } from '../wrappers/HighloadWallet';
import { HighloadQueryId } from '../wrappers/HighloadQueryId';
import { compile, NetworkProvider } from '@ton/blueprint';
import { getSecureRandomBytes, KeyPair, keyPairFromSeed, keyPairFromSecretKey, mnemonicNew, mnemonicToPrivateKey, mnemonicToHDSeed } from "@ton/crypto";
import { getRandomInt } from '../utils';

const maxShift = (1 << 13) - 1;
// Секретный ключ: 020c8bb18fc4d6e02e3560e2c8acf4477b771d046eefabb8ee771e9c036c278faf190a892e5cc72446a5d8f5ca70977eb47dca6ad02913f7d358e57c7a93396f
// Публичный ключ: af190a892e5cc72446a5d8f5ca70977eb47dca6ad02913f7d358e57c7a93396f

export async function run(provider: NetworkProvider) {

    const highloadWallet = provider.open(HighloadWallet.createFromAddress(Address.parse("0QBTntndDitJzeAQ2S-lUHu3nB5534-J_1V3RTetWK0etLjz")))
    const secretKeyHex = "020c8bb18fc4d6e02e3560e2c8acf4477b771d046eefabb8ee771e9c036c278faf190a892e5cc72446a5d8f5ca70977eb47dca6ad02913f7d358e57c7a93396f";
    const restoredKeyPair = keyPairFromSecretKey(Buffer.from(secretKeyHex, 'hex'));

    const rndShift   = getRandomInt(0, maxShift);
    const rndBitNum  = getRandomInt(0, 1022);

    const queryId = HighloadQueryId.fromShiftAndBitNumber(BigInt(rndShift), BigInt(rndBitNum));

    await highloadWallet.sendExternalMessage(restoredKeyPair.secretKey, {
        message: beginCell()
        .storeUint(0x18, 6)
        .storeAddress(Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"))
        .storeCoins(1000000)
        .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeUint(0, 32)
        .storeUint(0, 64)
      .endCell(),
        mode: 1, 
        query_id: queryId,
        createdAt: Math.floor(Date.now() / 1000) - 10,
        subwalletId: 0,
        timeout:  2 * 60 * 60, // two hours
    })


}
