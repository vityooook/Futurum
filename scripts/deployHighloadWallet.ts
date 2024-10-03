import { toNano } from '@ton/core';
import { HighloadWallet } from '../wrappers/HighloadWallet';
import { compile, NetworkProvider } from '@ton/blueprint';
import { getSecureRandomBytes, KeyPair, keyPairFromSeed, keyPairFromSecretKey, mnemonicNew, mnemonicToPrivateKey, mnemonicToHDSeed } from "@ton/crypto";

export async function run(provider: NetworkProvider) {

    const seed = await getSecureRandomBytes(32);

    const keyPair = keyPairFromSeed(seed);
    
    const secretKeyHex = keyPair.secretKey.toString('hex');
    const publicKeyHex = keyPair.publicKey.toString('hex');

    console.log("Секретный ключ:", secretKeyHex);
    console.log("Публичный ключ:", publicKeyHex);
    
    const restoredKeyPair = keyPairFromSecretKey(Buffer.from(secretKeyHex, 'hex'));
    console.log("Восстановленный ключ:", restoredKeyPair);


    const highloadWallet = provider.open(HighloadWallet.createFromConfig({
        publicKey: keyPair.publicKey,
        subwalletId: 0,
        timeout: 2 * 60 * 60, // 2 hours
    }, await compile('HighloadWallet')));

    await highloadWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(highloadWallet.address);
}
