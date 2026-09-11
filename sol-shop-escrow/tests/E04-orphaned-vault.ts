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
 * E04 - Early Cancellation Vault Cleanup
 *
 * Original behavior:
 * - Party A deposited 1 SOL.
 * - Party A cancelled through withdraw_before_complete.
 * - The Escrow account closed.
 * - The 1 SOL deposit was refunded.
 * - The vault remained initialized with its rent balance.
 *
 * Original finding:
 * - F01: orphaned vault after early cancellation.
 * - E04 reproduced a remaining vault balance of 890,880 lamports
 *   in the local test environment.
 *
 * Proposed change:
 * - After refunding the recorded deposit, drain all remaining
 *   vault lamports to the escrow creator.
 *
 * Purpose:
 * - Remove the orphaned vault.
 * - Return unused vault rent.
 * - Fully clean up the escrow after early cancellation.
 *
 * Expected after P01:
 * - The Escrow account is closed.
 * - The vault account no longer exists.
 * - The vault balance is zero.
 *
 * P01:
 * - Added vault cleanup inside withdraw_before_complete.
 */

describe("E04 - early cancellation vault cleanup", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("removes the vault after cancellation", async () => {
        const creator = await createFundedWallet(provider);
        const partyB = await createFundedWallet(provider);

        const escrowId = new anchor.BN(1004);
        const oneSol = new anchor.BN(1_000_000_000);

        const [escrow] = findEscrowPda(creator.publicKey, escrowId);
        const [vault] = findVaultPda(escrow);

        await program.methods
            .createEscrow(
                escrowId,
                0,
                creator.publicKey,
                partyB.publicKey,
                oneSol,
                oneSol,
                oneSol,
                "E04 vault lifecycle"
            )
            .accounts({
                creator: creator.publicKey,
                escrow,
                vault,
            })
            .signers([creator])
            .rpc();

        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: creator.publicKey,
                escrow,
                vault,
            })
            .signers([creator])
            .rpc();

        const vaultBefore = await getBalance(provider, vault);
        expect(vaultBefore).to.be.greaterThan(1_000_000_000);

        await program.methods
            .withdrawBeforeComplete()
            .accounts({
                withdrawer: creator.publicKey,
                escrow,
                creator: creator.publicKey,
                vault,
            })
            .signers([creator])
            .rpc();

        const escrowExists = await accountExists(provider, escrow);
        const vaultExists = await accountExists(provider, vault);
        const vaultAfter = await getBalance(provider, vault);

        expect(escrowExists).to.equal(false);
        expect(vaultExists).to.equal(false);
        expect(vaultAfter).to.equal(0);

        console.log("E04 EARLY CANCELLATION VAULT CLEANUP VERIFIED");
        console.log(`Vault balance before cancellation: ${vaultBefore}`);
        console.log(`Vault balance after cancellation: ${vaultAfter}`);
    });
});