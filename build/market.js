function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object.keys(descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object.defineProperty(target, property, desc);
    desc = null;
  }

  return desc;
}

function call(target, key, descriptor) {}
function view(target, key, descriptor) {}
function NearBindgen(target) {
  return class extends target {
    static _init() {
      // @ts-ignore
      let args = target.deserializeArgs();
      let ret = new target(args); // @ts-ignore

      ret.init(); // @ts-ignore

      ret.serialize();
      return ret;
    }

    static _get() {
      let ret = Object.create(target.prototype);
      return ret;
    }

  };
}

const U64_MAX = 2n ** 64n - 1n;
const EVICTED_REGISTER = U64_MAX - 1n;
function log(...params) {
  env.log(`${params.map(x => x === undefined ? 'undefined' : x) // Stringify undefined
  .map(x => typeof x === 'object' ? JSON.stringify(x) : x) // Convert Objects to strings
  .join(' ')}` // Convert to string
  );
}
function signerAccountId() {
  env.signer_account_id(0);
  return env.read_register(0);
}
function predecessorAccountId() {
  env.predecessor_account_id(0);
  return env.read_register(0);
}
function attachedDeposit() {
  return env.attached_deposit();
}
function panic(msg) {
  if (msg !== undefined) {
    env.panic(msg);
  } else {
    env.panic();
  }
}
function storageRead(key) {
  let ret = env.storage_read(key, 0);

  if (ret === 1n) {
    return env.read_register(0);
  } else {
    return null;
  }
}
function storageHasKey(key) {
  let ret = env.storage_has_key(key);

  if (ret === 1n) {
    return true;
  } else {
    return false;
  }
}
function storageGetEvicted() {
  return env.read_register(EVICTED_REGISTER);
}

function currentAccountId() {
  env.current_account_id(0);
  return env.read_register(0);
}
function input() {
  env.input(0);
  return env.read_register(0);
}
function promiseThen(promiseIndex, accountId, methodName, args, amount, gas) {
  return env.promise_then(promiseIndex, accountId, methodName, args, amount, gas);
}
function promiseBatchCreate(accountId) {
  return env.promise_batch_create(accountId);
}
function promiseBatchActionFunctionCall(promiseIndex, methodName, args, amount, gas) {
  env.promise_batch_action_function_call(promiseIndex, methodName, args, amount, gas);
}
function promiseBatchActionTransfer(promiseIndex, amount) {
  env.promise_batch_action_transfer(promiseIndex, amount);
}
var PromiseResult;

(function (PromiseResult) {
  PromiseResult[PromiseResult["NotReady"] = 0] = "NotReady";
  PromiseResult[PromiseResult["Successful"] = 1] = "Successful";
  PromiseResult[PromiseResult["Failed"] = 2] = "Failed";
})(PromiseResult || (PromiseResult = {}));

function promiseResult(resultIdx) {
  let status = env.promise_result(resultIdx, 0);

  if (status == PromiseResult.Successful) {
    return env.read_register(0);
  } else if (status == PromiseResult.Failed || status == PromiseResult.NotReady) {
    return status;
  } else {
    panic(`Unexpected return code: ${status}`);
  }
}
function promiseReturn(promiseIdx) {
  env.promise_return(promiseIdx);
}
function storageWrite(key, value) {
  let exist = env.storage_write(key, value, EVICTED_REGISTER);

  if (exist === 1n) {
    return true;
  }

  return false;
}
function storageRemove(key) {
  let exist = env.storage_remove(key, EVICTED_REGISTER);

  if (exist === 1n) {
    return true;
  }

  return false;
}
function storageByteCost() {
  return 10000000000000000000n;
}

class NearContract {
  deserialize() {
    const rawState = storageRead("STATE");

    if (rawState) {
      const state = JSON.parse(rawState); // reconstruction of the contract class object from plain object

      let c = this.default();
      Object.assign(this, state);

      for (const item in c) {
        if (c[item].constructor?.deserialize !== undefined) {
          this[item] = c[item].constructor.deserialize(this[item]);
        }
      }
    } else {
      throw new Error("Contract state is empty");
    }
  }

  serialize() {
    storageWrite("STATE", JSON.stringify(this));
  }

  static deserializeArgs() {
    let args = input();
    return JSON.parse(args || "{}");
  }

  static serializeReturn(ret) {
    return JSON.stringify(ret);
  }

  init() {}

}

class LookupMap {
  constructor(keyPrefix) {
    this.keyPrefix = keyPrefix;
  }

  containsKey(key) {
    let storageKey = this.keyPrefix + JSON.stringify(key);
    return storageHasKey(storageKey);
  }

  get(key) {
    let storageKey = this.keyPrefix + JSON.stringify(key);
    let raw = storageRead(storageKey);

    if (raw !== null) {
      return JSON.parse(raw);
    }

    return null;
  }

  remove(key) {
    let storageKey = this.keyPrefix + JSON.stringify(key);

    if (storageRemove(storageKey)) {
      return JSON.parse(storageGetEvicted());
    }

    return null;
  }

  set(key, value) {
    let storageKey = this.keyPrefix + JSON.stringify(key);
    let storageValue = JSON.stringify(value);

    if (storageWrite(storageKey, storageValue)) {
      return JSON.parse(storageGetEvicted());
    }

    return null;
  }

  extend(objects) {
    for (let kv of objects) {
      this.set(kv[0], kv[1]);
    }
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    return new LookupMap(data.keyPrefix);
  }

}

function u8ArrayToBytes(array) {
  let ret = "";

  for (let e of array) {
    ret += String.fromCharCode(e);
  }

  return ret;
} // TODO this function is a bit broken and the type can't be string
// TODO for more info: https://github.com/near/near-sdk-js/issues/78

function bytesToU8Array(bytes) {
  let ret = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i++) {
    ret[i] = bytes.charCodeAt(i);
  }

  return ret;
}
function bytes(strOrU8Array) {
  if (typeof strOrU8Array == "string") {
    return checkStringIsBytes(strOrU8Array);
  } else if (strOrU8Array instanceof Uint8Array) {
    return u8ArrayToBytes(strOrU8Array);
  }

  throw new Error("bytes: expected string or Uint8Array");
}

function checkStringIsBytes(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
      throw new Error(`string ${str} at index ${i}: ${str[i]} is not a valid byte`);
    }
  }

  return str;
}

function assert(b, str) {
  if (b) {
    return;
  } else {
    throw Error("assertion failed: " + str);
  }
}

const ERR_INDEX_OUT_OF_BOUNDS = "Index out of bounds";
const ERR_INCONSISTENT_STATE$2 = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";

function indexToKey(prefix, index) {
  let data = new Uint32Array([index]);
  let array = new Uint8Array(data.buffer);
  let key = u8ArrayToBytes(array);
  return prefix + key;
} /// An iterable implementation of vector that stores its content on the trie.
/// Uses the following map: index -> element


class Vector {
  constructor(prefix) {
    this.length = 0;
    this.prefix = prefix;
  }

  len() {
    return this.length;
  }

  isEmpty() {
    return this.length == 0;
  }

  get(index) {
    if (index >= this.length) {
      return null;
    }

    let storageKey = indexToKey(this.prefix, index);
    return JSON.parse(storageRead(storageKey));
  } /// Removes an element from the vector and returns it in serialized form.
  /// The removed element is replaced by the last element of the vector.
  /// Does not preserve ordering, but is `O(1)`.


  swapRemove(index) {
    if (index >= this.length) {
      throw new Error(ERR_INDEX_OUT_OF_BOUNDS);
    } else if (index + 1 == this.length) {
      return this.pop();
    } else {
      let key = indexToKey(this.prefix, index);
      let last = this.pop();

      if (storageWrite(key, JSON.stringify(last))) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$2);
      }
    }
  }

  push(element) {
    let key = indexToKey(this.prefix, this.length);
    this.length += 1;
    storageWrite(key, JSON.stringify(element));
  }

  pop() {
    if (this.isEmpty()) {
      return null;
    } else {
      let lastIndex = this.length - 1;
      let lastKey = indexToKey(this.prefix, lastIndex);
      this.length -= 1;

      if (storageRemove(lastKey)) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$2);
      }
    }
  }

  replace(index, element) {
    if (index >= this.length) {
      throw new Error(ERR_INDEX_OUT_OF_BOUNDS);
    } else {
      let key = indexToKey(this.prefix, index);

      if (storageWrite(key, JSON.stringify(element))) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$2);
      }
    }
  }

  extend(elements) {
    for (let element of elements) {
      this.push(element);
    }
  }

  [Symbol.iterator]() {
    return new VectorIterator(this);
  }

  clear() {
    for (let i = 0; i < this.length; i++) {
      let key = indexToKey(this.prefix, i);
      storageRemove(key);
    }

    this.length = 0;
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let vector = new Vector(data.prefix);
    vector.length = data.length;
    return vector;
  }

}
class VectorIterator {
  constructor(vector) {
    this.current = 0;
    this.vector = vector;
  }

  next() {
    if (this.current < this.vector.len()) {
      let value = this.vector.get(this.current);
      this.current += 1;
      return {
        value,
        done: false
      };
    }

    return {
      value: null,
      done: true
    };
  }

}

const ERR_INCONSISTENT_STATE$1 = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";
class UnorderedMap {
  constructor(prefix) {
    this.length = 0;
    this.prefix = prefix;
    this.keyIndexPrefix = prefix + "i";
    let indexKey = prefix + "k";
    let indexValue = prefix + "v";
    this.keys = new Vector(indexKey);
    this.values = new Vector(indexValue);
  }

  len() {
    let keysLen = this.keys.len();
    let valuesLen = this.values.len();

    if (keysLen != valuesLen) {
      throw new Error(ERR_INCONSISTENT_STATE$1);
    }

    return keysLen;
  }

  isEmpty() {
    let keysIsEmpty = this.keys.isEmpty();
    let valuesIsEmpty = this.values.isEmpty();

    if (keysIsEmpty != valuesIsEmpty) {
      throw new Error(ERR_INCONSISTENT_STATE$1);
    }

    return keysIsEmpty;
  }

  serializeIndex(index) {
    let data = new Uint32Array([index]);
    let array = new Uint8Array(data.buffer);
    return u8ArrayToBytes(array);
  }

  deserializeIndex(rawIndex) {
    let array = bytesToU8Array(rawIndex);
    let data = new Uint32Array(array.buffer);
    return data[0];
  }

  getIndexRaw(key) {
    let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
    let indexRaw = storageRead(indexLookup);
    return indexRaw;
  }

  get(key) {
    let indexRaw = this.getIndexRaw(key);

    if (indexRaw) {
      let index = this.deserializeIndex(indexRaw);
      let value = this.values.get(index);

      if (value) {
        return value;
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$1);
      }
    }

    return null;
  }

  set(key, value) {
    let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
    let indexRaw = storageRead(indexLookup);

    if (indexRaw) {
      let index = this.deserializeIndex(indexRaw);
      return this.values.replace(index, value);
    } else {
      let nextIndex = this.len();
      let nextIndexRaw = this.serializeIndex(nextIndex);
      storageWrite(indexLookup, nextIndexRaw);
      this.keys.push(key);
      this.values.push(value);
      return null;
    }
  }

  remove(key) {
    let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
    let indexRaw = storageRead(indexLookup);

    if (indexRaw) {
      if (this.len() == 1) {
        // If there is only one element then swap remove simply removes it without
        // swapping with the last element.
        storageRemove(indexLookup);
      } else {
        // If there is more than one element then swap remove swaps it with the last
        // element.
        let lastKey = this.keys.get(this.len() - 1);

        if (!lastKey) {
          throw new Error(ERR_INCONSISTENT_STATE$1);
        }

        storageRemove(indexLookup); // If the removed element was the last element from keys, then we don't need to
        // reinsert the lookup back.

        if (lastKey != key) {
          let lastLookupKey = this.keyIndexPrefix + JSON.stringify(lastKey);
          storageWrite(lastLookupKey, indexRaw);
        }
      }

      let index = this.deserializeIndex(indexRaw);
      this.keys.swapRemove(index);
      return this.values.swapRemove(index);
    }

    return null;
  }

  clear() {
    for (let key of this.keys) {
      let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
      storageRemove(indexLookup);
    }

    this.keys.clear();
    this.values.clear();
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  [Symbol.iterator]() {
    return new UnorderedMapIterator(this);
  }

  extend(kvs) {
    for (let [k, v] of kvs) {
      this.set(k, v);
    }
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let map = new UnorderedMap(data.prefix); // reconstruct UnorderedMap

    map.length = data.length; // reconstruct keys Vector

    map.keys = new Vector(data.prefix + "k");
    map.keys.length = data.keys.length; // reconstruct values Vector

    map.values = new Vector(data.prefix + "v");
    map.values.length = data.values.length;
    return map;
  }

}

class UnorderedMapIterator {
  constructor(unorderedMap) {
    this.keys = new VectorIterator(unorderedMap.keys);
    this.values = new VectorIterator(unorderedMap.values);
  }

  next() {
    let key = this.keys.next();
    let value = this.values.next();

    if (key.done != value.done) {
      throw new Error(ERR_INCONSISTENT_STATE$1);
    }

    return {
      value: [key.value, value.value],
      done: key.done
    };
  }

}

const ERR_INCONSISTENT_STATE = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";
class UnorderedSet {
  constructor(prefix) {
    this.length = 0;
    this.prefix = prefix;
    this.elementIndexPrefix = prefix + "i";
    let elementsPrefix = prefix + "e";
    this.elements = new Vector(elementsPrefix);
  }

  len() {
    return this.elements.len();
  }

  isEmpty() {
    return this.elements.isEmpty();
  }

  serializeIndex(index) {
    let data = new Uint32Array([index]);
    let array = new Uint8Array(data.buffer);
    return u8ArrayToBytes(array);
  }

  deserializeIndex(rawIndex) {
    let array = bytesToU8Array(rawIndex);
    let data = new Uint32Array(array.buffer);
    return data[0];
  }

  contains(element) {
    let indexLookup = this.elementIndexPrefix + JSON.stringify(element);
    return storageHasKey(indexLookup);
  }

  set(element) {
    let indexLookup = this.elementIndexPrefix + JSON.stringify(element);

    if (storageRead(indexLookup)) {
      return false;
    } else {
      let nextIndex = this.len();
      let nextIndexRaw = this.serializeIndex(nextIndex);
      storageWrite(indexLookup, nextIndexRaw);
      this.elements.push(element);
      return true;
    }
  }

  remove(element) {
    let indexLookup = this.elementIndexPrefix + JSON.stringify(element);
    let indexRaw = storageRead(indexLookup);

    if (indexRaw) {
      if (this.len() == 1) {
        // If there is only one element then swap remove simply removes it without
        // swapping with the last element.
        storageRemove(indexLookup);
      } else {
        // If there is more than one element then swap remove swaps it with the last
        // element.
        let lastElement = this.elements.get(this.len() - 1);

        if (!lastElement) {
          throw new Error(ERR_INCONSISTENT_STATE);
        }

        storageRemove(indexLookup); // If the removed element was the last element from keys, then we don't need to
        // reinsert the lookup back.

        if (lastElement != element) {
          let lastLookupElement = this.elementIndexPrefix + JSON.stringify(lastElement);
          storageWrite(lastLookupElement, indexRaw);
        }
      }

      let index = this.deserializeIndex(indexRaw);
      this.elements.swapRemove(index);
      return true;
    }

    return false;
  }

  clear() {
    for (let element of this.elements) {
      let indexLookup = this.elementIndexPrefix + JSON.stringify(element);
      storageRemove(indexLookup);
    }

    this.elements.clear();
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  [Symbol.iterator]() {
    return this.elements[Symbol.iterator]();
  }

  extend(elements) {
    for (let element of elements) {
      this.set(element);
    }
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let set = new UnorderedSet(data.prefix); // reconstruct UnorderedSet

    set.length = data.length; // reconstruct Vector

    let elementsPrefix = data.prefix + "e";
    set.elements = new Vector(elementsPrefix);
    set.elements.length = data.elements.length;
    return set;
  }

}

function restoreOwners(collection) {
  if (collection == null) {
    return null;
  }

  return UnorderedSet.deserialize(collection);
} //used to make sure the user attached exactly 1 yoctoNEAR

function assertOneYocto() {
  assert(attachedDeposit().toString() === "1", "Requires attached deposit of exactly 1 yoctoNEAR");
} //internal method for removing a sale from the market. This returns the previously removed sale object

function internallyRemoveSale(contract, nftContractId, tokenId) {
  //get the unique sale ID (contract + DELIMITER + token ID)
  let contractAndTokenId = `${nftContractId}${DELIMETER}${tokenId}`; //get the sale object by removing the unique sale ID. If there was no sale, panic

  let sale = contract.sales.remove(contractAndTokenId);

  if (sale == null) {
    panic("no sale");
  } //get the set of sales for the sale's owner. If there's no sale, panic. 


  let byOwnerId = restoreOwners(contract.byOwnerId.get(sale.owner_id));

  if (byOwnerId == null) {
    panic("no sales by owner");
  } //remove the unique sale ID from the set of sales


  byOwnerId.remove(contractAndTokenId); //if the set of sales is now empty after removing the unique sale ID, we simply remove that owner from the map

  if (byOwnerId.isEmpty()) {
    contract.byOwnerId.remove(sale.owner_id); //if the set of sales is not empty after removing, we insert the set back into the map for the owner
  } else {
    contract.byOwnerId.set(sale.owner_id, byOwnerId);
  } //get the set of token IDs for sale for the nft contract ID. If there's no sale, panic. 


  let byNftContractId = restoreOwners(contract.byNftContractId.get(nftContractId));

  if (byNftContractId == null) {
    panic("no sales by nft contract");
  } //remove the token ID from the set 


  byNftContractId.remove(tokenId); //if the set is now empty after removing the token ID, we remove that nft contract ID from the map

  if (byNftContractId.isEmpty()) {
    contract.byNftContractId.remove(nftContractId); //if the set is not empty after removing, we insert the set back into the map for the nft contract ID
  } else {
    contract.byNftContractId.set(nftContractId, byNftContractId);
  } //return the sale object


  return sale;
}

const GAS_FOR_ROYALTIES = 115_000_000_000_000;
const GAS_FOR_NFT_TRANSFER = 15_000_000_000_000; //struct that holds important information about each sale on the market

class Sale {
  //owner of the sale
  //market contract's approval ID to transfer the token on behalf of the owner
  //nft contract where the token was minted
  //actual token ID for sale
  //sale price in yoctoNEAR that the token is listed for
  constructor({
    ownerId,
    approvalId,
    nftContractId,
    tokenId,
    saleConditions
  }) {
    this.owner_id = ownerId;
    this.approval_id = approvalId;
    this.nft_contract_id = nftContractId;
    this.token_id = tokenId;
    this.sale_conditions = saleConditions;
  }

} //removes a sale from the market. 

function internalRemoveSale({
  contract,
  nftContractId,
  tokenId
}) {
  //assert that the user has attached exactly 1 yoctoNEAR (for security reasons)
  assertOneYocto(); //get the sale object as the return value from removing the sale internally

  let sale = internallyRemoveSale(contract, nftContractId, tokenId); //get the predecessor of the call and make sure they're the owner of the sale

  let ownerId = predecessorAccountId(); //assert that the owner of the sale is the same as the caller of the function

  assert(ownerId == sale.owner_id, "only the owner of the sale can remove it");
} //updates the price for a sale on the market

function internalUpdatePrice({
  contract,
  nftContractId,
  tokenId,
  price
}) {
  //assert that the user has attached exactly 1 yoctoNEAR (for security reasons)
  assertOneYocto(); //create the unique sale ID from the nft contract and token

  let contractAndTokenId = `${nftContractId}${DELIMETER}${tokenId}`; //get the sale object from the unique sale ID. If there is no token, panic. 

  let sale = contract.sales.get(contractAndTokenId);

  if (sale == null) {
    panic("no sale");
  }

  assert(predecessorAccountId() == sale.owner_id, "only the owner of the sale can update it"); //set the sale conditions equal to the passed in price

  sale.sale_conditions = price; //insert the sale back into the map for the unique sale ID

  contract.sales.set(contractAndTokenId, sale);
} //place an offer on a specific sale. The sale will go through as long as your deposit is greater than or equal to the list price

function internalOffer({
  contract,
  nftContractId,
  tokenId
}) {
  //get the attached deposit and make sure it's greater than 0
  let deposit = attachedDeposit().valueOf();
  assert(deposit > 0, "deposit must be greater than 0"); //get the unique sale ID (contract + DELIMITER + token ID)

  let contractAndTokenId = `${nftContractId}${DELIMETER}${tokenId}`; //get the sale object from the unique sale ID. If the sale doesn't exist, panic.

  let sale = contract.sales.get(contractAndTokenId);

  if (sale == null) {
    panic("no sale");
  } //get the buyer ID which is the person who called the function and make sure they're not the owner of the sale


  let buyerId = predecessorAccountId();
  assert(buyerId != sale.owner_id, "you can't offer on your own sale"); //get the u128 price of the token (dot 0 converts from U128 to u128)

  let price = BigInt(sale.sale_conditions); //make sure the deposit is greater than the price

  assert(deposit >= price, "deposit must be greater than or equal to price"); //process the purchase (which will remove the sale, transfer and get the payout from the nft contract, and then distribute royalties) 

  processPurchase({
    contract,
    nftContractId,
    tokenId,
    price: deposit.toString(),
    buyerId
  });
} //private function used when a sale is purchased. 
//this will remove the sale, transfer and get the payout from the nft contract, and then distribute royalties

function processPurchase({
  contract,
  nftContractId,
  tokenId,
  price,
  buyerId
}) {
  //get the sale object by removing the sale
  let sale = internallyRemoveSale(contract, nftContractId, tokenId); //initiate a cross contract call to the nft contract. This will transfer the token to the buyer and return
  //a payout object used for the market to distribute funds to the appropriate accounts.

  const promise = promiseBatchCreate(nftContractId);
  promiseBatchActionFunctionCall(promise, "nft_transfer_payout", bytes(JSON.stringify({
    receiver_id: buyerId,
    //purchaser (person to transfer the NFT to)
    token_id: tokenId,
    //token ID to transfer
    approval_id: sale.approval_id,
    //market contract's approval ID in order to transfer the token on behalf of the owner
    memo: "payout from market",
    //memo (to include some context)

    /*
        the price that the token was purchased for. This will be used in conjunction with the royalty percentages
        for the token in order to determine how much money should go to which account. 
    */
    balance: price,
    max_len_payout: 10 //the maximum amount of accounts the market can payout at once (this is limited by GAS)

  })), 1, // 1 yoctoNEAR
  GAS_FOR_NFT_TRANSFER); //after the transfer payout has been initiated, we resolve the promise by calling our own resolve_purchase function. 
  //resolve purchase will take the payout object returned from the nft_transfer_payout and actually pay the accounts

  promiseThen(promise, currentAccountId(), "resolve_purchase", bytes(JSON.stringify({
    buyer_id: buyerId,
    //the buyer and price are passed in incase something goes wrong and we need to refund the buyer
    price: price
  })), 0, // no deposit 
  GAS_FOR_ROYALTIES);
  return promiseReturn(promise);
}
/*
    private method used to resolve the promise when calling nft_transfer_payout. This will take the payout object and 
    check to see if it's authentic and there's no problems. If everything is fine, it will pay the accounts. If there's a problem,
    it will refund the buyer for the price. 
*/

function internalResolvePurchase({
  buyerId,
  price
}) {
  assert(currentAccountId() === predecessorAccountId(), "Only the contract itself can call this method"); // checking for payout information returned from the nft_transfer_payout method

  let result = promiseResult(0);
  let payout = null;

  if (typeof result === 'string') {
    //if we set the payout_option to None, that means something went wrong and we should refund the buyer
    try {
      let payoutOption = JSON.parse(result);

      if (Object.keys(payoutOption.payout).length > 10 || Object.keys(payoutOption.payout).length < 1) {
        //we'll check if length of the payout object is > 10 or it's empty. In either case, we return None
        throw "Cannot have more than 10 royalties"; //if the payout object is the correct length, we move forward
      } else {
        //we'll keep track of how much the nft contract wants us to payout. Starting at the full price payed by the buyer
        let remainder = BigInt(price); //loop through the payout and subtract the values from the remainder. 

        Object.entries(payoutOption.payout).forEach(([key, value], index) => {
          remainder = remainder - BigInt(value);
        }); //Check to see if the NFT contract sent back a faulty payout that requires us to pay more or too little. 
        //The remainder will be 0 if the payout summed to the total price. The remainder will be 1 if the royalties
        //we something like 3333 + 3333 + 3333.

        if (remainder == BigInt(0) || remainder == BigInt(1)) {
          //set the payout because nothing went wrong
          payout = payoutOption.payout;
        } else {
          //if the remainder was anything but 1 or 0, we return None
          throw "Payout is not correct";
        }
      }
    } catch (e) {
      log(`error parsing payout object ${result}`);
      payout = null;
    }
  } //if the payout was null, we refund the buyer for the price they payed and return


  if (payout == null) {
    const promise = promiseBatchCreate(buyerId);
    promiseBatchActionTransfer(promise, BigInt(price));
    return price;
  } // NEAR payouts


  for (let [key, value] of Object.entries(payout)) {
    const promise = promiseBatchCreate(key);
    promiseBatchActionTransfer(promise, BigInt(value));
  } //return the price payout out


  return price;
}

//returns the number of sales the marketplace has up (as a string)
function internalSupplySales({
  contract
}) {
  //returns the sales object length wrapped as a string
  return contract.sales.len().toString();
} //returns the number of sales for a given account (result is a string)

function internalSupplyByOwnerId({
  contract,
  accountId
}) {
  //get the set of sales for the given owner Id
  let byOwnerId = restoreOwners(contract.byOwnerId.get(accountId)); //if there as some set, we return the length but if there wasn't a set, we return 0

  if (byOwnerId == null) {
    return "0";
  }

  return byOwnerId.len().toString();
} //returns paginated sale objects for a given account. (result is a vector of sales)

function internalSalesByOwnerId({
  contract,
  accountId,
  fromIndex,
  limit
}) {
  //get the set of token IDs for sale for the given account ID
  let tokenSet = restoreOwners(contract.byOwnerId.get(accountId)); //if there was no set, we return an empty array

  if (tokenSet == null) {
    return [];
  } //where to start pagination - if we have a fromIndex, we'll use that - otherwise start from 0 index


  let start = fromIndex ? parseInt(fromIndex) : 0; //take the first "limit" elements in the array. If we didn't specify a limit, use 50

  let max = limit ? limit : 50;
  let keys = tokenSet.toArray();
  let sales = [];

  for (let i = start; i < max; i++) {
    if (i >= keys.length) {
      break;
    }

    let sale = contract.sales.get(keys[i]);

    if (sale != null) {
      sales.push(sale);
    }
  }

  return sales;
} //get the number of sales for an nft contract. (returns a string)

function internalSupplyByNftContractId({
  contract,
  nftContractId
}) {
  //get the set of tokens for associated with the given nft contract
  let byNftContractId = restoreOwners(contract.byNftContractId.get(nftContractId)); //if there as some set, we return the length but if there wasn't a set, we return 0

  if (byNftContractId == null) {
    return "0";
  }

  return byNftContractId.len().toString();
} //returns paginated sale objects associated with a given nft contract. (result is a vector of sales)

function internalSalesByNftContractId({
  contract,
  accountId,
  fromIndex,
  limit
}) {
  //get the set of token IDs for sale for the given contract ID
  let tokenSet = restoreOwners(contract.byNftContractId.get(accountId)); //if there was no set, we return an empty array

  if (tokenSet == null) {
    return [];
  } //where to start pagination - if we have a fromIndex, we'll use that - otherwise start from 0 index


  let start = fromIndex ? parseInt(fromIndex) : 0; //take the first "limit" elements in the array. If we didn't specify a limit, use 50

  let max = limit ? limit : 50;
  let keys = tokenSet.toArray();
  let sales = [];

  for (let i = start; i < max; i++) {
    if (i >= keys.length) {
      break;
    }

    let sale = contract.sales.get(keys[i]);

    if (sale != null) {
      sales.push(sale);
    }
  }

  return sales;
} //get a sale information for a given unique sale ID (contract + DELIMITER + token ID)

function internalGetSale({
  contract,
  nftContractToken
}) {
  //try and get the sale object for the given unique sale ID. Will return an option since
  //we're not guaranteed that the unique sale ID passed in will be valid.n);
  return contract.sales.get(nftContractToken);
}

function internalNftOnApprove({
  contract,
  tokenId,
  ownerId,
  approvalId,
  msg
}) {
  // get the contract ID which is the predecessor
  let contractId = predecessorAccountId(); //get the signer which is the person who initiated the transaction

  let signerId = signerAccountId(); //make sure that the signer isn't the predecessor. This is so that we're sure
  //this was called via a cross-contract call

  assert(signerId != contractId, "this function can only be called via a cross-contract call"); //make sure the owner ID is the signer. 

  assert(ownerId == signerId, "only the owner of the token can approve it"); //we need to enforce that the user has enough storage for 1 EXTRA sale.  

  let storageAmount = contract.storage_minimum_balance(); //get the total storage paid by the owner

  let ownerPaidStorage = contract.storageDeposits.get(signerId) || BigInt(0); //get the storage required which is simply the storage for the number of sales they have + 1 

  let signerStorageRequired = (BigInt(internalSupplyByOwnerId({
    contract,
    accountId: signerId
  })) + BigInt(1)) * BigInt(storageAmount); //make sure that the total paid is >= the required storage

  assert(ownerPaidStorage >= signerStorageRequired, "the owner does not have enough storage to approve this token"); //if all these checks pass we can create the sale conditions object.

  let saleConditions = JSON.parse(msg);

  if (!saleConditions.hasOwnProperty('sale_conditions') || Object.keys(saleConditions).length != 1) {
    panic("invalid sale conditions");
  } //create the unique sale ID which is the contract + DELIMITER + token ID


  let contractAndTokenId = `${contractId}${DELIMETER}${tokenId}`; //insert the key value pair into the sales map. Key is the unique ID. value is the sale object

  contract.sales.set(contractAndTokenId, new Sale({
    ownerId: ownerId,
    //owner of the sale / token
    approvalId: approvalId,
    //approval ID for that token that was given to the market
    nftContractId: contractId,
    //NFT contract the token was minted on
    tokenId: tokenId,
    //the actual token ID
    saleConditions: saleConditions.sale_conditions //the sale conditions 

  })); //Extra functionality that populates collections necessary for the view calls 
  //get the sales by owner ID for the given owner. If there are none, we create a new empty set

  let byOwnerId = contract.byOwnerId.get(ownerId) || new UnorderedSet(ownerId); //insert the unique sale ID into the set

  byOwnerId.set(contractAndTokenId); //insert that set back into the collection for the owner

  contract.byOwnerId.set(ownerId, byOwnerId); //get the token IDs for the given nft contract ID. If there are none, we create a new empty set

  let byNftContractId = contract.byNftContractId.get(contractId) || new UnorderedSet(contractId); //insert the token ID into the set

  byNftContractId.set(tokenId); //insert the set back into the collection for the given nft contract ID

  contract.byNftContractId.set(contractId, byNftContractId);
}

var _class, _class2;

const NFT_METADATA_SPEC = "nft-1.0.0"; /// This is the name of the NFT standard we're using

const NFT_STANDARD_NAME = "nep171"; //the minimum storage to have a sale on the contract.

const STORAGE_PER_SALE = BigInt(1000) * storageByteCost().valueOf(); //every sale will have a unique ID which is `CONTRACT + DELIMITER + TOKEN_ID`

const DELIMETER = ".";
let Contract = NearBindgen(_class = (_class2 = class Contract extends NearContract {
  //keep track of the owner of the contract

  /*
      to keep track of the sales, we map the ContractAndTokenId to a Sale. 
      the ContractAndTokenId is the unique identifier for every sale. It is made
      up of the `contract ID + DELIMITER + token ID`
  */
  //keep track of all the Sale IDs for every account ID
  //keep track of all the token IDs for sale for a given contract
  //keep track of the storage that accounts have payed

  /*
      initialization function (can only be called once).
      this initializes the contract with metadata that was passed in and
      the owner_id. 
  */
  constructor({
    owner_id
  }) {
    super();
    this.ownerId = owner_id;
    this.sales = new UnorderedMap("sales");
    this.byOwnerId = new LookupMap("byOwnerId");
    this.byNftContractId = new LookupMap("byNftContractId");
    this.storageDeposits = new LookupMap("storageDeposits");
  }

  default() {
    return new Contract({
      owner_id: ''
    });
  }
  /*
      STORAGE
  */


  //Allows users to deposit storage. This is to cover the cost of storing sale objects on the contract
  //Optional account ID is to users can pay for storage for other people.
  storage_deposit({
    account_id
  }) {
    //get the account ID to pay for storage for
    let storageAccountId = account_id || predecessorAccountId(); //get the deposit value which is how much the user wants to add to their storage

    let deposit = attachedDeposit().valueOf(); //make sure the deposit is greater than or equal to the minimum storage for a sale

    assert(deposit >= STORAGE_PER_SALE, `Requires minimum deposit of ${STORAGE_PER_SALE}`); //get the balance of the account (if the account isn't in the map we default to a balance of 0)

    let balance = this.storageDeposits.get(storageAccountId) || "0"; //add the deposit to their balance

    let newBalance = BigInt(balance) + deposit; //insert the balance back into the map for that account ID

    this.storageDeposits.set(storageAccountId, newBalance.toString());
  }

  //Allows users to withdraw any excess storage that they're not using. Say Bob pays 0.01N for 1 sale
  //Alice then buys Bob's token. This means bob has paid 0.01N for a sale that's no longer on the marketplace
  //Bob could then withdraw this 0.01N back into his account. 
  storage_withdraw() {
    //make sure the user attaches exactly 1 yoctoNEAR for security purposes.
    //this will redirect them to the NEAR wallet (or requires a full access key). 
    assertOneYocto(); //the account to withdraw storage to is always the function caller

    let ownerId = predecessorAccountId(); //get the amount that the user has by removing them from the map. If they're not in the map, default to 0

    let amount = this.storageDeposits.remove(ownerId) || "0"; //how many sales is that user taking up currently. This returns a set

    let sales = restoreOwners(this.byOwnerId.get(ownerId)); //get the length of that set. 

    let len = 0;

    if (sales != null) {
      len = sales.len();
    } //how much NEAR is being used up for all the current sales on the account 


    let diff = BigInt(len) * STORAGE_PER_SALE; //the excess to withdraw is the total storage paid - storage being used up.

    let amountLeft = BigInt(amount) - diff; //if that excess to withdraw is > 0, we transfer the amount to the user.

    if (amountLeft > 0) {
      const promise = promiseBatchCreate(ownerId);
      promiseBatchActionTransfer(promise, amountLeft);
    } //we need to add back the storage being used up into the map if it's greater than 0.
    //this is so that if the user had 500 sales on the market, we insert that value here so
    //if those sales get taken down, the user can then go and withdraw 500 sales worth of storage.


    if (diff > 0) {
      this.storageDeposits.set(ownerId, diff.toString());
    }
  }

  //return the minimum storage for 1 sale
  storage_minimum_balance() {
    return STORAGE_PER_SALE.toString();
  }

  //return how much storage an account has paid for
  storage_balance_of({
    account_id
  }) {
    return this.storageDeposits.get(account_id) || "0";
  }
  /*
      SALES
  */


  //removes a sale from the market. 
  remove_sale({
    nft_contract_id,
    token_id
  }) {
    return internalRemoveSale({
      contract: this,
      nftContractId: nft_contract_id,
      tokenId: token_id
    });
  }

  //updates the price for a sale on the market
  update_price({
    nft_contract_id,
    token_id,
    price
  }) {
    return internalUpdatePrice({
      contract: this,
      nftContractId: nft_contract_id,
      tokenId: token_id,
      price: price
    });
  }

  //place an offer on a specific sale. The sale will go through as long as your deposit is greater than or equal to the list price
  offer({
    nft_contract_id,
    token_id
  }) {
    return internalOffer({
      contract: this,
      nftContractId: nft_contract_id,
      tokenId: token_id
    });
  }

  //place an offer on a specific sale. The sale will go through as long as your deposit is greater than or equal to the list price
  resolve_purchase({
    buyer_id,
    price
  }) {
    return internalResolvePurchase({
      buyerId: buyer_id,
      price: price
    });
  }
  /*
      SALE VIEWS
  */


  //returns the number of sales the marketplace has up (as a string)
  get_supply_sales() {
    return internalSupplySales({
      contract: this
    });
  }

  //returns the number of sales for a given account (result is a string)
  get_supply_by_owner_id({
    account_id
  }) {
    return internalSupplyByOwnerId({
      contract: this,
      accountId: account_id
    });
  }

  //returns paginated sale objects for a given account. (result is a vector of sales)
  get_sales_by_owner_id({
    account_id,
    from_index,
    limit
  }) {
    return internalSalesByOwnerId({
      contract: this,
      accountId: account_id,
      fromIndex: from_index,
      limit: limit
    });
  }

  //returns paginated sale objects for a given account. (result is a vector of sales)
  get_supply_by_nft_contract_id({
    nft_contract_id
  }) {
    return internalSupplyByNftContractId({
      contract: this,
      nftContractId: nft_contract_id
    });
  }

  //returns paginated sale objects associated with a given nft contract. (result is a vector of sales)
  get_sales_by_nft_contract_id({
    nft_contract_id,
    from_index,
    limit
  }) {
    return internalSalesByNftContractId({
      contract: this,
      accountId: nft_contract_id,
      fromIndex: from_index,
      limit: limit
    });
  }

  //get a sale information for a given unique sale ID (contract + DELIMITER + token ID)
  get_sale({
    nft_contract_token
  }) {
    return internalGetSale({
      contract: this,
      nftContractToken: nft_contract_token
    });
  }
  /*
      APPROVALS
  */


  /// where we add the sale because we know nft owner can only call nft_approve
  nft_on_approve({
    token_id,
    owner_id,
    approval_id,
    msg
  }) {
    return internalNftOnApprove({
      contract: this,
      tokenId: token_id,
      ownerId: owner_id,
      approvalId: approval_id,
      msg: msg
    });
  }

}, (_applyDecoratedDescriptor(_class2.prototype, "storage_deposit", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "storage_deposit"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "storage_withdraw", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "storage_withdraw"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "storage_minimum_balance", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "storage_minimum_balance"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "storage_balance_of", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "storage_balance_of"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "remove_sale", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "remove_sale"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "update_price", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "update_price"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "offer", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "offer"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "resolve_purchase", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "resolve_purchase"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_supply_sales", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "get_supply_sales"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_supply_by_owner_id", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "get_supply_by_owner_id"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_sales_by_owner_id", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "get_sales_by_owner_id"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_supply_by_nft_contract_id", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "get_supply_by_nft_contract_id"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_sales_by_nft_contract_id", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "get_sales_by_nft_contract_id"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_sale", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "get_sale"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_on_approve", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_on_approve"), _class2.prototype)), _class2)) || _class;
function init() {
  Contract._init();
}
function nft_on_approve() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nft_on_approve(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function get_sale() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.get_sale(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function get_sales_by_nft_contract_id() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.get_sales_by_nft_contract_id(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function get_supply_by_nft_contract_id() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.get_supply_by_nft_contract_id(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function get_sales_by_owner_id() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.get_sales_by_owner_id(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function get_supply_by_owner_id() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.get_supply_by_owner_id(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function get_supply_sales() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.get_supply_sales(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function resolve_purchase() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.resolve_purchase(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function offer() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.offer(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function update_price() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.update_price(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function remove_sale() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.remove_sale(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function storage_balance_of() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.storage_balance_of(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function storage_minimum_balance() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.storage_minimum_balance(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function storage_withdraw() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.storage_withdraw(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function storage_deposit() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.storage_deposit(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}

export { Contract, DELIMETER, NFT_METADATA_SPEC, NFT_STANDARD_NAME, STORAGE_PER_SALE, get_sale, get_sales_by_nft_contract_id, get_sales_by_owner_id, get_supply_by_nft_contract_id, get_supply_by_owner_id, get_supply_sales, init, nft_on_approve, offer, remove_sale, resolve_purchase, storage_balance_of, storage_deposit, storage_minimum_balance, storage_withdraw, update_price };
//# sourceMappingURL=market.js.map
