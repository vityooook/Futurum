import { Address, beginCell, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';


export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromConfig({
        ownerAddress: Address.parse("0QBTntndDitJzeAQ2S-lUHu3nB5534-J_1V3RTetWK0etLjz"), // адрес твоего кошелька 
        nextItemIndex: 0, // не трогать
        adminContractAddress: Address.parse("0QBTntndDitJzeAQ2S-lUHu3nB5534-J_1V3RTetWK0etLjz"), // вставь адрес Highload-wallet
        collectionContent: "https://s.getgems.io/nft/b/c/62fba50217c3fe3cbaad9e7f/meta.json", // collection metadata
        commonContent: "https://s.getgems.io/nft/b/c/62fba50217c3fe3cbaad9e7f/2/", // item metadata (обрезаная ссылка)
        nftItemCode: await compile("NftItem"),
        royaltyParams: {
            royaltyFactor: 0, // процент роялти от 0 до 100
            royaltyBase: 100,
            royaltyAddress: Address.parse("0QBTntndDitJzeAQ2S-lUHu3nB5534-J_1V3RTetWK0etLjz") // куда будет падать комиссия за продажу
        }
    }, await compile('NftCollection')));

    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(nftCollection.address);

    // run methods on `nftCollection`
}
