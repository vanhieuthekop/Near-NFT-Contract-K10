// @ts-nocheck
import { Contract } from ".";

export class Payout {
    payout: { [accountId: string]: bigint };
    constructor({ payout }: { payout: { [accountId: string]: bigint } }) {
        this.payout = payout;
    }
}

export class NFTContractMetadata {
    spec: string;
    name: string;
    symbol: string;
    icon?: string;
    base_uri?: string;
    reference?: string;
    reference_hash?: string;
    
    constructor(
        {
            spec, 
            name, 
            symbol, 
            icon, 
            baseUri, 
            reference, 
            referenceHash
        }:{ 
            spec: string, 
            name: string, 
            symbol: string, 
            icon?: string, 
            baseUri?: string, 
            reference?: string, 
            referenceHash?: string
        }) {
        this.spec = spec
        this.name = name
        this.symbol = symbol
        this.icon = icon
        this.base_uri = baseUri
        this.reference = reference
        this.reference_hash = referenceHash
    }
}

export class TokenMetadata {
    title?: string;
    description?: string;
    media?: string;
    media_hash?: string;
    copies?: number;
    issued_at?: string;
    expires_at?: string;
    starts_at?: string;
    updated_at?: string;
    extra?: string;
    reference?: string;
    reference_hash?: string;

    constructor(
        {
            title, 
            description, 
            media, 
            mediaHash, 
            copies, 
            issuedAt, 
            expiresAt, 
            startsAt, 
            updatedAt, 
            extra, 
            reference, 
            referenceHash
        }:{
            title?: string, 
            description?: string, 
            media?: string, 
            mediaHash?: string, 
            copies?: number, 
            issuedAt?: string, 
            expiresAt?: string, 
            startsAt?: string, 
            updatedAt?: string, 
            extra?: string, 
            reference?: string, 
            referenceHash?: string}
        ) {
        this.title = title
        this.description = description
        this.media = media
        this.media_hash = mediaHash
        this.copies = copies
        this.issued_at = issuedAt
        this.expires_at = expiresAt
        this.starts_at = startsAt
        this.updated_at = updatedAt
        this.extra = extra
        this.reference = reference
        this.reference_hash = referenceHash
    }
}

export class Token {
    owner_id: string;

    constructor({
        ownerId,
    }: {
        ownerId: string
    }) {
        this.owner_id = ownerId;
    }
}

export class JsonToken {
    token_id: string;
    owner_id: string;
    metadata: TokenMetadata;

    constructor({ 
        tokenId, 
        ownerId, 
        metadata, 
    }:{
        tokenId: string,
        ownerId: string,
        metadata: TokenMetadata,
    }) {
        this.token_id = tokenId,
        this.owner_id = ownerId,
        this.metadata = metadata
    }
}

export function internalNftMetadata({
    contract
}:{
    contract: Contract
}): NFTContractMetadata {
    return contract.metadata;
}