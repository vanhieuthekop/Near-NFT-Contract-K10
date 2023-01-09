// @ts-nocheck
import { assert, near } from "near-sdk-js";
import { Contract, NFT_METADATA_SPEC, NFT_STANDARD_NAME } from ".";
import { internalAddTokenToOwner, refundDeposit } from "./internal";
import { Token, TokenMetadata } from "./metadata";

export function internalMint({
    contract,
    tokenId,
    metadata,
    receiverId,
    perpetualRoyalties
}:{ 
    contract: Contract, 
    tokenId: string, 
    metadata: TokenMetadata, 
    receiverId: string 
    perpetualRoyalties: {[key: string]: number}
}): void {
    let initialStorageUsage = near.storageUsage();

    let token = new Token ({
        ownerId: receiverId
    });

    assert(!contract.tokensById.containsKey(tokenId), "Token already exists");
    contract.tokensById.set(tokenId, token)

    contract.tokenMetadataById.set(tokenId, metadata);

    internalAddTokenToOwner(contract, token.owner_id, tokenId)

    let requiredStorageInBytes = near.storageUsage().valueOf() - initialStorageUsage.valueOf();

    refundDeposit(requiredStorageInBytes);
}