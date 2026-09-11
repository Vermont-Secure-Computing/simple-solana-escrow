import * as anchor from "@coral-xyz/anchor";
import {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
} from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
    "J6oeUYbGXSdKyH4d1YhtHoCuEA79d9FQurmsim82KN5A"
);

export function findEscrowPda(
    creator: PublicKey,
    escrowId: anchor.BN
) {
    const id = escrowId.toArrayLike(
        Buffer,
        "le",
        8
    );

    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("escrow"),
            creator.toBuffer(),
            id,
        ],
        PROGRAM_ID
    );
}

export function findVaultPda(escrow: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("vault"),
            escrow.toBuffer(),
        ],
        PROGRAM_ID
    );
}

export async function fundWallet(
    provider: anchor.AnchorProvider,
    wallet: PublicKey,
    sol = 10
) {
    const signature =
        await provider.connection.requestAirdrop(
            wallet,
            sol * LAMPORTS_PER_SOL
        );

    const latest =
        await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
        signature,
        ...latest,
    });
}

export async function getBalance(
    provider: anchor.AnchorProvider,
    address: PublicKey
) {
    return provider.connection.getBalance(address);
}

export async function accountExists(
    provider: anchor.AnchorProvider,
    address: PublicKey
) {
    const account =
        await provider.connection.getAccountInfo(address);

    return account !== null;
}

export async function createFundedWallet(
    provider: anchor.AnchorProvider,
    sol = 10
) {
    const wallet = Keypair.generate();

    await fundWallet(
        provider,
        wallet.publicKey,
        sol
    );

    return wallet;
}


export async function expectAnchorError(
    action: () => Promise<unknown>,
    errorCode: string
) {
    try {
        await action();
        throw new Error(
            `Expected Anchor error ${errorCode}`
        );
    } catch (err: any) {
        const code =
            err?.error?.errorCode?.code;

        if (code !== errorCode) {
            throw err;
        }
    }
}