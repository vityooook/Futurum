import crypto from 'crypto';
import { Address, beginCell, Cell } from '@ton/core';


function generateRandomHash(): string {
 const randomBytes = crypto.randomBytes(32);
 const hash = crypto.createHash('sha256').update(randomBytes).digest('hex');
 return hash;
}

export function createBroker(args: {
    highload_wallet_address: Address;
    min_commission: bigint;
}) {
    const hash = generateRandomHash()

    const BrokerCode = "b5ee9c7241020401000130000114ff00f4a413f4bcf2c80b0102f4d333d0d3030171b0925f03e0fa4030ed44d0fa4001f861fa0001f862d6ff30f86322c7008e3830318208989680b9f2d29a7020c8cb1fcb1fc982080f424070fb02f84170588306718010c8cb055005cf165003fa0213cb6a12ccc901fb00e002d31fd33f2282107362d09cbae3023132c001915be30d840ff2f0020300a26c12fa0030f84213b9f2d309702082100f8a7ea5c8cb1f13cb3f5003fa02f841cf16f841cf16cb0071fa02cb00c982080f424070fb0270018306718010c8cb055005cf165003fa0213cb6a12ccc901fb0000a0f84112c705f2e192fa40fa00fa403070530082100f8a7ea5c8cb1fcb3f5004fa0224cf165004cf1612ca0071fa0212cb00c9820a625a000173718010c8cb055005cf165003fa0213cb6a12ccc901fb00f9d929d8"
    const BrokerCodeCell = Cell.fromBoc(Buffer.from(BrokerCode, "hex"))[0]

    const BrokerDataCell = beginCell()
        .storeAddress(args.highload_wallet_address)
        .storeCoins(args.min_commission)
        .storeBuffer(Buffer.from(hash, "hex"))
    .endCell();

    const BrokerStateInit = beginCell()
        .storeBit(0) // No split_depth
        .storeBit(0) // No special
        .storeBit(1) // We have code
        .storeRef(BrokerCodeCell)
        .storeBit(1) // We have data
        .storeRef(BrokerDataCell)
        .storeBit(0) // No library
    .endCell();


    const BrokerAddress = new Address(0, BrokerStateInit.hash());
    const StateInitBase64 = Buffer.from(BrokerStateInit.toBoc()).toString("base64");
    return { BrokerAddress, StateInitBase64 }
}


export function jettonTransaction (args: {
    amount: bigint; // decimal usdt = 6, jetton = 9
    destinationAddress: Address;
    responsAddress: Address;
    forwardFee: bigint;
}) {
    var body = beginCell()
        .storeUint(0xf8a7ea5, 32)
        .storeUint(0, 64)
        .storeCoins(args.amount)
        .storeAddress(args.destinationAddress)
        .storeAddress(args.responsAddress)
        .storeBit(0)
        .storeCoins(args.forwardFee)
        .storeBit(0)
    .endCell();

    const payload = Buffer.from(body.toBoc()).toString("base64");

    return { payload };
}