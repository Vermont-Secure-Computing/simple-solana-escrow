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
 * E05 - Recreate Cancelled Escrow
 *
 * Original behavior:
 * - Creator created escrow ID 1005.
 * - Party A deposited and cancelled before Party B deposited.
 * - The Escrow account closed.
 * - The vault remained initialized with its rent balance.
 * - Recreating the same creator + escrow_id failed because the
 *   existing vault PDA blocked initialization.
 *
 * Original finding:
 * - F02: cancelled escrow IDs could not be reused.
 * - This was caused by the orphaned vault identified in F01.
 *
 * Proposed change:
 * - Fully remove the vault during early cancellation.
 * - Allow the same creator + escrow_id to be reused once the
 *   previous escrow has been completely cleaned up.
 *
 * Purpose:
 * - Keep the generic escrow contract simple.
 * - Avoid using an orphaned vault as an accidental uniqueness marker.
 * - Allow applications to manage their own unique escrow IDs.
 *
 * Expected after P01:
 * - Escrow account is removed after cancellation.
 * - Vault account is removed and balance is zero.
 * - The same creator + escrow_id can be created again.
 *
 * P01:
 * - Added vault cleanup inside withdraw_before_complete.
 */

describe("E05 - recreate cancelled escrow", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("allows reuse of a cancelled escrow ID after full cleanup", async () => {
        const creator = await createFundedWallet(provider);
        const partyB = await createFundedWallet(provider);

        const escrowId = new anchor.BN(1005);
        const oneSol = new anchor.BN(1_000_000_000);

        const [escrow] = findEscrowPda(creator.publicKey, escrowId);
        const [vault] = findVaultPda(escrow);

        const createEscrow = () =>
            program.methods
                .createEscrow(
                    escrowId,
                    0,
                    creator.publicKey,
                    partyB.publicKey,
                    oneSol,
                    oneSol,
                    oneSol,
                    "E05 recreation test"
                )
                .accounts({
                    creator: creator.publicKey,
                    escrow,
                    vault,
                })
                .signers([creator])
                .rpc();

        await createEscrow();

        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: creator.publicKey,
                escrow,
                vault,
            })
            .signers([creator])
            .rpc();

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

        expect(await accountExists(provider, escrow)).to.equal(false);
        expect(await accountExists(provider, vault)).to.equal(false);
        expect(await getBalance(provider, vault)).to.equal(0);

        await createEscrow();

        expect(await accountExists(provider, escrow)).to.equal(true);
        expect(await accountExists(provider, vault)).to.equal(true);

        const recreated = await program.account.escrow.fetch(escrow);

        expect(recreated.status).to.equal(0);
        expect(recreated.depositedA.toString()).to.equal("0");
        expect(recreated.depositedB.toString()).to.equal("0");

        const recreatedVaultBalance = await getBalance(provider, vault);
        expect(recreatedVaultBalance).to.be.greaterThan(0);

        console.log("E05 CANCELLED ESCROW ID REUSE VERIFIED");
        console.log(`Recreated vault lamports: ${recreatedVaultBalance}`);
    });
});