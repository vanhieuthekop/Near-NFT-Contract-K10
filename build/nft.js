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
function predecessorAccountId() {
  env.predecessor_account_id(0);
  return env.read_register(0);
}
function attachedDeposit() {
  return env.attached_deposit();
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
function input() {
  env.input(0);
  return env.read_register(0);
}
function storageUsage() {
  return env.storage_usage();
}
function promiseBatchCreate(accountId) {
  return env.promise_batch_create(accountId);
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

// @ts-nocheck
class Token {
  constructor({
    ownerId
  }) {
    this.owner_id = ownerId;
  }

}
class JsonToken {
  constructor({
    tokenId,
    ownerId,
    metadata
  }) {
    this.token_id = tokenId, this.owner_id = ownerId, this.metadata = metadata;
  }

}
function internalNftMetadata({
  contract
}) {
  return contract.metadata;
}

function restoreOwners(collection) {
  if (collection == null) {
    return null;
  }

  return UnorderedSet.deserialize(collection);
}
function refundDeposit(storageUsed) {
  let requiredCost = storageUsed * storageByteCost().valueOf();
  let attachedDeposit$1 = attachedDeposit().valueOf();
  assert(requiredCost <= attachedDeposit$1, `Must attach ${requiredCost} yoctoNEAR to cover storage`);
  let refund = attachedDeposit$1 - requiredCost;
  log(`Refunding ${refund} yoctoNEAR`);

  if (refund > 1) {
    const promise = promiseBatchCreate(predecessorAccountId());
    promiseBatchActionTransfer(promise, refund);
  }
}
function internalAddTokenToOwner(contract, accountId, tokenId) {
  let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId));

  if (tokenSet == null) {
    tokenSet = new UnorderedSet("tokensPerOwner" + accountId.toString());
  }

  tokenSet.set(tokenId);
  contract.tokensPerOwner.set(accountId, tokenSet);
}

// @ts-nocheck
function internalMint({
  contract,
  tokenId,
  metadata,
  receiverId,
  perpetualRoyalties
}) {
  let initialStorageUsage = storageUsage();
  let token = new Token({
    ownerId: receiverId
  });
  assert(!contract.tokensById.containsKey(tokenId), "Token already exists");
  contract.tokensById.set(tokenId, token);
  contract.tokenMetadataById.set(tokenId, metadata);
  internalAddTokenToOwner(contract, token.owner_id, tokenId);
  let requiredStorageInBytes = storageUsage().valueOf() - initialStorageUsage.valueOf();
  refundDeposit(requiredStorageInBytes);
}

// @ts-nocheck
function internalNftToken({
  contract,
  tokenId
}) {
  let token = contract.tokensById.get(tokenId);

  if (token == null) {
    return null;
  }

  let metadata = contract.tokenMetadataById.get(tokenId);
  let jsonToken = new JsonToken({
    tokenId: tokenId,
    ownerId: token.owner_id,
    metadata
  });
  return jsonToken;
}

// @ts-nocheck
function internalTotalSupply({
  contract
}) {
  return contract.tokenMetadataById.len();
}
function internalNftTokens({
  contract,
  fromIndex,
  limit
}) {
  let start = fromIndex ? parseInt(fromIndex) : 0;
  let max = limit ? limit : 50;
  let keys = contract.tokenMetadataById.toArray();

  for (let i = start; i < keys.length && i < start + max; i++) {
    let jsonToken = internalNftToken({
      contract,
      tokenId: keys[i][0]
    });
    tokens.push(jsonToken);
  }

  return tokens;
}
function internalSupplyForOwner({
  contract,
  accountId
}) {
  let tokens = restoreOwners(contract.tokensPerOwner.get(accountId));

  if (tokens == null) {
    return 0;
  }

  return tokens.len();
}
function internalTokensForOwner({
  contract,
  accountId,
  fromIndex,
  limit
}) {
  let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId));

  if (tokenSet == null) {
    return [];
  }

  let start = fromIndex ? parseInt(fromIndex) : 0;
  let max = limit ? limit : 50;
  let keys = tokenSet.toArray();
  let tokens = [];

  for (let i = start; i < max; i++) {
    if (i >= keys.length) {
      break;
    }

    let token = internalNftToken({
      contract,
      tokenId: keys[i]
    });
    tokens.push(token);
  }

  return tokens;
}

var _class, _class2;
const NFT_METADATA_SPEC = "nft-1.0.0";
const NFT_STANDARD_NAME = "nep171";
let Contract = NearBindgen(_class = (_class2 = class Contract extends NearContract {
  constructor({
    owner_id,
    metadata = {
      spec: "nft-1.0.0",
      name: "NFT Vincen Contract",
      symbol: "Vincen"
    }
  }) {
    super();
    this.owner_id = owner_id;
    this.tokensPerOwner = new LookupMap("tokensPerOwner");
    this.tokensById = new LookupMap("tokensById");
    this.tokenMetadataById = new UnorderedMap("tokenMetadataById");
    this.metadata = metadata;
  }

  default() {
    return new Contract({
      owner_id: ''
    });
  }
  /*
      MINT
  */


  nft_mint({
    token_id,
    metadata,
    receiver_id,
    perpetual_royalties
  }) {
    return internalMint({
      contract: this,
      tokenId: token_id,
      metadata: metadata,
      receiverId: receiver_id,
      perpetualRoyalties: perpetual_royalties
    });
  }
  /*
      CORE
  */


  //get the information for a specific token ID
  nft_token({
    token_id
  }) {
    return internalNftToken({
      contract: this,
      tokenId: token_id
    });
  }
  /*
      ENUMERATION
  */


  //Query for the total supply of NFTs on the contract
  nft_total_supply() {
    return internalTotalSupply({
      contract: this
    });
  }

  //Query for nft tokens on the contract regardless of the owner using pagination
  nft_tokens({
    from_index,
    limit
  }) {
    return internalNftTokens({
      contract: this,
      fromIndex: from_index,
      limit: limit
    });
  }

  //get the total supply of NFTs for a given ownernft_tokens_for_owner
  nft_tokens_for_owner({
    account_id,
    from_index,
    limit
  }) {
    return internalTokensForOwner({
      contract: this,
      accountId: account_id,
      fromIndex: from_index,
      limit: limit
    });
  }

  //Query for all the tokens for an owner
  nft_supply_for_owner({
    account_id
  }) {
    return internalSupplyForOwner({
      contract: this,
      accountId: account_id
    });
  }
  /*
      METADATA
  */


  //Query for all the tokens for an owner
  nft_metadata() {
    return internalNftMetadata(this);
  }

}, (_applyDecoratedDescriptor(_class2.prototype, "nft_mint", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_mint"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_token", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_token"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_total_supply", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_total_supply"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_tokens", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_tokens"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_tokens_for_owner", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_tokens_for_owner"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_supply_for_owner", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_supply_for_owner"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nft_metadata", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "nft_metadata"), _class2.prototype)), _class2)) || _class;
function init() {
  Contract._init();
}
function nft_metadata() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nft_metadata(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function nft_supply_for_owner() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nft_supply_for_owner(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function nft_tokens_for_owner() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nft_tokens_for_owner(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function nft_tokens() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nft_tokens(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function nft_total_supply() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nft_total_supply(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function nft_token() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nft_token(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function nft_mint() {
  let _contract = Contract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nft_mint(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}

export { Contract, NFT_METADATA_SPEC, NFT_STANDARD_NAME, init, nft_metadata, nft_mint, nft_supply_for_owner, nft_token, nft_tokens, nft_tokens_for_owner, nft_total_supply };
//# sourceMappingURL=nft.js.map
