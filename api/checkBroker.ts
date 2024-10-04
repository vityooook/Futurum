// import { TonClient } from "@ton/ton";
import { TonClient, WalletContractV4, internal } from "@ton/ton";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "@ton/crypto";
import { Address, beginCell, Cell, toNano, StateInit, storeStateInit, SendMode } from '@ton/core';
import { sign, keyPairFromSecretKey } from "@ton/crypto";


async function run() {

    const mnemonic = ""; // your 24 secret words (replace ... with the rest of the words)
    const target_address = Address.parse("0QBTntndDitJzeAQ2S-lUHu3nB5534-J_1V3RTetWK0etLjz");
    const commission = toNano("0.2");
    const hash = "502ff968e4e94e5324292895979f2ffdef56cd61489781b6ea13e3a948af490f";

    // initialize ton rpc client on mainnet
    const endpoint = await getHttpEndpoint({ network: "testnet" }); // testnet: await getHttpEndpoint({ network: "testnet" });
    const client = new TonClient({ endpoint });

    // open wallet v4 or v5 (notice the correct wallet version here)
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });



    const brokerCode = Cell.fromBoc(Buffer.from('b5ee9c724101030100d6000114ff00f4a413f4bcf2c80b0101e8d333d0d3030171b0925f03e0fa4030ed44d0fa4001f861fa0001f862d3ff30f86322c7008e3830318208989680b9f2d29a7020c8cb1fcb1fc982080f424070fb02f84170588306718010c8cb055005cf165003fa0213cb6a12ccc901fb00e002d31fd33f0282107362d09cbae3025f04840ff2f00200a001fa0030f84213b9f2d309702082100f8a7ea5c8cb1f13cb3f5003fa02f841cf16f841cf16cb0071fa02cb00c982080f424070fb0270018306718010c8cb055005cf165003fa0213cb6a12ccc901fb00bfd541af', "hex"))[0];
    const brokerData = beginCell()
        .storeAddress(target_address)
        .storeCoins(commission)
        .storeBuffer(Buffer.from(hash, 'hex'))
    .endCell();

    const brokerInit: StateInit = {
        code: brokerCode,
        data: brokerData
    };

    const brokerInitCell = beginCell()
      .store(storeStateInit(brokerInit))
      .endCell();

    const brokerInitAddress = new Address(0, brokerInitCell.hash());
    
    const walletContract = client.open(wallet);
    const seqno = await walletContract.getSeqno();
    await walletContract.sendTransfer({
        secretKey: key.secretKey,
        seqno: seqno,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [
            internal({ // deploy contract
              to: brokerInitAddress,
              value: toNano("0.01"),
              init: brokerInit
            }),
            internal({ // send USDT to contrct
                to: "kQC_tmf_oNuR3nrgfd5qZDKJgHw8Ltjegka_-WSCjobsPe-u",  // jetton_wallet
                value: toNano("0.5"),
                body: beginCell()
                    .storeUint(0xf8a7ea5, 32) // opcode for jetton transfer
                    .storeUint(0, 64) // query id
                    .storeCoins(3 * 10 ** 6) // Jetton amount for transfer (decimals = 6 - USDT, 9 - default). Function toNano use decimals = 9 (remember it)
                    .storeAddress(brokerInitAddress) // TON wallet destination address
                    .storeAddress(walletContract.address) // response excess destination
                    .storeBit(0) // no custom payload
                    .storeCoins(toNano("0.4")) // forward amount (if >0, will send notification message)
                    .storeBit(0) // we store forwardPayload as a reference
                .endCell()
            })
        ]
    })
    let currentSeqno = seqno;
    while (currentSeqno == seqno) {
      console.log("waiting for transaction to confirm...");
      await sleep(1500);
      currentSeqno = await walletContract.getSeqno();
    }
    console.log("transaction confirmed!");

}

run()

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}