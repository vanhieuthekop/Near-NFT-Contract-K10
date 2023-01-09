import { assert, near, UnorderedSet, Vector } from "near-sdk-js";
import { Contract } from ".";
import { NFTContractMetadata, Token } from "./metadata";

export function restoreOwners(collection) {
    if (collection == null) {
        return null;
    }
    return UnorderedSet.deserialize(collection as UnorderedSet);
}

export function refundDeposit(storageUsed: bigint) {
    let requiredCost = storageUsed * near.storageByteCost().valueOf()
    let attachedDeposit = near.attachedDeposit().valueOf();

    assert(
        requiredCost <= attachedDeposit,
        `Must attach ${requiredCost} yoctoNEAR to cover storage`
    )

    let refund = attachedDeposit - requiredCost;
    near.log(`Refunding ${refund} yoctoNEAR`);

    if (refund > 1) {
        const promise = near.promiseBatchCreate(near.predecessorAccountId());
        near.promiseBatchActionTransfer(promise, refund)
    }
}

export function internalAddTokenToOwner(contract: Contract, accountId: string, tokenId: string) {
    let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId));

    if(tokenSet == null) {
        tokenSet = new UnorderedSet("tokensPerOwner" + accountId.toString());
    }

    tokenSet.set(tokenId);

    contract.tokensPerOwner.set(accountId, tokenSet);
}

export function internalNftMetadata({
    contract
}:{
    contract: Contract
}): NFTContractMetadata {
    return contract.metadata;
}

export function internalTransfer(contract: Contract, senderId: string, receiverId: string, tokenId: string, memo: string): Token {
    let token = contract.tokensById.get(tokenId) as Token;
    if (token == null) {
        near.panic("no token found");
    }

    assert(token.owner_id === senderId, "Token should be owned by the sender");

    assert(token.owner_id != receiverId, "The token owner and the receiver should be different")

    internalRemoveTokenFromOwner(contract, token.owner_id, tokenId);
    internalAddTokenToOwner(contract, receiverId, tokenId);

    let newToken = new Token ({
        ownerId: receiverId,
    });

    contract.tokensById.set(tokenId, newToken);

    if (memo != null) {
        near.log(`Memo: ${memo}`);
    }

    return token
}

export function internalRemoveTokenFromOwner(contract: Contract, accountId: string, tokenId: string) {
    let tokenSet = restoreOwners(contract.tokensPerOwner.get(accountId));
    if (tokenSet == null) {
        near.panic("Token should be owned by the sender");
    }

    tokenSet.remove(tokenId)

    if (tokenSet.isEmpty()) {
        contract.tokensPerOwner.remove(accountId);
        contract.tokensPerOwner.set(accountId, tokenSet);
    }
}