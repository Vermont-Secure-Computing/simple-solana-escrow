import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    accountExists,
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E07 - Party B Partial Cancellation
 *
 * Purpose:
 * Verify Party B can recover its deposit and cancel the escrow
 * while Party A has not deposited yet.
 *
 * Scenario:
 * - Party B deposits first.
 * - Party A has not deposited.
 * - Party B calls withdraw_before_complete.
 *
 * Expected:
 * - Party B recovers its deposited SOL.
 * - The Escrow account closes.
 * - Behavior matches Party A's cancellation path.
 */

describe("E07 - party B partial cancellation", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("allows Party B to cancel before Party A deposits", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1007);
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
                "E07 Party B cancellation"
            )
            .accounts({
                creator: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        const partyBBefore =
            await getBalance(
                provider,
                partyB.publicKey
            );

        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: partyB.publicKey,
                escrow,
                vault,
            })
            .signers([partyB])
            .rpc();

        const escrowAfterDeposit =
            await program.account.escrow.fetch(
                escrow
            );

        expect(
            escrowAfterDeposit.depositedA.toString()
        ).to.equal("0");

        expect(
            escrowAfterDeposit.depositedB.toString()
        ).to.equal(oneSol.toString());

        expect(
            escrowAfterDeposit.status
        ).to.equal(0);

        await program.methods
            .withdrawBeforeComplete()
            .accounts({
                withdrawer: partyB.publicKey,
                escrow,
                creator: partyA.publicKey,
                vault,
            })
            .signers([partyB])
            .rpc();

        const escrowExists =
            await accountExists(
                provider,
                escrow
            );

        expect(escrowExists).to.equal(false);

        const partyBAfter =
            await getBalance(
                provider,
                partyB.publicKey
            );

        /*
         * Party B pays transaction fees, so its final balance
         * will be slightly lower than its original balance.
         * The important point is that the 1 SOL deposit was returned.
         */
        expect(
            partyBAfter
        ).to.be.greaterThan(
            partyBBefore - 20_000_000
        );

        console.log(
            "E07 PARTY B PARTIAL CANCELLATION VERIFIED"
        );
    });
});
