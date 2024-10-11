

### Примерная архитектура взаимодействия фронтенда и бэкенда с блокчейном

#### Этап 1: Оплата и деплой контракта

Пользователь выбирает товар и переходит в корзину, где у него подключен кошелек. После нажатия кнопки "Оплатить" на фронте формируется транзакция с помощью библиотеки [ton-connect/ui](https://www.npmjs.com/package/@tonconnect/ui). Пользователь будет подписывать одновременно две транзакции:

1. Первая транзакция: деплой контракта Broker.
2. Вторая транзакция: перевод USDT (или другого jetton) на контракт Broker.

##### Детализация транзакций:

- Первая транзакция (деплой контракта Broker):  
  Для деплоя контракта вызывается функция [createBroker](https://github.com/vityooook/Futurum/blob/main/api/BrokerContract.ts), в которую передаются два параметра:
    - highload_wallet_address (адрес технического кошелька),
    - commission (0.2 TON).  

  Функция возвращает:
    - BrokerAddress (адрес контракта),
    - StateInitBase64 (инициализация контракта в base64 формате).

Эти параметры передаются в tonconnect.

- Вторая транзакция (перевод USDT на Broker):  
  Для перевода jetton (USDT) на контракт Broker, вызывается функция [jettonTransaction](https://github.com/vityooook/Futurum/blob/main/api/BrokerContract.ts). Необходимые параметры:
    - amount — количество jetton, которое переводится,
    - destinationAddress — адрес контракта Broker,
    - responsAddress — адрес покупателя, на который вернется остаток после комиссий,
    - forwardFee — комиссия, которая будет отправлена нашему кошельку.

##### Пример оформления транзакций:

```javascript
// Получаем адрес кошелька покупателя для jetton:
const response = await args.client.runMethod(JettonMasterAddress, "get_wallet_address", [{
  type: 'slice',
  cell: beginCell().storeAddress(BuyerWalletAddress).endCell()
}]);

const JettonWalletBuyer = response.stack.readAddress();

// Деплой broker контракта:
const [BrokerAddress, StateInitBase64] = createBroker({ highload_wallet_address: Address.parse("") });

// Создаем payload для транзакции jetton:
const payload = jettonTransaction({
  amount: ...,
  destinationAddress: BrokerAddress,
  responsAddress: BuyerWalletAddress,
  forwardFee: ...
});

// Формируем транзакцию:
const transaction = {
  validUntil: Math.floor(Date.now() / 1000) + 60, // Время валидности 60 сек
  messages: [
    { // Деплой broker
      address: BrokerAddress,
      amount: "1000000", // Сумма деплоя (пример)
      stateInit: StateInitBase64
    },
    { // Перевод USDT на broker
      address: JettonWalletBuyer,
      amount: "60000000", // Сумма перевода USDT
      payload: payload
    }
  ]
};
```

#### Этап 2: Проверка транзакции

После подтверждения транзакции пользователем, ton-connect возвращает результат. С фронтенда необходимо отправить запрос на бекенд для проверки успешности перевода USDT. Это можно сделать с помощью API запроса: https://toncenter.com/api/v2/#/accounts/get_transactions_getTransactions_get.

*Примечание*: Детали по проверке транзакции требуют дополнительного исследования, этот шаг пока можно пропустить.

#### Этап 3: Финальные транзакции и деплой NFT

Когда убедились, что USDT поступили на контракт, через 2-3 минуты нужно инициировать следующие транзакции:
1. Деплой NFT.
2. Перевод USDT продавцу.
3. Перевод реферальной комиссии (если есть).

##### Хранение данных о NFT:

Для деплоя NFT необходимо хранить в базе данных следующую информацию:
- nft_index — уникальный индекс NFT,
- nft_address — адрес NFT,
- seller — кто продал товар,
- item_metadata — метаданные товара. Пример формата метаданных можно увидеть здесь:  
  https://s.getgems.io/nft/c/65f1941c8d4e725b494dd4b2/2000003/meta.json.

Для обсуждения всех деталей необходимо созвониться и уточнить моменты, касающиеся структуры базы данных и работы с коллекциями.
