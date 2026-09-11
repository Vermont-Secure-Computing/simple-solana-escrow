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
 * E03 - Partial Escrow Cancellation
 *
 * Original behavior:
 * - A funded party could withdraw before the counterparty deposited.
 * - The deposited SOL was returned.
 * - The Escrow account was closed.
 * - The vault remained with its rent balance.
 *
 * Proposed change:
 * - Keep the existing cancellation behavior.
 * - Drain the remaining vault lamports to the creator so the vault
 *   is removed after cancellation.
 *
 * Purpose:
 * - Preserve intended pre-funding cancellation.
 * - Prevent an orphaned vault after the Escrow closes.
 *
 * Expected after P01:
 * - The funded party recovers its deposit.
 * - The Escrow account is closed.
 * - The vault account is removed.
 *
 * P01:
 * - Added vault cleanup inside withdraw_before_complete.
 */

describe("E03 - partial escrow cancellation", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("refunds the funded party and closes the escrow", async () => {
        const creator = await createFundedWallet(provider);
        const partyB = await createFundedWallet(provider);

        const escrowId = new anchor.BN(1003);
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
                "E03 withdrawal lifecycle"
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

        const data = await program.account.escrow.fetch(escrow);

        expect(data.status).to.equal(0);
        expect(data.depositedA.toString()).to.equal(oneSol.toString());
        expect(data.depositedB.toString()).to.equal("0");
        expect(await accountExists(provider, escrow)).to.equal(true);

        const creatorBefore = await getBalance(provider, creator.publicKey);
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

        const creatorAfter = await getBalance(provider, creator.publicKey);
        const vaultAfter = await getBalance(provider, vault);
        const escrowExists = await accountExists(provider, escrow);
        const vaultExists = await accountExists(provider, vault);

        // Creator receives the refund plus Escrow/vault rent.
        expect(creatorAfter).to.be.greaterThan(creatorBefore);
        expect(escrowExists).to.equal(false);
        expect(vaultExists).to.equal(false);
        expect(vaultAfter).to.equal(0);

        console.log("E03 PARTIAL ESCROW CANCELLATION VERIFIED");
    });
});