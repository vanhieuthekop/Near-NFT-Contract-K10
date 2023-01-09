// @ts-nocheck
import { Contract } from ".";
import { JsonToken, Token, TokenMetadata } from "./metadata";

const GAS_FOR_RESOLVE_TRANSFER = 40_000_000_000_000;
const GAS_FOR_NFT_ON_TRANSFER = 35_000_000_000_000;

export function internalNftToken({
    contract,
    tokenId
}:{ 
    contract: Contract, 
    tokenId: string 
}) {
    let token = contract.tokensById.get(tokenId) as Token;
    if (token == null) {
        return null;
    }

    let metadata = contract.tokenMetadataById.get(tokenId) as TokenMetadata;
    
    let jsonToken = new JsonToken({
        tokenId: tokenId,
        ownerId: token.owner_id,
        metadata,
    });
    return jsonToken;
}

export function internalNftTransfer({
    contract,
    receiverId,
    tokenId,
    approvalId,
    memo,
}:{
    contract: Contract, 
    receiverId: string, 
    tokenId: string, 
    approvalId: number
    memo: string
}) {
    assertOneYocto();
    let senderId = near.predecessorAccountId();

    internalTransfer(
        contract,
        senderId,
        receiverId,
        tokenId,
        memo
    );
}

export function assertOneYocto() {
    assert(near.attachedDeposit().toString() === "1", "Requires attached deposit of exactly 1 yoctoNEAR");
}

export function internalNftTransferCall({
    contract,
    receiverId,
    tokenId,
    approvalId,
    memo,
    msg
}:{
    contract: Contract,
    receiverId: string, 
    tokenId: string, 
    approvalId: number,
    memo: string,
    msg: string  
}) {
    assertOneYocto();
    let senderId = near.predecessorAccountId();

    let previousToken = internalTransfer(
        contract,
        senderId,
        receiverId,
        tokenId,
        memo,
    );

    const promise = near.promiseBatchCreate(receiverId);
    near.promiseBatchActionFunctionCall(
        promise, 
        "nft_on_transfer", 
        bytes(JSON.stringify({ 
            sender_id: senderId,
            previous_owner_id: previousToken.owner_id,
            token_id: tokenId,
            msg
        })), 
        0,
        GAS_FOR_NFT_ON_TRANSFER
    );

    near.promiseThen(
        promise, 
        near.currentAccountId(), 
        "nft_resolve_transfer", 
        bytes(JSON.stringify({
            owner_id: previousToken.owner_id,
            receiver_id: receiverId,
            token_id: tokenId
        })), 
        0,
        GAS_FOR_RESOLVE_TRANSFER
    );
    return near.promiseReturn(promise);
}

export function internalResolveTransfer({
    contract,
    authorizedId,
    ownerId,
    receiverId,
    tokenId,
    approvedAccountIds,
    memo
}:{
    contract: Contract,
    authorizedId: string,
    ownerId: string,
    receiverId: string,
    tokenId: string,
    approvedAccountIds: { [key: string]: number },
    memo: string    
}) {
    assert(near.currentAccountId() === near.predecessorAccountId(), "Only the contract itself can call this method");
    let result = near.promiseResult(0);
    if (typeof result === 'string') {
        if (result === 'false') {
            return true;
        }
    }

    let token = contract.tokensById.get(tokenId) as Token;
    if (token != null) {
        if (token.owner_id != receiverId) {
            return true;
        }
    } else {
        return true;
    }

    internalRemoveTokenFromOwner(contract, receiverId, tokenId);
    
    internalAddTokenToOwner(contract, ownerId, tokenId);
    token.owner_id = ownerId

    contract.tokensById.set(tokenId, token);

    return false
}