import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    expectAnchorError,
    findEscrowPda,
    findVaultPda,
} from "./escrow-test-helpers";

/*
 * E12 - Invalid Finalization Amounts
 *
 * Purpose:
 * Verify that finalization amounts must exactly match
 * the total deposited amount and respect the donation limit.
 *
 * Scenario:
 * - Both parties deposit 1 SOL each.
 * - Try a proposal totaling less than 2 SOL.
 * - Try a proposal totaling more than 2 SOL.
 * - Try a donation greater than reference_amount.
 *
 * Expected:
 * - Invalid totals fail with InvalidFinalization.
 * - Excess donation fails with InvalidDonation.
 * - Escrow remains fully funded with no active proposal.
 */

describe("E12 - invalid finalization amounts", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("rejects invalid payout totals and excessive donation", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1012);
        const oneSol =
            new anchor.BN(1_000_000_000);

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
                "E12 finalization amounts"
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

        // Total is only 1.5 SOL.
        await expectAnchorError(
            () =>
                program.methods
                    .suggestFinalization(
                        oneSol,
                        new anchor.BN(500_000_000),
                        new anchor.BN(0),
                        "too little"
                    )
                    .accounts({
                        signer: partyA.publicKey,
                        escrow,
                    })
                    .signers([partyA])
                    .rpc(),
            "InvalidFinalization"
        );

        // Total is 2.5 SOL.
        await expectAnchorError(
            () =>
                program.methods
                    .suggestFinalization(
                        oneSol,
                        new anchor.BN(1_500_000_000),
                        new anchor.BN(0),
                        "too much"
                    )
                    .accounts({
                        signer: partyA.publicKey,
                        escrow,
                    })
                    .signers([partyA])
                    .rpc(),
            "InvalidFinalization"
        );

        /*
         * Total still equals 2 SOL, but donation exceeds
         * reference_amount of 1 SOL.
         */
        await expectAnchorError(
            () =>
                program.methods
                    .suggestFinalization(
                        new anchor.BN(500_000_000),
                        new anchor.BN(400_000_000),
                        new anchor.BN(1_100_000_000),
                        "donation too high"
                    )
                    .accounts({
                        signer: partyA.publicKey,
                        escrow,
                    })
                    .signers([partyA])
                    .rpc(),
            "InvalidDonation"
        );

        const escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowData.status).to.equal(1);

        expect(
            escrowData.depositedA.toString()
        ).to.equal(oneSol.toString());

        expect(
            escrowData.depositedB.toString()
        ).to.equal(oneSol.toString());

        console.log(
            "E12 FINALIZATION AMOUNT VALIDATION VERIFIED"
        );
    });
});
