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
 * E18 - Completed Escrow Cleanup
 *
 * Purpose:
 * Verify what accounts remain after a completed escrow is closed.
 *
 * Scenario:
 * - Both parties fully fund the escrow.
 * - Party A proposes a valid settlement.
 * - Party B accepts.
 * - Creator calls close_completed_escrow.
 *
 * Expected:
 * - Escrow account closes.
 * - Vault balance becomes zero.
 * - Check whether the vault account itself still exists.
 */

describe("E18 - completed escrow cleanup", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("checks escrow and vault state after completed close", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1018);

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
                "E18 completed cleanup"
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
                oneSol,
                oneSol,
                new anchor.BN(0),
                "E18 settlement"
            )
            .accounts({
                signer: partyA.publicKey,
                escrow,
            })
            .signers([partyA])
            .rpc();

        await program.methods
            .acceptFinalization()
            .accounts({
                signer: partyB.publicKey,
                escrow,
                vault,
                partyA: partyA.publicKey,
                partyB: partyB.publicKey,
            })
            .signers([partyB])
            .rpc();

        expect(
            (await program.account.escrow.fetch(escrow)).status
        ).to.equal(3);

        const vaultBeforeClose =
            await getBalance(provider, vault);

        expect(vaultBeforeClose).to.be.greaterThan(0);

        await program.methods
            .closeCompletedEscrow()
            .accounts({
                creator: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        const escrowExists =
            await accountExists(
                provider,
                escrow
            );

        const vaultExists =
            await accountExists(
                provider,
                vault
            );

        const vaultAfterClose =
            await getBalance(
                provider,
                vault
            );

        expect(escrowExists).to.equal(false);

        expect(vaultAfterClose).to.equal(0);

        console.log(
            "E18 COMPLETED ESCROW CLEANUP CHECKED"
        );

        console.log(
            `Vault exists after close: ${vaultExists}`
        );

        console.log(
            `Vault balance after close: ${vaultAfterClose}`
        );
    });
});
