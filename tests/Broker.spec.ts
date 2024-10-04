import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Broker } from '../wrappers/Broker';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Broker', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Broker');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let broker: SandboxContract<Broker>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        broker = blockchain.openContract(Broker.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await broker.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: broker.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and broker are ready to use
    });
});
