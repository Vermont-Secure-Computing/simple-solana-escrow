import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E22 - Party Account Substitution
 *
 * Purpose:
 * Verify that settlement payouts cannot be redirected by
 * replacing Party A or Party B with attacker-controlled accounts.
 *
 * Scenario:
 * - Both parties fully fund the escrow.
 * - Party A proposes a valid settlement.
 * - Party B accepts while substituting an attacker account
 *   for one of the payout recipients.
 *
 * Expected:
 * - Transaction fails.
 * - Attacker receives no SOL.
 * - Vault balance stays unchanged.
 * - Escrow remains FINALIZATION_SUGGESTED.
 */

describe("E22 - party account substitution", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("blocks replacing Party B with an attacker account", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const attacker =
            await createFundedWallet(provider);

        const escrowId =
            new anchor.BN(1022);

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
                "E22 party substitution"
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
                "E22 settlement"
            )
            .accounts({
                signer: partyA.publicKey,
                escrow,
            })
            .signers([partyA])
            .rpc();

        const attackerBefore =
            await getBalance(
                provider,
                attacker.publicKey
            );

        const vaultBefore =
            await getBalance(
                provider,
                vault
            );

        let failed = false;

        try {
            await program.methods
                .acceptFinalization()
                .accounts({
                    signer: partyB.publicKey,
                    escrow,
                    vault,
                    partyA: partyA.publicKey,

                    // Attacker tries to replace Party B.
                    partyB: attacker.publicKey,
                })
                .signers([partyB])
                .rpc();
        } catch {
            failed = true;
        }

        expect(failed).to.equal(true);

        const attackerAfter =
            await getBalance(
                provider,
                attacker.publicKey
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

        expect(attackerAfter).to.equal(
            attackerBefore
        );

        expect(vaultAfter).to.equal(
            vaultBefore
        );

        expect(
            escrowData.status
        ).to.equal(2);

        console.log(
            "E22 PARTY ACCOUNT SUBSTITUTION BLOCKED"
        );
    });
});
