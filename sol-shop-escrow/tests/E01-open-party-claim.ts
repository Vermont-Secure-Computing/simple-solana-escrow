import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
} from "./escrow-test-helpers";

/*
 * E01 - Open Party Claim
 *
 * Purpose:
 * Verify the intended open-escrow behavior before testing attacks against it.
 *
 * Scenario:
 * - Creator opens an escrow as Party A.
 * - Party B is left open (Pubkey.default).
 * - A separate wallet deposits the required Party B amount.
 *
 * Expected:
 * - The depositor becomes Party B.
 * - deposited_b records the full required deposit.
 *
 * This is expected product behavior, not a vulnerability.
 * E01-A tests whether a malicious claimant can abuse this behavior.
 */

describe("E01 - open party claim", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("first valid depositor claims the open party slot", async () => {
        const creator = await createFundedWallet(provider);
        const joiner = await createFundedWallet(provider);

        const escrowId = new anchor.BN(1001);
        const [escrow] = findEscrowPda(
            creator.publicKey,
            escrowId
        );
        const [vault] = findVaultPda(escrow);

        const depositA = new anchor.BN(1_000_000_000);
        const depositB = new anchor.BN(1_000_000_000);

        await program.methods
            .createEscrow(
                escrowId,
                0,
                creator.publicKey,
                PublicKey.default,
                new anchor.BN(1_000_000_000),
                depositA,
                depositB,
                "E01 open escrow"
            )
            .accounts({
                creator: creator.publicKey,
                escrow,
                vault,
            })
            .signers([creator])
            .rpc();

        let data = await program.account.escrow.fetch(
            escrow
        );

        expect(data.partyB.toBase58()).to.equal(
            PublicKey.default.toBase58()
        );

        await program.methods
            .deposit(depositB)
            .accounts({
                depositor: joiner.publicKey,
                escrow,
                vault,
            })
            .signers([joiner])
            .rpc();

        data = await program.account.escrow.fetch(
            escrow
        );

        expect(data.partyB.toBase58()).to.equal(
            joiner.publicKey.toBase58()
        );

        expect(data.depositedB.toString()).to.equal(
            depositB.toString()
        );

        console.log(
            "E01 OPEN PARTY CLAIM VERIFIED"
        );
    });
});