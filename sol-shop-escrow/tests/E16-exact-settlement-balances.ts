import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E16 - Exact Settlement Balances
 *
 * Purpose:
 * Verify that an accepted finalization transfers the exact
 * proposed amounts to Party A, Party B, and the donation wallet.
 *
 * Scenario:
 * - Both parties deposit 1 SOL each.
 * - Party A proposes:
 *   0.8 SOL to Party A
 *   1.1 SOL to Party B
 *   0.1 SOL donation
 * - Party B accepts.
 *
 * Expected:
 * - Party A receives exactly 0.8 SOL.
 * - Party B receives exactly 1.1 SOL, less only its tx fee.
 * - Donation wallet receives exactly 0.1 SOL.
 * - Vault decreases by exactly 2 SOL.
 * - Escrow status becomes COMPLETED.
 */

describe("E16 - exact settlement balances", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("transfers the exact proposed settlement amounts", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1016);

        const oneSol =
            new anchor.BN(1_000_000_000);

        const payoutA =
            new anchor.BN(800_000_000);

        const payoutB =
            new anchor.BN(1_100_000_000);

        const donation =
            new anchor.BN(100_000_000);

        const donationRecipient =
            new PublicKey(
                "61Gt8siRo84pmGziia5dHuJMkx9ne1d4Cb5aHsyQGP85"
            );

        const [escrow] = findEscrowPda(
            partyA.publicKey,
            escrowId
        );

        const [vault] =
            findVaultPda(escrow);

        await program.methods
            .createEscrow(
                escrowId,
                0,
                partyA.publicKey,
                partyB.publicKey,
                oneSol,
                oneSol,
                oneSol,
                "E16 exact settlement"
            )
            .accounts({
                creator: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: partyB.publicKey,
                escrow,
                vault,
            })
            .signers([partyB])
            .rpc();

        await program.methods
            .suggestFinalization(
                payoutA,
                payoutB,
                donation,
                "E16 settlement"
            )
            .accounts({
                signer: partyA.publicKey,
                escrow,
            })
            .signers([partyA])
            .rpc();

        const partyABefore =
            await getBalance(
                provider,
                partyA.publicKey
            );

        const partyBBefore =
            await getBalance(
                provider,
                partyB.publicKey
            );

        const donationBefore =
            await getBalance(
                provider,
                donationRecipient
            );

        const vaultBefore =
            await getBalance(
                provider,
                vault
            );

        const tx = await program.methods
            .acceptFinalization()
            .accounts({
                signer: partyB.publicKey,
                escrow,
                vault,
                partyA: partyA.publicKey,
                partyB: partyB.publicKey,
                donationRecipient,
            })
            .signers([partyB])
            .rpc();

        const txInfo =
            await provider.connection.getTransaction(
                tx,
                {
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0,
                }
            );

        const fee =
            txInfo?.meta?.fee ?? 0;

        const partyAAfter =
            await getBalance(
                provider,
                partyA.publicKey
            );

        const partyBAfter =
            await getBalance(
                provider,
                partyB.publicKey
            );

        const donationAfter =
            await getBalance(
                provider,
                donationRecipient
            );

        const vaultAfter =
            await getBalance(
                provider,
                vault
            );

        const escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(
            partyAAfter - partyABefore
        ).to.equal(
            payoutA.toNumber()
        );

        expect(
            partyBAfter - partyBBefore + fee
        ).to.equal(
            payoutB.toNumber()
        );

        expect(
            donationAfter - donationBefore
        ).to.equal(
            donation.toNumber()
        );

        expect(
            vaultBefore - vaultAfter
        ).to.equal(
            payoutA
                .add(payoutB)
                .add(donation)
                .toNumber()
        );

        expect(
            escrowData.status
        ).to.equal(3);

        console.log(
            "E16 EXACT SETTLEMENT BALANCES VERIFIED"
        );
    });
});
