// @ts-nocheck
import { NearContract, NearBindgen, near, call, view, LookupMap, UnorderedMap, Vector, UnorderedSet } from 'near-sdk-js'
import { NFTContractMetadata, Token, TokenMetadata, internalNftMetadata } from './metadata';
import { internalMint } from './mint';
import { internalNftTokens, internalSupplyForOwner, internalTokensForOwner, internalTotalSupply } from './enumeration';
import { internalNftToken } from './nft_core';

export const NFT_METADATA_SPEC = "nft-1.0.0";

export const NFT_STANDARD_NAME = "nep171";

@NearBindgen
export class Contract extends NearContract {
    owner_id: string;
    tokensPerOwner: LookupMap<AccountId, UnorderedSet<TokenId>>;
    tokensById: LookupMap<TokenId, Token>;
    tokenMetadataById: UnorderedMap<TokenId, TokenMetadata>;
    metadata: NFTContractMetadata;

    constructor({
        owner_id, 
        metadata = {
            spec: "nft-1.0.0",
            name: "NFT Vincen Contract",
            symbol: "Vincen"
        } 
    }) {
        super()
        this.owner_id = owner_id;
        this.tokensPerOwner = new LookupMap("tokensPerOwner");
        this.tokensById = new LookupMap("tokensById");
        this.tokenMetadataById = new UnorderedMap("tokenMetadataById");
        this.metadata = metadata;
    }

    default() {
        return new Contract({owner_id: ''})
    }

    /*
        MINT
    */
    @call
    nft_mint({ token_id, metadata, receiver_id, perpetual_royalties }) {
        return internalMint({ contract: this, tokenId: token_id, metadata: metadata, receiverId: receiver_id, perpetualRoyalties: perpetual_royalties });
    }

    /*
        CORE
    */
    @view
    //get the information for a specific token ID
    nft_token({ token_id }) {
        return internalNftToken({ contract: this, tokenId: token_id });
    }

    /*
        ENUMERATION
    */
    @view
    //Query for the total supply of NFTs on the contract
    nft_total_supply() {
        return internalTotalSupply({ contract: this });
    }

    @view
    //Query for nft tokens on the contract regardless of the owner using pagination
    nft_tokens({ from_index, limit }) {
        return internalNftTokens({ contract: this, fromIndex: from_index, limit: limit });
    }

    @view
    //get the total supply of NFTs for a given ownernft_tokens_for_owner
    nft_tokens_for_owner({ account_id, from_index, limit }) {
        return internalTokensForOwner({ contract: this, accountId: account_id, fromIndex: from_index, limit: limit });
    }

    @view
    //Query for all the tokens for an owner
    nft_supply_for_owner({ account_id }) {
        return internalSupplyForOwner({ contract: this, accountId: account_id });
    }

    /*
        METADATA
    */
    @view
    //Query for all the tokens for an owner
    nft_metadata() {
        return internalNftMetadata(this);
    }
}