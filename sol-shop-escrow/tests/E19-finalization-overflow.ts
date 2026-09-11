import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
} from "./escrow-test-helpers";

/*
 * E19 - Finalization Overflow
 *
 * Purpose:
 * Check whether very large payout values can overflow the
 * finalization total calculation.
 *
 * Scenario:
 * - Both parties deposit 1 SOL each.
 * - Submit payout values that wrap to 2 SOL if u64 addition
 *   is unchecked.
 *
 * Expected:
 * - The malicious proposal should be rejected.
 * - Escrow should remain DEPOSITS_COMPLETE.
 */

describe("E19 - finalization overflow", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("rejects a payout total that depends on u64 overflow", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1019);

        const oneSol =
            new anchor.BN(1_000_000_000);

        const u64Max =
            new anchor.BN(
                "18446744073709551615"
            );

        /*
         * u64::MAX + 2,000,000,001
         * wraps to 2,000,000,000.
         */
        const wrappedPayoutB =
            new anchor.BN(2_000_000_001);

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
                "E19 overflow"
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

        let accepted = false;

        try {
            await program.methods
                .suggestFinalization(
                    u64Max,
                    wrappedPayoutB,
                    new anchor.BN(0),
                    "overflow attempt"
                )
                .accounts({
                    signer: partyA.publicKey,
                    escrow,
                })
                .signers([partyA])
                .rpc();

            accepted = true;
        } catch {
            accepted = false;
        }

        const escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        console.log(
            `Overflow proposal accepted: ${accepted}`
        );

        console.log(
            `Escrow status: ${escrowData.status}`
        );

        /*
         * Safe behavior is rejection.
         */
        expect(accepted).to.equal(false);

        expect(
            escrowData.status
        ).to.equal(1);

        console.log(
            "E19 FINALIZATION OVERFLOW BLOCKED"
        );
    });
});
